import { all, audit, notify, now, one, report, run } from './db';
import { HttpError } from './auth';
import type { Claim, Handover } from './types';

export * from './recovery/index';

export function ensureHandover(reportId: string, ownerId: string, point: string) {
  const found = report(reportId);
  if (!found) throw new HttpError(404, 'Report not found.');
  run(
    'INSERT OR IGNORE INTO handovers (reportId,ownerId,finderId,point,proposedLocation,state) VALUES (?,?,?,?,?,?)',
    reportId,
    ownerId,
    found.userId,
    point,
    point,
    'RECOVERY_PENDING'
  );
}

export function completeHandover(reportId: string, actorId: string) {
  const h = one<Handover>('SELECT * FROM handovers WHERE reportId=?', reportId);
  if (!h || h.returnedAt || !h.ownerConfirmed || !h.finderConfirmed) return;
  const found = report(reportId)!;
  const c = one<Claim>("SELECT * FROM claims WHERE reportId=? AND status='approved'", reportId);
  
  run("UPDATE handovers SET returnedAt=?, state='RETURNED' WHERE reportId=?", now(), reportId);
  run("UPDATE reports SET status='returned' WHERE id=?", reportId);
  if (c) {
    run("UPDATE claims SET status='returned' WHERE id=?", c.id);
    if (c.lostReportId) {
      run("UPDATE reports SET status='returned' WHERE id=?", c.lostReportId);
      run("UPDATE protected_items SET status='returned' WHERE lostReportId=?", c.lostReportId);
    }
  }
  audit(actorId, reportId, 'Returned to verified owner after both sides confirmed');
  notify(h.ownerId, `${found.title} returned. Welcome back!`, '/status');
  const finder = one<{ role: string }>('SELECT role FROM users WHERE id=?', h.finderId);
  if (finder?.role !== 'guest') {
    notify(h.finderId, `${found.title} reunited with its owner. Thank you!`, '/status');
  }
}
