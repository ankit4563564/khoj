import { NextResponse } from 'next/server';
import { HttpError, originCheck, requireUser, text } from '@/lib/rvu/auth';
import {
  startVerificationSession,
  getVerificationChallenge,
  submitVerificationAnswer,
  adminReviewVerificationSession,
} from '@/lib/rvu/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  try {
    originCheck(req);
    const user = await requireUser();
    const raw = await req.text();
    if (raw.length > 8000) throw new HttpError(413, 'Request too large.');
    const p = JSON.parse(raw);

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

    if (p.action === 'start') {
      const candidateMatchId = text(p.candidateMatchId, 'Candidate match ID', 5, 100);
      const challengeView = await startVerificationSession(candidateMatchId, user.id, clientIp);
      return json({ ok: true, challenge: challengeView });
    }

    if (p.action === 'submit') {
      const sessionId = text(p.sessionId, 'Verification session ID', 5, 100);
      const answer = text(p.answer, 'Answer', 1, 2000);
      const outcome = await submitVerificationAnswer(sessionId, answer, user.id, clientIp);
      return json({ ok: true, result: outcome });
    }

    if (p.action === 'admin_review') {
      const sessionId = text(p.sessionId, 'Verification session ID', 5, 100);
      const approved = Boolean(p.approved);
      const note = typeof p.note === 'string' ? p.note.slice(0, 500) : '';
      const updated = await adminReviewVerificationSession(sessionId, approved, user.id, note);
      return json({ ok: true, state: updated.state });
    }

    throw new HttpError(400, 'Unknown verification action.');
  } catch (e) {
    return json(
      { error: e instanceof HttpError ? e.message : 'Verification request could not be processed.' },
      e instanceof HttpError ? e.status : 500
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      throw new HttpError(400, 'sessionId query parameter is required.');
    }

    const challengeView = await getVerificationChallenge(sessionId, user.id);
    return json({ ok: true, challenge: challengeView });
  } catch (e) {
    return json(
      { error: e instanceof HttpError ? e.message : 'Unable to retrieve verification challenge.' },
      e instanceof HttpError ? e.status : 500
    );
  }
}
