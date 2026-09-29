import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import type { Account, Report, Claim } from "./types";

type Value = string | number | null | Uint8Array;
type Statement = {
  run(...args: Value[]): { changes: number };
  get(...args: Value[]): unknown;
  all(...args: Value[]): unknown[];
};
type Database = { exec(sql: string): void; prepare(sql: string): Statement };

const req = typeof require !== "undefined" ? require : createRequire(import.meta.url);
const { DatabaseSync } = req("node:sqlite") as {
  DatabaseSync: new (file: string) => Database;
};
let connection: Database | undefined;
export function db(): Database {
  if (connection) return connection;

  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NETLIFY
  );

  let file = process.env.RVU_DB_PATH;
  if (!file) {
    if (isServerless) {
      if (process.env.ALLOW_EPHEMERAL_SQLITE === "true") {
        file = path.join("/tmp", "rvu.sqlite");
      } else {
        throw new Error(
          "CRITICAL PRODUCTION CONFIGURATION ERROR: Ephemeral SQLite fallback (/tmp/rvu.sqlite) is prohibited in serverless/production. For production college-wide deployment, configure Supabase or provide a persistent database."
        );
      }
    } else {
      file = path.join(process.cwd(), "data", "rvu.sqlite");
    }
  }

  const tmpFallback = path.join("/tmp", "rvu.sqlite");

  const openDb = (targetPath: string): Database => {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    if (targetPath === tmpFallback && !fs.existsSync(targetPath)) {
      const sourceDb = path.join(process.cwd(), "data", "rvu.sqlite");
      if (fs.existsSync(sourceDb)) {
        try {
          fs.copyFileSync(sourceDb, targetPath);
        } catch {
          // Ignore copy failure; new DatabaseSync will initialize the schema
        }
      }
    }
    return new DatabaseSync(targetPath);
  };

  try {
    connection = openDb(file);
  } catch (err: any) {
    if (file !== tmpFallback && (err?.code === "EROFS" || err?.code === "EACCES" || isServerless)) {
      console.warn(`Database path ${file} not writable (${err?.message}), falling back to ${tmpFallback}`);
      file = tmpFallback;
      connection = openDb(file);
    } else {
      throw err;
    }
  }
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
    CREATE TABLE IF NOT EXISTS handovers (reportId TEXT PRIMARY KEY REFERENCES reports(id), ownerId TEXT NOT NULL REFERENCES users(id), finderId TEXT NOT NULL REFERENCES users(id), ownerConfirmed INTEGER NOT NULL DEFAULT 0, finderConfirmed INTEGER NOT NULL DEFAULT 0, point TEXT NOT NULL, returnedAt TEXT, rewardStatus TEXT NOT NULL DEFAULT 'offered', finderUpi TEXT NOT NULL DEFAULT '', candidateMatchId TEXT, state TEXT NOT NULL DEFAULT 'RECOVERY_PENDING', proposedLocation TEXT NOT NULL DEFAULT '', proposedDate TEXT NOT NULL DEFAULT '', proposedTimeWindow TEXT NOT NULL DEFAULT '', proposedBy TEXT NOT NULL DEFAULT 'owner', ownerConfirmedAt TEXT, finderConfirmedAt TEXT, finderActionToken TEXT NOT NULL DEFAULT '', tokenExpiresAt TEXT, issueReason TEXT NOT NULL DEFAULT '', cancellationReason TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT '', updatedAt TEXT NOT NULL DEFAULT '', workflowVersion TEXT NOT NULL DEFAULT 'v1');
    CREATE TABLE IF NOT EXISTS recovery_events (id TEXT PRIMARY KEY, reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, candidateMatchId TEXT, actorId TEXT NOT NULL, actorRole TEXT NOT NULL, eventType TEXT NOT NULL, fromState TEXT NOT NULL, toState TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS blind_attempts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, reportId TEXT NOT NULL, accepted INTEGER NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS item_fingerprints (id TEXT PRIMARY KEY, itemId TEXT NOT NULL UNIQUE REFERENCES protected_items(id) ON DELETE CASCADE, category TEXT NOT NULL, subcategory TEXT, brand TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', material TEXT, visibleText TEXT NOT NULL DEFAULT '[]', logos TEXT NOT NULL DEFAULT '[]', accessories TEXT NOT NULL DEFAULT '[]', distinctiveFeatures TEXT NOT NULL DEFAULT '[]', condition TEXT NOT NULL DEFAULT 'unknown', ownerDescription TEXT NOT NULL DEFAULT '', normalizedDescription TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}', imageReference TEXT, textEmbeddingReference TEXT, imageEmbeddingReference TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS found_fingerprints (id TEXT PRIMARY KEY, foundReportId TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE, category TEXT NOT NULL, subcategory TEXT, brand TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', material TEXT, visibleText TEXT NOT NULL DEFAULT '[]', logos TEXT NOT NULL DEFAULT '[]', accessories TEXT NOT NULL DEFAULT '[]', distinctiveFeatures TEXT NOT NULL DEFAULT '[]', condition TEXT NOT NULL DEFAULT 'unknown', visualDescription TEXT NOT NULL DEFAULT '', foundLocation TEXT NOT NULL DEFAULT '', foundAt TEXT NOT NULL, imageReference TEXT, imageEmbeddingReference TEXT, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS candidate_matches (id TEXT PRIMARY KEY, foundReportId TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, itemId TEXT NOT NULL REFERENCES protected_items(id) ON DELETE CASCADE, vectorSimilarity REAL, attributeScore INTEGER NOT NULL DEFAULT 0, uniqueClueScore INTEGER NOT NULL DEFAULT 0, locationScore INTEGER NOT NULL DEFAULT 0, timeScore INTEGER NOT NULL DEFAULT 0, overallScore INTEGER NOT NULL DEFAULT 0, confidenceTier TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'candidate', evidence TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, UNIQUE(foundReportId, itemId));
    CREATE TABLE IF NOT EXISTS verification_evidence (id TEXT PRIMARY KEY, candidateMatchId TEXT NOT NULL REFERENCES candidate_matches(id) ON DELETE CASCADE, itemId TEXT NOT NULL REFERENCES protected_items(id) ON DELETE CASCADE, question TEXT NOT NULL, ownerAnswer TEXT NOT NULL, expectedEvidence TEXT NOT NULL, result TEXT NOT NULL DEFAULT 'pending', evidenceSource TEXT NOT NULL DEFAULT 'owner_registration', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS fingerprint_embeddings (id TEXT PRIMARY KEY, sourceId TEXT NOT NULL, sourceType TEXT NOT NULL, modality TEXT NOT NULL, embedding TEXT NOT NULL, modelName TEXT NOT NULL, modelVersion TEXT NOT NULL, dimension INTEGER NOT NULL DEFAULT 768, contentHash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ready', errorMessage TEXT, category TEXT, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, UNIQUE(sourceId, modality, modelName, modelVersion));
    CREATE TABLE IF NOT EXISTS verification_sessions (id TEXT PRIMARY KEY, candidateMatchId TEXT NOT NULL REFERENCES candidate_matches(id) ON DELETE CASCADE, itemId TEXT NOT NULL REFERENCES protected_items(id) ON DELETE CASCADE, foundReportId TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, claimantUserId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, state TEXT NOT NULL DEFAULT 'PENDING_CHALLENGE', challenges TEXT NOT NULL DEFAULT '[]', activeChallengeIndex INTEGER NOT NULL DEFAULT 0, attemptCount INTEGER NOT NULL DEFAULT 0, maxAttempts INTEGER NOT NULL DEFAULT 3, verificationScore REAL NOT NULL DEFAULT 0.0, verificationStrength TEXT NOT NULL DEFAULT 'weak', matchedEvidence TEXT NOT NULL DEFAULT '[]', conflicts TEXT NOT NULL DEFAULT '[]', missingEvidence TEXT NOT NULL DEFAULT '[]', algorithmVersion TEXT NOT NULL DEFAULT 'v1', expiresAt TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS verification_audits (id TEXT PRIMARY KEY, sessionId TEXT NOT NULL, candidateMatchId TEXT NOT NULL, claimantUserId TEXT NOT NULL, attemptNumber INTEGER NOT NULL, challengeType TEXT NOT NULL, result TEXT NOT NULL, score REAL NOT NULL, matchedCategories TEXT NOT NULL DEFAULT '[]', ip TEXT NOT NULL DEFAULT '', algorithmVersion TEXT NOT NULL DEFAULT 'v1', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rewards (id TEXT PRIMARY KEY, reportId TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE, recoveryCaseId TEXT, ownerId TEXT NOT NULL REFERENCES users(id), finderReference TEXT NOT NULL, amountInr INTEGER NOT NULL DEFAULT 20, state TEXT NOT NULL DEFAULT 'NOT_OFFERED', finderUpiId TEXT NOT NULL DEFAULT '', ownerPaymentReportedAt TEXT, finderPaymentConfirmedAt TEXT, completedAt TEXT, cancellationReason TEXT NOT NULL DEFAULT '', disputeReason TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, workflowVersion TEXT NOT NULL DEFAULT 'v1');
    CREATE TABLE IF NOT EXISTS reward_events (id TEXT PRIMARY KEY, rewardId TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE, reportId TEXT NOT NULL, actorId TEXT NOT NULL, actorRole TEXT NOT NULL, eventType TEXT NOT NULL, fromState TEXT NOT NULL, toState TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pipeline_events (id TEXT PRIMARY KEY, reportId TEXT NOT NULL, stage TEXT NOT NULL, status TEXT NOT NULL, stageDurationMs INTEGER NOT NULL DEFAULT 0, metadata TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS recovery_feedback (id TEXT PRIMARY KEY, reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, actorRole TEXT NOT NULL, easyRating TEXT NOT NULL, confusionNote TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_ground_truth (id TEXT PRIMARY KEY, reportId TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, trueOwnerId TEXT, trueItemId TEXT, hasRealMatch INTEGER NOT NULL DEFAULT 0, candidateRank INTEGER, verificationResult TEXT NOT NULL, handoverResult TEXT NOT NULL, returnedResult TEXT NOT NULL, caseClassification TEXT NOT NULL, failureStage TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot_incidents (id TEXT PRIMARY KEY, reportId TEXT, incidentType TEXT NOT NULL, severity TEXT NOT NULL, reportedBy TEXT NOT NULL, details TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', resolutionNotes TEXT, resolvedBy TEXT, createdAt TEXT NOT NULL, resolvedAt TEXT);
    CREATE INDEX IF NOT EXISTS idx_item_fingerprints_item ON item_fingerprints(itemId);
    CREATE INDEX IF NOT EXISTS idx_found_fingerprints_report ON found_fingerprints(foundReportId);
    CREATE INDEX IF NOT EXISTS idx_candidate_matches_pair ON candidate_matches(foundReportId, itemId);
    CREATE INDEX IF NOT EXISTS idx_candidate_matches_score ON candidate_matches(overallScore DESC);
    CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_src ON fingerprint_embeddings(sourceId, sourceType);
    CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_cat ON fingerprint_embeddings(category, status);
    CREATE INDEX IF NOT EXISTS idx_verif_sessions_cand ON verification_sessions(candidateMatchId);
    CREATE INDEX IF NOT EXISTS idx_verif_sessions_user ON verification_sessions(claimantUserId);
    CREATE INDEX IF NOT EXISTS idx_verif_sessions_state ON verification_sessions(state);
    CREATE INDEX IF NOT EXISTS idx_verif_audits_sess ON verification_audits(sessionId);
    CREATE INDEX IF NOT EXISTS idx_rewards_report ON rewards(reportId);
    CREATE INDEX IF NOT EXISTS idx_rewards_owner ON rewards(ownerId);
    CREATE INDEX IF NOT EXISTS idx_rewards_finder ON rewards(finderReference);
    CREATE INDEX IF NOT EXISTS idx_rewards_state ON rewards(state);
    CREATE INDEX IF NOT EXISTS idx_reward_events_reward ON reward_events(rewardId);
    CREATE INDEX IF NOT EXISTS idx_reward_events_report ON reward_events(reportId);
    CREATE INDEX IF NOT EXISTS idx_pipeline_events_report ON pipeline_events(reportId);
    CREATE INDEX IF NOT EXISTS idx_pipeline_events_stage ON pipeline_events(stage);
    CREATE INDEX IF NOT EXISTS idx_recovery_feedback_report ON recovery_feedback(reportId);
    CREATE INDEX IF NOT EXISTS idx_recovery_feedback_user ON recovery_feedback(userId);
    CREATE INDEX IF NOT EXISTS idx_pilot_gt_report ON pilot_ground_truth(reportId);
    CREATE INDEX IF NOT EXISTS idx_pilot_gt_item ON pilot_ground_truth(trueItemId);
    CREATE INDEX IF NOT EXISTS idx_pilot_incidents_report ON pilot_incidents(reportId);
    CREATE INDEX IF NOT EXISTS idx_pilot_incidents_status ON pilot_incidents(status);
  `);
  const alterCols = [
    "ALTER TABLE handovers ADD COLUMN candidateMatchId TEXT",
    "ALTER TABLE handovers ADD COLUMN state TEXT NOT NULL DEFAULT 'RECOVERY_PENDING'",
    "ALTER TABLE handovers ADD COLUMN proposedLocation TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN proposedDate TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN proposedTimeWindow TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN proposedBy TEXT NOT NULL DEFAULT 'owner'",
    "ALTER TABLE handovers ADD COLUMN ownerConfirmedAt TEXT",
    "ALTER TABLE handovers ADD COLUMN finderConfirmedAt TEXT",
    "ALTER TABLE handovers ADD COLUMN finderActionToken TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN tokenExpiresAt TEXT",
    "ALTER TABLE handovers ADD COLUMN issueReason TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN cancellationReason TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN createdAt TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE handovers ADD COLUMN workflowVersion TEXT NOT NULL DEFAULT 'v1'",
  ];
  for (const sql of alterCols) {
    try { connection.exec(sql); } catch {}
  }
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
