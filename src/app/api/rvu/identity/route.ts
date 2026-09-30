import { NextResponse } from 'next/server';
import { hash, HttpError, originCheck, rateLimit, requireUser, text, choice } from '@/lib/rvu/auth';
import { all, id, notify, now, one, run, transaction } from '@/lib/rvu/db';
import { decodeUsn } from '@/lib/rvu/identity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

const fail = (e: unknown) =>
  json(
    { error: e instanceof HttpError ? e.message : 'Unable to update campus identity. Please try again.' },
    e instanceof HttpError ? e.status : 500
  );

export async function GET() {
  try {
    const user = await requireUser();
    const identity = (await one<{ status: string; usn: string; linkedAt: string; requestedAt: string; note: string }>(
      'SELECT status, usn, "linkedAt", "requestedAt", note FROM identity_links WHERE "userId"=?',
      user.id
    )) || { status: 'UNLINKED' };

    const requests = user.role === 'staff'
      ? await all(
          'SELECT i.*, u.name, u.email FROM identity_links i JOIN users u ON u.id=i."userId" WHERE i.status=\'REQUIRES_REVIEW\' ORDER BY i."requestedAt"'
        )
      : [];

    return json({ identity, requests });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    originCheck(req);
    const user = await requireUser();
    const p = await req.json();

    if (p.action === 'link') {
      if (user.role !== 'student') throw new HttpError(400, 'College ID linking is for student accounts.');
      await rateLimit(`id-link:${user.id}`, 8, 3600);
      const usn = decodeUsn(p.payload);

      const result = await transaction(async () => {
        const current = await one<{ usn: string; status: string }>(
          'SELECT usn, status FROM identity_links WHERE "userId"=?',
          user.id
        );
        if (current?.status === 'LINKED') {
          if (current.usn === usn) return { status: 'LINKED' };
          throw new HttpError(409, 'Your ID is already linked. Ask campus staff to review a correction.');
        }

        const eligible = await one<{ email: string; active: number }>(
          'SELECT email, active FROM campus_directory WHERE usn=?',
          usn
        );
        const conflict = await one(
          'SELECT "userId" FROM identity_links WHERE usn=? AND status=\'LINKED\' AND "userId"<>?',
          usn,
          user.id
        );
        const linked = eligible?.active === 1 && eligible.email.toLowerCase() === user.email.toLowerCase() && !conflict;
        const status = linked ? 'LINKED' : 'REQUIRES_REVIEW';

        await run(
          `INSERT INTO identity_links ("userId", usn, status, "linkedAt", "requestedAt", note)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT("userId") DO UPDATE SET
             usn=excluded.usn,
             status=excluded.status,
             "linkedAt"=excluded."linkedAt",
             "requestedAt"=excluded."requestedAt",
             note=excluded.note`,
          user.id,
          usn,
          status,
          linked ? now() : null,
          now(),
          linked ? 'Matched against the eligible campus record.' : 'Staff will verify your college ID before linking.'
        );

        await run('INSERT INTO identity_audit VALUES (?,?,?,?,?)', id('identity'), user.id, linked ? 'directory_link' : 'link_requested', hash(usn), now());

        if (!linked) {
          const staffList = await all<{ id: string }>("SELECT id FROM users WHERE role='staff'");
          for (const staff of staffList) {
            await notify(staff.id, 'A college ID link needs review', '/profile');
          }
        }

        return { status };
      });

      return json({
        ok: true,
        ...result,
        message: result.status === 'LINKED'
          ? 'College ID linked.'
          : 'ID submitted for staff verification. Bring your college ID to the campus desk.',
      });
    }

    if (p.action === 'review') {
      await requireUser(true);
      const userId = text(p.userId, 'Student reference');
      const decision = choice(p.decision, ['approve', 'reject'] as const, 'decision');
      const note = text(p.note, 'Review note', 5, 500);

      await transaction(async () => {
        const record = await one<{ usn: string; status: string }>(
          'SELECT usn, status FROM identity_links WHERE "userId"=?',
          userId
        );
        if (!record || record.status !== 'REQUIRES_REVIEW') {
          throw new HttpError(409, 'This request is no longer awaiting review.');
        }
        if (userId === user.id) {
          throw new HttpError(403, 'Another staff member must review your identity.');
        }

        if (decision === 'approve') {
          const conflict = await one(
            'SELECT "userId" FROM identity_links WHERE usn=? AND status=\'LINKED\' AND "userId"<>?',
            record.usn,
            userId
          );
          if (conflict) {
            throw new HttpError(409, 'This institutional identity is already linked. Investigate before approving.');
          }
        }

        await run(
          'UPDATE identity_links SET status=?, "linkedAt"=?, "reviewedBy"=?, note=? WHERE "userId"=?',
          decision === 'approve' ? 'LINKED' : 'UNLINKED',
          decision === 'approve' ? now() : null,
          user.id,
          note,
          userId
        );

        await run('INSERT INTO identity_audit VALUES (?,?,?,?,?)', id('identity'), user.id, `staff_${decision}`, hash(record.usn), now());
        await notify(userId, decision === 'approve' ? 'College ID linked' : 'College ID link needs correction', '/profile');
      });

      return json({ ok: true });
    }

    if (p.action === 'check_handover') {
      await requireUser(true);
      await rateLimit(`id-check:${user.id}`, 40, 3600);
      const usn = decodeUsn(p.payload);
      const reportId = text(p.reportId, 'Report reference');

      const expected = await one<{ userId: string }>(
        'SELECT "userId" FROM claims WHERE "reportId"=? AND status=\'approved\'',
        reportId
      );
      if (!expected) throw new HttpError(409, 'An approved claim is required before an ID check.');

      const match = await one(
        'SELECT "userId" FROM identity_links WHERE "userId"=? AND usn=? AND status=\'LINKED\'',
        expected.userId,
        usn
      );

      await run(
        'INSERT INTO identity_audit VALUES (?,?,?,?,?)',
        id('identity'),
        user.id,
        match ? 'handover_id_confirmed' : 'handover_id_mismatch',
        hash(usn),
        now()
      );

      return json({
        ok: true,
        matches: Boolean(match),
        message: match
          ? 'College ID matches the intended recipient.'
          : 'This ID does not match a linked identity for the intended recipient. Verify manually before handing over.',
      });
    }

    throw new HttpError(400, 'Unknown identity action.');
  } catch (e) {
    return fail(e);
  }
}
