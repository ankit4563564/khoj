import { NextResponse } from 'next/server';
import { HttpError, originCheck, sessionUser, text } from '@/lib/rvu/auth';
import {
  chooseRewardDecision,
  provideFinderUpi,
  markPaymentInitiated,
  reportOwnerPayment,
  confirmFinderPayment,
  reportRewardDispute,
  cancelReward,
  adminResolveReward,
  getClientRewardView,
  getOrCreateReward,
} from '@/lib/rvu/reward';

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

    const reportId = text(p.reportId, 'Report reference', 3, 100);

    if (p.action === 'get_or_create') {
      const reward = await getOrCreateReward(reportId, user?.id, actionToken);
      return json({ ok: true, reward });
    }

    if (p.action === 'choose') {
      if (!user) throw new HttpError(401, 'Authentication required.');
      const decision = p.decision === 'SKIP' ? 'SKIP' : 'THANK';
      const clientAmount = typeof p.amount === 'number' ? p.amount : undefined;
      const updated = await chooseRewardDecision(reportId, decision, user.id, clientAmount);
      return json({ ok: true, reward: updated });
    }

    if (p.action === 'provide_upi') {
      const upiId = text(p.upiId, 'UPI ID', 5, 100);
      const updated = await provideFinderUpi(reportId, upiId, user?.id, actionToken);
      return json({ ok: true, reward: updated });
    }

    if (p.action === 'initiate_payment') {
      if (!user) throw new HttpError(401, 'Authentication required.');
      const updated = await markPaymentInitiated(reportId, user.id);
      return json({ ok: true, reward: updated });
    }

    if (p.action === 'report_payment') {
      if (!user) throw new HttpError(401, 'Authentication required.');
      const updated = await reportOwnerPayment(reportId, user.id);
      return json({ ok: true, reward: updated });
    }

    if (p.action === 'confirm_payment') {
      const updated = await confirmFinderPayment(reportId, user?.id, actionToken);
      return json({ ok: true, reward: updated });
    }

    if (p.action === 'dispute') {
      const reason = text(p.reason, 'Dispute reason', 5, 500);
      const updated = await reportRewardDispute(reportId, reason, user?.id, actionToken);
      return json({ ok: true, reward: updated });
    }

    if (p.action === 'cancel') {
      const reason = text(p.reason, 'Cancellation reason', 5, 500);
      const updated = await cancelReward(reportId, reason, user?.id, actionToken);
      return json({ ok: true, reward: updated });
    }

    if (p.action === 'admin_resolve') {
      if (!user) throw new HttpError(401, 'Staff authentication required.');
      const resolution = p.resolution === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED';
      const note = typeof p.note === 'string' ? p.note : undefined;
      const updated = await adminResolveReward(reportId, user.id, resolution, note);
      return json({ ok: true, reward: updated });
    }

    throw new HttpError(400, 'Unknown reward action.');
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: err?.message || 'Reward service error.' }, status);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get('reportId');
    if (!reportId) throw new HttpError(400, 'Missing reportId query parameter.');

    const user = await sessionUser();
    const actionToken =
      url.searchParams.get('token') ||
      req.headers.get('x-finder-token') ||
      undefined;

    const view = await getClientRewardView(reportId, user?.id, actionToken);
    return json({ ok: true, reward: view });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: err?.message || 'Unable to retrieve reward status.' }, status);
  }
}
