import { NextResponse } from 'next/server';
import { choice, HttpError, originCheck, rateLimit, requireUser, text } from '@/lib/rvu/auth';
import { activity, audit, id, matchReport, notify, now, one, report, run, transaction } from '@/lib/rvu/db';
import { completeHandover, ensureHandover } from '@/lib/rvu/recovery';
import { categories, type Claim, type Handover, type ProtectedItem, type Report } from '@/lib/rvu/types';
import { extractAndSaveOwnerFingerprint } from '@/lib/rvu/fingerprints';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  try {
    originCheck(req);
    const user = await requireUser();
    const raw = await req.text();
    if (raw.length > 12000) throw new HttpError(413, 'Request too large.');
    const p = JSON.parse(raw);

    if (p.action === 'register') {
      await rateLimit(`protect:${user.id}`, 30, 3600);
      const itemId = id('item');
      const rawImageIds: string[] = Array.isArray(p.imageIds) ? p.imageIds : (typeof p.imageId === 'string' && p.imageId ? [p.imageId] : []);
      const imageIds = rawImageIds.filter(idStr => typeof idStr === 'string' && idStr.trim().length > 0).slice(0, 3);
      for (const imgId of imageIds) {
        if (!(await one('SELECT id FROM uploads WHERE id=? AND "userId"=?', imgId, user.id))) {
          throw new HttpError(400, 'Upload your own photo first.');
        }
      }
      const primaryImageId = imageIds[0] || null;
      const itemName = text(p.name, 'Item name', 3, 100);
      const itemCategory = choice(p.category, categories, 'category');
      const itemBrand = text(p.brand || '', 'Brand', 0, 80);
      const itemColor = text(p.color || '', 'Colour', 0, 60);
      const itemDesc = text(p.description, 'Description', 10, 2000);
      const itemPrivateDetail = text(p.privateDetail, 'Private identifying detail', 8, 1000);

      await transaction(async () => {
        await run(
          'INSERT INTO protected_items (id,"userId",name,category,brand,color,description,"privateDetail","imageId","createdAt") VALUES (?,?,?,?,?,?,?,?,?,?)',
          itemId, user.id, itemName, itemCategory, itemBrand, itemColor, itemDesc, itemPrivateDetail, primaryImageId, now()
        );
        await activity('registered', 'A belonging was registered');
      });

      // Phase 2: Asynchronously extract and persist owner item fingerprint without breaking registration
      try {
        await extractAndSaveOwnerFingerprint({
          itemId,
          name: itemName,
          category: itemCategory,
          brand: itemBrand,
          color: itemColor,
          description: itemDesc,
          privateDetail: itemPrivateDetail,
          imageIds,
          actorUserId: user.id,
        });
        // Phase 5: Asynchronously generate and persist vector embedding
        const { generateOwnerItemEmbedding } = await import('@/lib/rvu/embeddings');
        await generateOwnerItemEmbedding(itemId);
      } catch (fpErr) {
        console.warn('Owner fingerprint and embedding background warning:', fpErr);
      }

      return json({ ok: true, id: itemId });
    }

    if (p.action === 'mark_lost') {
      const itemId = text(p.itemId, 'Item reference');
      const location = text(p.location, 'Last known location', 2, 150);
      const date = text(p.date, 'Date', 10, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) {
        throw new HttpError(400, 'Choose a valid date.');
      }

      const result = await transaction(async () => {
        const item = await one<ProtectedItem>('SELECT * FROM protected_items WHERE id=? AND "userId"=?', itemId, user.id);
        if (!item) throw new HttpError(404, 'Item not found.');
        if (item.status === 'lost') throw new HttpError(409, 'This item already has an open lost report.');
        const r: Report = {
          id: `RVU-${id('').replaceAll('-', '').slice(0, 12).toUpperCase()}`,
          userId: user.id,
          kind: 'lost',
          title: item.name,
          category: item.category,
          color: item.color,
          brand: item.brand,
          description: item.description,
          privateDetail: item.privateDetail,
          location,
          date,
          department: user.department,
          status: 'open',
          imageId: item.imageId,
          createdAt: now(),
          custodyLocation: '',
        };
        await run(
          'INSERT INTO reports (id,"userId",kind,title,category,color,brand,description,"privateDetail",location,date,department,status,"imageId","createdAt","custodyLocation") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          r.id, r.userId, r.kind, r.title, r.category, r.color, r.brand, r.description, r.privateDetail!, location, date, r.department, 'open', r.imageId, r.createdAt, ''
        );
        await run('UPDATE protected_items SET status=\'lost\',"lostReportId"=? WHERE id=?', r.id, itemId);
        await matchReport(r);
        await audit(user.id, r.id, 'Lost report submitted');
        return r.id;
      });

      return json({ ok: true, id: result });
    }

    if (p.action === 'confirm_owner' || p.action === 'confirm_finder' || p.action === 'reward') {
      const reportId = text(p.reportId, 'Report reference');
      const h = await one<Handover>('SELECT * FROM handovers WHERE "reportId"=?', reportId);
      if (!h) throw new HttpError(404, 'Handover not found.');

      if (p.action === 'reward') {
        if (h.ownerId !== user.id || !h.returnedAt) throw new HttpError(403, 'Thank-you options are available to the owner after return.');
        const status = choice(p.status, ['skipped', 'sent_unverified'] as const, 'thank-you status');
        if (status === 'sent_unverified' && !h.finderUpi) throw new HttpError(400, 'The finder has not provided a UPI address.');
        await run('UPDATE handovers SET "rewardStatus"=? WHERE "reportId"=?', status, reportId);
        return json({ ok: true });
      }

      const isOwner = p.action === 'confirm_owner';
      if ((isOwner ? h.ownerId : h.finderId) !== user.id) throw new HttpError(403, 'Only the relevant participant can confirm this handover.');

      await transaction(async () => {
        if (h.returnedAt) throw new HttpError(409, 'This return is already complete.');
        await run(`UPDATE handovers SET ${isOwner ? '"ownerConfirmed"' : '"finderConfirmed"'}=1 WHERE "reportId"=?`, reportId);
        await completeHandover(reportId, user.id);
      });

      return json({ ok: true });
    }

    if (p.action === 'accept_found_id') {
      const reportId = text(p.reportId, 'Report reference');
      await transaction(async () => {
        const target = await one('SELECT "reportId" FROM found_ids WHERE "reportId"=? AND "targetUserId"=?', reportId, user.id);
        const found = await report(reportId);
        if (!target || !found) throw new HttpError(404, 'Recovery not found.');
        if (found.userId === user.id) throw new HttpError(400, 'You reported this card yourself.');
        if (!['open', 'in_custody'].includes(found.status)) throw new HttpError(409, 'This recovery is already being processed.');
        const existing = await one<Claim>('SELECT * FROM claims WHERE "reportId"=? AND "userId"=?', reportId, user.id);
        if (existing) throw new HttpError(409, 'Your claim already exists.');
        await run(
          'INSERT INTO claims (id,"reportId","userId",proof,status,"staffNote","createdAt") VALUES (?,?,?,?,\'approved\',?,?)',
          id('claim'), reportId, user.id, 'Verified email account with a previously linked college identity.', 'Linked college identity confirmed. Check physical card at handover.', now()
        );
        await run("UPDATE reports SET status='approved' WHERE id=?", reportId);
        await ensureHandover(reportId, user.id, found.custodyLocation || 'RVU campus reception — confirm availability before travelling');
        await audit(user.id, reportId, 'Claim approved through verified college identity');
      });

      return json({ ok: true });
    }

    if (p.action === 'blind_verify') {
      const reportId = text(p.reportId, 'Found report');
      const lostId = text(p.lostId, 'Lost report');
      const answer = text(p.answer, 'Identifying detail', 8, 1000);
      await rateLimit(`blind:${user.id}:${reportId}`, 3, 3600);

      const item = await one<ProtectedItem>('SELECT * FROM protected_items WHERE "lostReportId"=? AND "userId"=?', lostId, user.id);
      const found = await report(reportId);
      if (!item || !found || found.kind !== 'found' || found.userId === user.id || item.createdAt >= found.createdAt || !['open', 'in_custody'].includes(found.status)) {
        throw new HttpError(409, 'This case needs a private staff-reviewed claim.');
      }

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const words = item.privateDetail.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
      const observed = (found.privateDetail || '').toLowerCase();
      const corroborated = words.length >= 2 && words.filter(w => observed.includes(w)).length / words.length >= 0.7;
      const hasMatch = Boolean(await one('SELECT id FROM matches WHERE "lostId"=? AND "foundId"=? AND score>=70', lostId, reportId));
      const accepted = normalize(answer) === normalize(item.privateDetail) && corroborated && hasMatch;

      await run('INSERT INTO blind_attempts (id,"userId","reportId",accepted,"createdAt") VALUES (?,?,?,?,?)', id('attempt'), user.id, reportId, accepted ? 1 : 0, now());
      if (!accepted) throw new HttpError(422, 'We could not safely verify this match. Submit a private claim for staff review.');

      await transaction(async () => {
        if (await one('SELECT id FROM claims WHERE "reportId"=? AND "userId"=?', reportId, user.id)) {
          throw new HttpError(409, 'A claim is already registered.');
        }
        await run(
          'INSERT INTO claims (id,"reportId","userId","lostReportId",proof,status,"staffNote","createdAt") VALUES (?,?,?,?,?,\'approved\',?,?)',
          id('claim'), reportId, user.id, lostId, 'Private detail matched a pre-loss registration and finder observation.', 'Blind ownership check completed; both parties must confirm physical return.', now()
        );
        await run("UPDATE reports SET status='approved' WHERE id=?", reportId);
        await ensureHandover(reportId, user.id, found.custodyLocation || 'RVU campus reception — confirm availability before travelling');
        await audit(user.id, reportId, 'Claim approved by blind ownership check');
        await notify(user.id, 'Ownership verified. Arrange a safe handover.', '/status');
      });

      return json({ ok: true });
    }

    throw new HttpError(400, 'Unknown item action.');
  } catch (e) {
    return json({ error: e instanceof HttpError ? e.message : 'Unable to update this item. Please try again.' }, e instanceof HttpError ? e.status : 500);
  }
}
