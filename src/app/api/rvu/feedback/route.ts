import { NextResponse } from 'next/server';
import { HttpError, originCheck, sessionUser, text } from '@/lib/rvu/auth';
import { submitRecoveryFeedback, getFeedbackForReport, listFeedbackSummary } from '@/lib/rvu/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  try {
    originCheck(req);
    const user = await sessionUser();
    if (!user) throw new HttpError(401, 'Please log in to submit feedback.');

    const raw = await req.text();
    if (raw.length > 5000) throw new HttpError(413, 'Request too large.');
    const p = JSON.parse(raw);

    const reportId = text(p.reportId, 'Report ID', 3, 100);
    const actorRole = p.actorRole === 'finder' ? 'finder' : 'owner';
    const easyRating = p.easyRating;
    const confusionNote = typeof p.confusionNote === 'string' ? p.confusionNote : '';

    const feedback = await submitRecoveryFeedback(reportId, user.id, actorRole, easyRating, confusionNote);
    return json({ ok: true, feedback });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: err?.message || 'Unable to submit feedback.' }, status);
  }
}

export async function GET(req: Request) {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'staff') {
      throw new HttpError(403, 'Staff access required.');
    }

    const summary = await listFeedbackSummary();
    return json({ ok: true, summary });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: err?.message || 'Unable to retrieve feedback summary.' }, status);
  }
}
