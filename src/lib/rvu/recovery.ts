import { all, audit, notify, now, one, report, run } from './db';
import { HttpError } from './auth';
import type { Claim, Handover } from './types';

export * from './recovery/index';

export async function ensureHandover(
  reportId: string,
  ownerId: string,
  point: string,
): Promise<void> {
  const found = await report(reportId);
  if (!found) throw new HttpError(404, 'Report not found.');
  // handovers.reportId is PRIMARY KEY → ON CONFLICT DO NOTHING
  await run(
    `INSERT INTO handovers ("reportId","ownerId","finderId",point,"proposedLocation",state)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT ("reportId") DO NOTHING`,
    reportId,
    ownerId,
    found.userId,
    point,
    point,
    'RECOVERY_PENDING',
  );
}

export async function completeHandover(
  reportId: string,
  actorId: string,
): Promise<void> {
  const h = await one<Handover>(
    'SELECT * FROM handovers WHERE "reportId"=?',
    reportId,
  );
  if (!h || h.returnedAt || !h.ownerConfirmed || !h.finderConfirmed) return;
  const found = (await report(reportId))!;
  const c = await one<Claim>(
    "SELECT * FROM claims WHERE \"reportId\"=? AND status='approved'",
    reportId,
  );

  await run(
    "UPDATE handovers SET \"returnedAt\"=?, state='RETURNED' WHERE \"reportId\"=?",
    now(),
    reportId,
  );
  await run("UPDATE reports SET status='returned' WHERE id=?", reportId);
  if (c) {
    await run("UPDATE claims SET status='returned' WHERE id=?", c.id);
    if (c.lostReportId) {
      await run(
        "UPDATE reports SET status='returned' WHERE id=?",
        c.lostReportId,
      );
      await run(
        "UPDATE protected_items SET status='returned' WHERE \"lostReportId\"=?",
        c.lostReportId,
      );
    }
  }
  await audit(actorId, reportId, 'Returned to verified owner after both sides confirmed');
  await notify(h.ownerId, `${found.title} returned. Welcome back!`, '/status');
  const finder = await one<{ role: string }>(
    'SELECT role FROM users WHERE id=?',
    h.finderId,
  );
  if (finder?.role !== 'guest') {
    await notify(
      h.finderId,
      `${found.title} reunited with its owner. Thank you!`,
      '/status',
    );
  }
}
