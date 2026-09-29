/**
 * KHOJ — Phase 7: Verification Session Repository
 * Manages database persistence for blind verification sessions, audit logs, and status synchronization.
 */

import { id, now, one, all, run, transaction } from "@/lib/rvu/db";
import type { CandidateScoreCard, ProtectedItem, Report } from "@/lib/rvu/types";
import type {
  VerificationAuditRecord,
  VerificationChallenge,
  VerificationSession,
  VerificationState,
  VerificationStrength,
} from "./verificationTypes";
import { VERIFICATION_CONFIG } from "./verificationConfig";

interface RawVerificationSessionRow {
  id: string;
  candidateMatchId: string;
  itemId: string;
  foundReportId: string;
  claimantUserId: string;
  state: string;
  challenges: string;
  activeChallengeIndex: number;
  attemptCount: number;
  maxAttempts: number;
  verificationScore: number;
  verificationStrength: string;
  matchedEvidence: string;
  conflicts: string;
  missingEvidence: string;
  algorithmVersion: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

function parseSessionRow(row: RawVerificationSessionRow): VerificationSession {
  return {
    id: row.id,
    candidateMatchId: row.candidateMatchId,
    itemId: row.itemId,
    foundReportId: row.foundReportId,
    claimantUserId: row.claimantUserId,
    state: row.state as VerificationState,
    challenges: JSON.parse(row.challenges || "[]"),
    activeChallengeIndex: row.activeChallengeIndex,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    verificationScore: row.verificationScore,
    verificationStrength: row.verificationStrength as VerificationStrength,
    matchedEvidence: JSON.parse(row.matchedEvidence || "[]"),
    conflicts: JSON.parse(row.conflicts || "[]"),
    missingEvidence: JSON.parse(row.missingEvidence || "[]"),
    algorithmVersion: row.algorithmVersion,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Creates and persists a new verification session.
 */
export async function createSessionRecord(
  candidateMatchId: string,
  itemId: string,
  foundReportId: string,
  claimantUserId: string,
  challenges: VerificationChallenge[],
  maxAttempts = VERIFICATION_CONFIG.MAX_ATTEMPTS,
  expiryMs = VERIFICATION_CONFIG.SESSION_EXPIRY_MS
): Promise<VerificationSession> {
  const sessionId = `vsess-${id("").slice(0, 16)}`;
  const currentTime = now();
  const expiresAt = new Date(Date.now() + expiryMs).toISOString();

  transaction(() => {
    run(
      `INSERT INTO verification_sessions (
        id, candidateMatchId, itemId, foundReportId, claimantUserId,
        state, challenges, activeChallengeIndex, attemptCount, maxAttempts,
        verificationScore, verificationStrength, matchedEvidence, conflicts,
        missingEvidence, algorithmVersion, expiresAt, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      sessionId,
      candidateMatchId,
      itemId,
      foundReportId,
      claimantUserId,
      "PENDING_CHALLENGE",
      JSON.stringify(challenges),
      0,
      0,
      maxAttempts,
      0.0,
      "weak",
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify([]),
      VERIFICATION_CONFIG.ALGORITHM_VERSION,
      expiresAt,
      currentTime,
      currentTime
    );
  });

  const row = one<RawVerificationSessionRow>("SELECT * FROM verification_sessions WHERE id=?", sessionId);
  if (!row) throw new Error("Failed to create verification session record.");
  return parseSessionRow(row);
}

/**
 * Retrieves a verification session by primary key.
 */
export async function getSessionById(sessionId: string): Promise<VerificationSession | null> {
  const row = one<RawVerificationSessionRow>("SELECT * FROM verification_sessions WHERE id=?", sessionId);
  return row ? parseSessionRow(row) : null;
}

/**
 * Retrieves the latest active session for a given candidate match.
 */
export async function getActiveSessionForCandidate(candidateMatchId: string): Promise<VerificationSession | null> {
  const row = one<RawVerificationSessionRow>(
    "SELECT * FROM verification_sessions WHERE candidateMatchId=? AND state IN ('PENDING_CHALLENGE', 'VERIFIED') ORDER BY createdAt DESC LIMIT 1",
    candidateMatchId
  );
  return row ? parseSessionRow(row) : null;
}

/**
 * Updates session outcome and increments attempt counters.
 */
export async function updateSessionRecord(
  sessionId: string,
  updates: {
    state: VerificationState;
    attemptCount: number;
    verificationScore: number;
    verificationStrength: VerificationStrength;
    matchedEvidence: string[];
    conflicts: string[];
    missingEvidence: string[];
    activeChallengeIndex?: number;
  }
): Promise<VerificationSession> {
  const currentTime = now();

  transaction(() => {
    run(
      `UPDATE verification_sessions SET
        state=?,
        attemptCount=?,
        verificationScore=?,
        verificationStrength=?,
        matchedEvidence=?,
        conflicts=?,
        missingEvidence=?,
        activeChallengeIndex=COALESCE(?, activeChallengeIndex),
        updatedAt=?
      WHERE id=?`,
      updates.state,
      updates.attemptCount,
      updates.verificationScore,
      updates.verificationStrength,
      JSON.stringify(updates.matchedEvidence),
      JSON.stringify(updates.conflicts),
      JSON.stringify(updates.missingEvidence),
      updates.activeChallengeIndex ?? null,
      currentTime,
      sessionId
    );
  });

  const row = one<RawVerificationSessionRow>("SELECT * FROM verification_sessions WHERE id=?", sessionId);
  if (!row) throw new Error(`Verification session #${sessionId} not found.`);
  return parseSessionRow(row);
}

/**
 * Records an immutable audit log entry for a verification attempt.
 * Also synchronizes with legacy blind_attempts and verification_evidence tables.
 */
export async function recordAuditAndEvidence(
  session: VerificationSession,
  challenge: VerificationChallenge,
  ownerAnswer: string,
  state: VerificationState,
  score: number,
  ip = ""
): Promise<void> {
  const auditId = `vaud-${id("").slice(0, 16)}`;
  const currentTime = now();
  const isAccepted = state === "VERIFIED" ? 1 : 0;

  transaction(() => {
    // 1. Write to verification_audits
    run(
      `INSERT INTO verification_audits (
        id, sessionId, candidateMatchId, claimantUserId, attemptNumber,
        challengeType, result, score, matchedCategories, ip,
        algorithmVersion, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      auditId,
      session.id,
      session.candidateMatchId,
      session.claimantUserId,
      session.attemptCount,
      challenge.type,
      state,
      score,
      JSON.stringify(session.matchedEvidence),
      ip,
      VERIFICATION_CONFIG.ALGORITHM_VERSION,
      currentTime
    );

    // 2. Legacy blind_attempts synchronization
    run(
      "INSERT INTO blind_attempts (id, userId, reportId, accepted, createdAt) VALUES (?,?,?,?,?)",
      id("attempt"),
      session.claimantUserId,
      session.foundReportId,
      isAccepted,
      currentTime
    );

    // 3. Phase 1 verification_evidence synchronization
    run(
      `INSERT INTO verification_evidence (
        id, candidateMatchId, itemId, question, ownerAnswer,
        expectedEvidence, result, evidenceSource, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      id("evid"),
      session.candidateMatchId,
      session.itemId,
      challenge.question,
      ownerAnswer,
      challenge.internalExpectedClue || "protected_owner_evidence",
      state === "VERIFIED" ? "passed" : state === "REQUIRES_MANUAL_REVIEW" ? "pending" : "failed",
      "owner_verification",
      currentTime
    );

    // 4. Synchronize candidate_matches table status if verified or failed
    if (state === "VERIFIED") {
      run("UPDATE candidate_matches SET status='verified', updatedAt=? WHERE id=?", currentTime, session.candidateMatchId);
    } else if (state === "REQUIRES_MANUAL_REVIEW") {
      run("UPDATE candidate_matches SET status='verification_required', updatedAt=? WHERE id=?", currentTime, session.candidateMatchId);
    }
  });
}
