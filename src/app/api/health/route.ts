import { NextResponse } from 'next/server';
import { all, one } from '@/lib/rvu/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      databaseHost: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'
        : 'missing',
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      isVercel: Boolean(process.env.VERCEL),
    },
  };

  try {
    // 1. Basic connection test
    const ping = await one<{ connected: number; now: string; user: string; db: string }>(
      'SELECT 1 AS connected, NOW()::text AS now, CURRENT_USER AS "user", CURRENT_DATABASE() AS "db"',
    );
    diagnostics.connection = ping;

    // 2. Check existing tables in public schema
    const tables = await all<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    );
    const existingTableNames = tables.map((t) => t.table_name);
    diagnostics.tablesCount = existingTableNames.length;
    diagnostics.tablesFound = existingTableNames;

    // Required tables
    const requiredTables = [
      'users',
      'sessions',
      'tokens',
      'reports',
      'protected_items',
      'claims',
      'handovers',
      'matches',
      'notifications',
      'audit',
      'activity',
      'rate_limits',
      'guest_sessions',
      'identity_links',
    ];
    const missingTables = requiredTables.filter((t) => !existingTableNames.includes(t));
    diagnostics.missingTables = missingTables;

    // 3. Test critical sessions query
    try {
      await one('SELECT "userId" FROM sessions WHERE token=? AND expires>?', 'test-token', 0);
      diagnostics.sessionsQueryOk = true;
    } catch (sessionErr) {
      diagnostics.sessionsQueryOk = false;
      diagnostics.sessionsQueryError =
        sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
    }

    // 4. Test reports count query
    try {
      const pFound = await one<{ n: string | number }>(
        "SELECT COUNT(*) AS n FROM reports WHERE kind='found' AND status IN ('open','in_custody')",
      );
      diagnostics.reportsCountQueryOk = true;
      diagnostics.reportsCount = pFound?.n;
    } catch (repErr) {
      diagnostics.reportsCountQueryOk = false;
      diagnostics.reportsCountError =
        repErr instanceof Error ? repErr.message : String(repErr);
    }

    // 5. Test account query (validates users & identity_links casing)
    try {
      await one(
        `SELECT u.id,u.name,u.email,u."studentId",u.department,u.role,u.verified,
         COALESCE(i.status,'UNLINKED') AS "collegeIdStatus",
         i.usn AS "collegeUsn",
         i."linkedAt" AS "collegeIdLinkedAt"
         FROM users u
         LEFT JOIN identity_links i ON i."userId"=u.id
         WHERE u.id=?`,
        'health-check-id',
      );
      diagnostics.accountQueryOk = true;
    } catch (accErr) {
      diagnostics.accountQueryOk = false;
      diagnostics.accountQueryError =
        accErr instanceof Error ? accErr.message : String(accErr);
    }

    const isHealthy = Boolean(
      diagnostics.connection &&
      missingTables.length === 0 &&
      diagnostics.sessionsQueryOk &&
      diagnostics.accountQueryOk,
    );

    return NextResponse.json(
      { ok: isHealthy, ...diagnostics },
      { status: isHealthy ? 200 : 500 },
    );
  } catch (err) {
    diagnostics.ok = false;
    diagnostics.error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
