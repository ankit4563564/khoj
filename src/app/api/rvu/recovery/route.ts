import { NextResponse } from 'next/server';
import { HttpError, originCheck, sessionUser, text } from '@/lib/rvu/auth';
import {
  initiateRecovery,
  proposeHandover,
  acceptHandover,
  counterProposeHandover,
  startHandoverProgress,
  confirmOwnerReceipt,
  confirmFinderReturn,
  reportHandoverIssue,
  cancelHandover,
  adminResolveRecovery,
  getRecoveryStatusForClient,
  type RecoveryState,
} from '@/lib/rvu/recovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  try {
    originCheck(req);
    const user = await sessionUser();
    const raw = await req.text();
    if (raw.length > 8000) throw new HttpError(413, 'Request too large.');
    const p = JSON.parse(raw);

    const actionToken =
      typeof p.actionToken === 'string'
        ? p.actionToken
        : req.headers.get('x-finder-token') || undefined;

    if (p.action === 'initiate') {
      if (!user) throw new HttpError(401, 'Authentication required to initiate recovery.');
      const candidateMatchId = text(p.candidateMatchId, 'Candidate match ID', 5, 100);
      const recovery = await initiateRecovery(candidateMatchId, user.id);
      return json({ ok: true, recovery });
    }

    const reportId = text(p.reportId, 'Report reference', 3, 100);

    if (p.action === 'propose') {
      const location = text(p.location, 'Handover location', 3, 100);
      const date = text(p.date, 'Date', 10, 10);
      const timeWindow = text(p.timeWindow, 'Time window', 3, 50);
      const updated = await proposeHandover(
        reportId,
        { location, date, timeWindow },
        user?.id,
        actionToken
      );
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'accept') {
      const updated = await acceptHandover(reportId, user?.id, actionToken);
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'counter_propose') {
      const location = text(p.location, 'Handover location', 3, 100);
      const date = text(p.date, 'Date', 10, 10);
      const timeWindow = text(p.timeWindow, 'Time window', 3, 50);
      const updated = await counterProposeHandover(
        reportId,
        { location, date, timeWindow },
        user?.id,
        actionToken
      );
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'start_progress') {
      const updated = await startHandoverProgress(reportId, user?.id, actionToken);
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'confirm_owner') {
      if (!user) throw new HttpError(401, 'Authentication required for owner confirmation.');
      const updated = await confirmOwnerReceipt(reportId, user.id);
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'confirm_finder') {
      const updated = await confirmFinderReturn(reportId, user?.id, actionToken);
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'issue') {
      const reason = text(p.reason, 'Issue reason', 5, 500);
      const updated = await reportHandoverIssue(reportId, reason, user?.id, actionToken);
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'cancel') {
      const reason = text(p.reason, 'Cancellation reason', 5, 500);
      const updated = await cancelHandover(reportId, reason, user?.id, actionToken);
      return json({ ok: true, recovery: updated });
    }

    if (p.action === 'admin_resolve') {
      if (!user) throw new HttpError(401, 'Staff authentication required.');
      const targetState = p.targetState as RecoveryState;
      const note = typeof p.note === 'string' ? p.note.slice(0, 500) : '';
      const updated = await adminResolveRecovery(reportId, targetState, user.id, note);
      return json({ ok: true, recovery: updated });
    }

    throw new HttpError(400, 'Unknown recovery action.');
  } catch (e) {
    return json(
      { error: e instanceof HttpError ? e.message : 'Unable to process recovery request.' },
      e instanceof HttpError ? e.status : 500
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await sessionUser();
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId');
    const actionToken =
      searchParams.get('token') || req.headers.get('x-finder-token') || undefined;

    if (!reportId) {
      throw new HttpError(400, 'reportId query parameter is required.');
    }

    const view = await getRecoveryStatusForClient(reportId, user?.id, actionToken);
    return json({ ok: true, recovery: view });
  } catch (e) {
    return json(
      { error: e instanceof HttpError ? e.message : 'Unable to retrieve recovery status.' },
      e instanceof HttpError ? e.status : 500
    );
  }
}
