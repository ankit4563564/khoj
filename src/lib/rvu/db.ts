import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Account, Report, Claim } from "./types";

type Value = string | number | null | Uint8Array;
type Statement = {
  run(...args: Value[]): { changes: number };
  get(...args: Value[]): unknown;
  all(...args: Value[]): unknown[];
};
type Database = { exec(sql: string): void; prepare(sql: string): Statement };
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (file: string) => Database;
};
let connection: Database | undefined;
export function db(): Database {
  if (connection) return connection;
  const file =
    process.env.RVU_DB_PATH || path.join(process.cwd(), "data", "rvu.sqlite");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  connection = new DatabaseSync(file);
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, studentId TEXT NOT NULL, department TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student', verified INTEGER NOT NULL DEFAULT 0, password TEXT, googleId TEXT UNIQUE, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), purpose TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), mime TEXT NOT NULL, content BLOB NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, color TEXT NOT NULL, brand TEXT NOT NULL, description TEXT NOT NULL, privateDetail TEXT NOT NULL, location TEXT NOT NULL, date TEXT NOT NULL, department TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', imageId TEXT REFERENCES uploads(id), createdAt TEXT NOT NULL, custodyLocation TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, reportId TEXT NOT NULL REFERENCES reports(id), userId TEXT NOT NULL REFERENCES users(id), lostReportId TEXT REFERENCES reports(id), proof TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', staffNote TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, UNIQUE(reportId,userId));
    CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, lostId TEXT NOT NULL REFERENCES reports(id), foundId TEXT NOT NULL REFERENCES reports(id), score INTEGER NOT NULL, createdAt TEXT NOT NULL, UNIQUE(lostId,foundId));
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, href TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actorId TEXT NOT NULL REFERENCES users(id), reportId TEXT NOT NULL REFERENCES reports(id), action TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS reports_user ON reports(userId);
    CREATE INDEX IF NOT EXISTS reports_kind ON reports(kind,status);
    CREATE INDEX IF NOT EXISTS claims_user ON claims(userId);
    CREATE INDEX IF NOT EXISTS notices_user ON notifications(userId,createdAt);
    CREATE TABLE IF NOT EXISTS identity_links (userId TEXT PRIMARY KEY REFERENCES users(id), usn TEXT NOT NULL, status TEXT NOT NULL, linkedAt TEXT, requestedAt TEXT NOT NULL, reviewedBy TEXT, note TEXT NOT NULL DEFAULT '');
    CREATE UNIQUE INDEX IF NOT EXISTS unique_linked_usn ON identity_links(usn) WHERE status='LINKED';
    CREATE TABLE IF NOT EXISTS campus_directory (usn TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS identity_audit (id TEXT PRIMARY KEY, actorId TEXT, action TEXT NOT NULL, subjectHash TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS guest_sessions (token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS found_ids (reportId TEXT PRIMARY KEY REFERENCES reports(id), targetUserId TEXT REFERENCES users(id), subjectHash TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS protected_items (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, category TEXT NOT NULL, brand TEXT NOT NULL, color TEXT NOT NULL, description TEXT NOT NULL, privateDetail TEXT NOT NULL, imageId TEXT REFERENCES uploads(id), status TEXT NOT NULL DEFAULT 'safe', lostReportId TEXT REFERENCES reports(id), createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', reportId TEXT, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS handovers (reportId TEXT PRIMARY KEY REFERENCES reports(id), ownerId TEXT NOT NULL REFERENCES users(id), finderId TEXT NOT NULL REFERENCES users(id), ownerConfirmed INTEGER NOT NULL DEFAULT 0, finderConfirmed INTEGER NOT NULL DEFAULT 0, point TEXT NOT NULL, returnedAt TEXT, rewardStatus TEXT NOT NULL DEFAULT 'offered', finderUpi TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS blind_attempts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, reportId TEXT NOT NULL, accepted INTEGER NOT NULL, createdAt TEXT NOT NULL);
  `);
  return connection;
}
export function one<T>(sql: string, ...args: Value[]): T | undefined {
  return db()
    .prepare(sql)
    .get(...args) as T | undefined;
}
export function all<T>(sql: string, ...args: Value[]): T[] {
  return db()
    .prepare(sql)
    .all(...args) as T[];
}
export function run(sql: string, ...args: Value[]) {
  return db()
    .prepare(sql)
    .run(...args);
}
export function transaction<T>(fn: () => T): T {
  db().exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db().exec("COMMIT");
    return result;
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }
}
export const now = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}-${randomUUID()}`;
export function account(userId: string): Account | undefined {
  const user = one<Account>(
    "SELECT u.id,u.name,u.email,u.studentId,u.department,u.role,u.verified,COALESCE(i.status,'UNLINKED') AS collegeIdStatus,i.usn AS collegeUsn,i.linkedAt AS collegeIdLinkedAt FROM users u LEFT JOIN identity_links i ON i.userId=u.id WHERE u.id=?",
    userId,
  );
  return user ? { ...user, verified: Boolean(user.verified) } : undefined;
}
export function notify(userId: string, title: string, href: string) {
  run(
    "INSERT INTO notifications (id,userId,title,href,createdAt) VALUES (?,?,?,?,?)",
    id("notice"),
    userId,
    title,
    href,
    now(),
  );
}
export function audit(actorId: string, reportId: string, action: string) {
  run(
    "INSERT INTO audit VALUES (?,?,?,?,?)",
    id("event"),
    actorId,
    reportId,
    action,
    now(),
  );
  const r = report(reportId);
  if(r){
    const type=action.startsWith('Found report')?'found':action.startsWith('Lost report')?'lost':action.startsWith('Received into')?'custody':action.startsWith('Claim approved')?'verified':action.startsWith('Returned to')?'returned':null;
    if(type) activity(type,{found:'Found item reported',lost:'Lost item reported',custody:'Item received into safe custody',verified:'Ownership verified',returned:'Item returned to its owner'}[type]||'Recovery updated',r.location,reportId);
  }
}
export function activity(type:string,title:string,location='',reportId:string|null=null){run('INSERT INTO activity VALUES (?,?,?,?,?,?)',id('activity'),type,title,location,reportId,now());}
export function report(reportId: string) {
  return one<Report>("SELECT * FROM reports WHERE id=?", reportId);
}
export function claim(claimId: string) {
  return one<Claim>("SELECT * FROM claims WHERE id=?", claimId);
}

// Explainable metadata suggestions. This is not a claim of visual AI confidence.
export function scoreReports(a: Report, b: Report): number {
  if (a.category !== b.category || a.userId === b.userId) return 0;
  const words = (s: string) =>
    new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
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
export function matchReport(newReport: Report) {
  const candidates = all<Report>(
    "SELECT * FROM reports WHERE kind<>? AND status IN ('open','in_custody') AND userId<>?",
    newReport.kind,
    newReport.userId,
  );
  for (const candidate of candidates) {
    const score = scoreReports(newReport, candidate);
    if (score < 60) continue;
    const lost = newReport.kind === "lost" ? newReport : candidate;
    const found = newReport.kind === "found" ? newReport : candidate;
    const inserted = run(
      "INSERT OR IGNORE INTO matches VALUES (?,?,?,?,?)",
      id("match"),
      lost.id,
      found.id,
      score,
      now(),
    );
    if (inserted.changes) {
      notify(
        lost.userId,
        `Possible match for ${lost.title}`,
        `/items/${found.id}`,
      );
      activity('match','Potential match identified',found.location,found.id);
    }
  }
}
