import { NextResponse } from 'next/server';
import { HttpError, sessionUser, text } from '@/lib/rvu/auth';
import { getOperationalStaffOverview, manualFallbackFilter } from '@/lib/rvu/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
  try {
    const user = await sessionUser();
    if (!user || user.role !== 'staff') {
      throw new HttpError(403, 'Authorised RVU staff access required.');
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');

    if (mode === 'fallback_search') {
      const category = url.searchParams.get('category') || undefined;
      const brand = url.searchParams.get('brand') || undefined;
      const color = url.searchParams.get('color') || undefined;
      const location = url.searchParams.get('location') || undefined;
      const status = url.searchParams.get('status') || undefined;
      const kind = url.searchParams.get('kind') as 'lost' | 'found' | undefined;

      const results = await manualFallbackFilter({ category, brand, color, location, status, kind });
      return json({ ok: true, count: results.length, results });
    }

    const overview = await getOperationalStaffOverview(user.id);
    return json({ ok: true, overview });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: err?.message || 'Operational service error.' }, status);
  }
}
