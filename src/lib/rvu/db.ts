/**
 * KHOJ — PostgreSQL Database Layer
 *
 * Replaces the SQLite (node:sqlite) layer with a pg-based Postgres client.
 * Uses AsyncLocalStorage to propagate transaction clients through the call stack
 * so that nested run/one/all calls within a transaction() use the same connection.
 *
 * Required env var:
 *   DATABASE_URL — Supabase connection string
 *   Get it from: Supabase → Project Settings → Database → Connection string → URI
 *
 * For Vercel (serverless): use Supabase Transaction mode pooler URL (port 6543)
 */

import { Pool, type PoolClient } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Account, Report, Claim } from './types';

type Value = string | number | boolean | null | Buffer | Uint8Array;

// ─── Connection pool ──────────────────────────────────────────────────────────

let _pool: Pool | undefined;

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is required.\n' +
        'Get it from: Supabase → Project Settings → Database → Connection string → URI\n' +
        'Configure the Transaction mode pooler URL (port 6543) in Vercel.',
      );
    }
    const isLocal =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1');
    _pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      // Keep connections small for serverless environments
      max: process.env.VERCEL ? 1 : 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    _pool.on('error', (err) => {
      console.error('pg pool error:', err);
    });
  }
  return _pool;
}

// ─── Transaction context ──────────────────────────────────────────────────────

// AsyncLocalStorage propagates the transaction PoolClient through the async
// call stack so that nested one/all/run calls within transaction() automatically
// use the same client and are therefore atomic.
const txContext = new AsyncLocalStorage<PoolClient>();

function runner(): Pool | PoolClient {
  return txContext.getStore() ?? getPool();
}

// ─── Self-Healing Schema Verification ─────────────────────────────────────────

let _schemaInitPromise: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!_schemaInitPromise) {
    _schemaInitPromise = (async () => {
      try {
        const pool = getPool();
        const client = await pool.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              "studentId" TEXT NOT NULL DEFAULT '',
              department TEXT NOT NULL DEFAULT '',
              role TEXT NOT NULL DEFAULT 'student',
              verified BOOLEAN NOT NULL DEFAULT false,
              password TEXT,
              "googleId" TEXT UNIQUE,
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='sessions' AND column_name='token'
              ) THEN
                DROP TABLE IF EXISTS sessions CASCADE;
                CREATE TABLE sessions (
                  token TEXT PRIMARY KEY,
                  "userId" TEXT NOT NULL,
                  expires BIGINT NOT NULL
                );
              END IF;
            END $$;

            CREATE TABLE IF NOT EXISTS tokens (
              token TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL,
              purpose TEXT NOT NULL,
              expires BIGINT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS guest_sessions (
              token TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL,
              expires BIGINT NOT NULL
            );

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='rate_limits' AND column_name='expires'
              ) THEN
                DROP TABLE IF EXISTS rate_limits CASCADE;
                CREATE TABLE rate_limits (
                  key TEXT PRIMARY KEY,
                  count INTEGER NOT NULL DEFAULT 1,
                  expires BIGINT NOT NULL DEFAULT 0
                );
              END IF;
            END $$;

            CREATE TABLE IF NOT EXISTS notifications (
              id TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL,
              title TEXT NOT NULL,
              href TEXT NOT NULL,
              read INTEGER NOT NULL DEFAULT 0,
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='notifications' AND column_name='read'
              ) THEN
                ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read INTEGER NOT NULL DEFAULT 0;
              END IF;
            END $$;

            CREATE TABLE IF NOT EXISTS activity (
              id TEXT PRIMARY KEY,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              location TEXT NOT NULL DEFAULT '',
              "reportId" TEXT,
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS audit (
              id TEXT PRIMARY KEY,
              "actorId" TEXT NOT NULL,
              "reportId" TEXT NOT NULL,
              action TEXT NOT NULL,
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS reports (
              id TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL,
              kind TEXT NOT NULL,
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              color TEXT NOT NULL DEFAULT '',
              brand TEXT NOT NULL DEFAULT '',
              description TEXT NOT NULL,
              "privateDetail" TEXT NOT NULL DEFAULT '',
              location TEXT NOT NULL,
              date TEXT NOT NULL,
              department TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'open',
              "imageId" TEXT,
              "createdAt" TEXT NOT NULL DEFAULT '',
              "custodyLocation" TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS protected_items (
              id TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              brand TEXT NOT NULL DEFAULT '',
              color TEXT NOT NULL DEFAULT '',
              description TEXT NOT NULL,
              "privateDetail" TEXT NOT NULL DEFAULT '',
              "imageId" TEXT,
              status TEXT NOT NULL DEFAULT 'safe',
              "lostReportId" TEXT,
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS claims (
              id TEXT PRIMARY KEY,
              "reportId" TEXT NOT NULL,
              "userId" TEXT NOT NULL,
              "lostReportId" TEXT,
              proof TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              "staffNote" TEXT NOT NULL DEFAULT '',
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS handovers (
              "reportId" TEXT PRIMARY KEY,
              "ownerId" TEXT NOT NULL,
              "finderId" TEXT NOT NULL,
              "ownerConfirmed" INTEGER NOT NULL DEFAULT 0,
              "finderConfirmed" INTEGER NOT NULL DEFAULT 0,
              point TEXT NOT NULL,
              "returnedAt" TEXT,
              "rewardStatus" TEXT NOT NULL DEFAULT 'offered',
              "finderUpi" TEXT NOT NULL DEFAULT '',
              "candidateMatchId" TEXT,
              state TEXT NOT NULL DEFAULT 'RECOVERY_PENDING',
              "proposedLocation" TEXT NOT NULL DEFAULT '',
              "proposedDate" TEXT NOT NULL DEFAULT '',
              "proposedTimeWindow" TEXT NOT NULL DEFAULT '',
              "proposedBy" TEXT NOT NULL DEFAULT 'owner',
              "ownerConfirmedAt" TEXT,
              "finderConfirmedAt" TEXT,
              "finderActionToken" TEXT NOT NULL DEFAULT '',
              "tokenExpiresAt" TEXT,
              "issueReason" TEXT NOT NULL DEFAULT '',
              "cancellationReason" TEXT NOT NULL DEFAULT '',
              "createdAt" TEXT NOT NULL DEFAULT '',
              "updatedAt" TEXT NOT NULL DEFAULT '',
              "workflowVersion" TEXT NOT NULL DEFAULT 'v1'
            );

            CREATE TABLE IF NOT EXISTS matches (
              id TEXT PRIMARY KEY,
              "lostId" TEXT NOT NULL,
              "foundId" TEXT NOT NULL,
              score INTEGER NOT NULL,
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS found_ids (
              "reportId" TEXT PRIMARY KEY,
              "targetUserId" TEXT,
              "subjectHash" TEXT NOT NULL,
              "createdAt" TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS identity_links (
              "userId" TEXT PRIMARY KEY,
              usn TEXT NOT NULL,
              status TEXT NOT NULL,
              "linkedAt" TEXT,
              "requestedAt" TEXT NOT NULL,
              "reviewedBy" TEXT,
              note TEXT NOT NULL DEFAULT ''
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_pair ON matches ("lostId", "foundId");
            CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_pair ON claims ("reportId", "userId");
          `);
        } finally {
          client.release();
        }
      } catch (err) {
        console.warn('Auto-schema verification notice:', err);
      }
    })();
  }
  return _schemaInitPromise;
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────

/** Convert SQLite ? positional placeholders to Postgres $1, $2, … */
function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function one<T>(sql: string, ...args: Value[]): Promise<T | undefined> {
  await ensureSchema();
  const { rows } = await runner().query(toPositional(sql), args as unknown[]);
  return (rows[0] as T) ?? undefined;
}

export async function all<T>(sql: string, ...args: Value[]): Promise<T[]> {
  await ensureSchema();
  const { rows } = await runner().query(toPositional(sql), args as unknown[]);
  return rows as T[];
}

export async function run(sql: string, ...args: Value[]): Promise<{ changes: number }> {
  await ensureSchema();
  const result = await runner().query(toPositional(sql), args as unknown[]);
  return { changes: result.rowCount ?? 0 };
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await txContext.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export const now = () => new Date().toISOString();
export const id = (prefix: string) =>
  prefix ? `${prefix}-${randomUUID()}` : randomUUID();

// ─── Domain helpers ───────────────────────────────────────────────────────────

export async function account(userId: string): Promise<Account | undefined> {
  const user = await one<Account>(
    `SELECT u.id,u.name,u.email,u."studentId",u.department,u.role,u.verified,
     COALESCE(i.status,'UNLINKED') AS "collegeIdStatus",
     i.usn AS "collegeUsn",
     i."linkedAt" AS "collegeIdLinkedAt"
     FROM users u
     LEFT JOIN identity_links i ON i."userId"=u.id
     WHERE u.id=?`,
    userId,
  );
  return user ? { ...user, verified: Boolean(user.verified) } : undefined;
}

export async function notify(
  userId: string,
  title: string,
  href: string,
): Promise<void> {
  await run(
    'INSERT INTO notifications (id,"userId",title,href,"createdAt") VALUES (?,?,?,?,?)',
    id('notice'),
    userId,
    title,
    href,
    now(),
  );
}

export async function audit(
  actorId: string,
  reportId: string,
  action: string,
): Promise<void> {
  await run(
    'INSERT INTO audit VALUES (?,?,?,?,?)',
    id('event'),
    actorId,
    reportId,
    action,
    now(),
  );
  const r = await report(reportId);
  if (r) {
    const type = action.startsWith('Found report')
      ? 'found'
      : action.startsWith('Lost report')
        ? 'lost'
        : action.startsWith('Received into')
          ? 'custody'
          : action.startsWith('Claim approved')
            ? 'verified'
            : action.startsWith('Returned to')
              ? 'returned'
              : null;
    if (type) {
      const titles: Record<string, string> = {
        found: 'Found item reported',
        lost: 'Lost item reported',
        custody: 'Item received into safe custody',
        verified: 'Ownership verified',
        returned: 'Item returned to its owner',
      };
      await activity(type, titles[type] ?? 'Recovery updated', r.location, reportId);
    }
  }
}

export async function activity(
  type: string,
  title: string,
  location = '',
  reportId: string | null = null,
): Promise<void> {
  await run(
    'INSERT INTO activity VALUES (?,?,?,?,?,?)',
    id('activity'),
    type,
    title,
    location,
    reportId,
    now(),
  );
}

export async function report(reportId: string): Promise<Report | undefined> {
  return one<Report>('SELECT * FROM reports WHERE id=?', reportId);
}

export async function claim(claimId: string): Promise<Claim | undefined> {
  return one<Claim>('SELECT * FROM claims WHERE id=?', claimId);
}

/** Pure computation — no database access. */
export function scoreReports(a: Report, b: Report): number {
  if (a.category !== b.category || a.userId === b.userId) return 0;
  const words = (s: string) =>
    new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
  const left = words(`${a.title} ${a.description} ${a.brand}`);
  const right = words(`${b.title} ${b.description} ${b.brand}`);
  const overlap =
    Array.from(left).filter((w) => right.has(w)).length /
    Math.max(1, Math.min(left.size, right.size));
  const same = (x: string, y: string) =>
    x.trim() && x.toLowerCase().trim() === y.toLowerCase().trim();
  return Math.min(
    99,
    Math.round(
      30 +
        overlap * 30 +
        (same(a.color, b.color) ? 15 : 0) +
        (same(a.brand, b.brand) ? 10 : 0) +
        (a.location === b.location ? 10 : 0) +
        (Math.abs(Date.parse(a.date) - Date.parse(b.date)) <= 7 * 86400000
          ? 5
          : 0),
    ),
  );
}

export async function matchReport(newReport: Report): Promise<void> {
  const candidates = await all<Report>(
    "SELECT * FROM reports WHERE kind<>? AND status IN ('open','in_custody') AND \"userId\"<>?",
    newReport.kind,
    newReport.userId,
  );
  for (const candidate of candidates) {
    const score = scoreReports(newReport, candidate);
    if (score < 60) continue;
    const lost = newReport.kind === 'lost' ? newReport : candidate;
    const found = newReport.kind === 'found' ? newReport : candidate;
    // UNIQUE(lostId,foundId) constraint → ON CONFLICT DO NOTHING
    const inserted = await run(
      'INSERT INTO matches (id,"lostId","foundId",score,"createdAt") VALUES (?,?,?,?,?) ON CONFLICT ("lostId","foundId") DO NOTHING',
      id('match'),
      lost.id,
      found.id,
      score,
      now(),
    );
    if (inserted.changes) {
      await notify(lost.userId, `Possible match for ${lost.title}`, `/items/${found.id}`);
      await activity('match', 'Potential match identified', found.location, found.id);
    }
  }
}
