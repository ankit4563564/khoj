/**
 * KHOJ — Phase 7: Verification Service
 * Orchestrates the blind verification workflow from candidate match to ownership challenge adjudication.
 * 
 * CORE ARCHITECTURAL BOUNDARY:
 * Blind verification asks: "Prove that you know something private about it."
 * Only upon successful verification may the user proceed to recovery (Phase 8+).
 */

import { one } from "@/lib/rvu/db";
import { rateLimit, HttpError } from "@/lib/rvu/auth";
import type { CandidateScoreCard, ItemFingerprint, ProtectedItem } from "@/lib/rvu/types";
import { getItemFingerprintByItemId } from "@/lib/rvu/fingerprints/itemFingerprintRepository";
import { getCandidateMatchById } from "@/lib/rvu/fingerprints/candidateRepository";
import { generateVerificationChallenges } from "./challengeGenerator";
import { evaluateVerificationAnswer } from "./answerEvaluator";
import { determineSessionOutcome, isCandidateEligibleForVerification } from "./verificationPolicy";
import {
  createSessionRecord,
  getActiveSessionForCandidate,
  getSessionById,
  recordAuditAndEvidence,
  updateSessionRecord,
} from "./verificationSessionRepository";
import type {
  ClientChallengeView,
  ClientVerificationResponse,
  VerificationSession,
} from "./verificationTypes";
import { VERIFICATION_CONFIG } from "./verificationConfig";

/**
 * Sanitizes a verification session into a privacy-safe challenge view for the claimant.
 * NEVER leaks the expected answer, candidate scorecard, found image, or finder details.
 */
export function formatClientChallenge(session: VerificationSession): ClientChallengeView {
  const currentChallenge = session.challenges[session.activeChallengeIndex] || session.challenges[0];
  return {
    sessionId: session.id,
    candidateMatchId: session.candidateMatchId,
    status: "potential_match_found",
    question: currentChallenge ? currentChallenge.question : "Describe a distinctive feature of your item.",
    challengeIndex: session.activeChallengeIndex + 1,
    totalChallenges: session.challenges.length,
    attemptNumber: session.attemptCount + 1,
    maxAttempts: session.maxAttempts,
    expiresAt: session.expiresAt,
  };
}

/**
 * Starts a blind verification session for an eligible candidate match.
 */
export async function startVerificationSession(
  candidateMatchId: string,
  requestingUserId: string,
  ip = ""
): Promise<ClientChallengeView> {
  if (!requestingUserId) {
    throw new HttpError(401, "Authentication required to initiate verification.");
  }

  // Rate limiting to prevent candidate probing
  rateLimit(`verif-start:${requestingUserId}`, VERIFICATION_CONFIG.RATE_LIMIT_MAX_REQUESTS, VERIFICATION_CONFIG.RATE_LIMIT_WINDOW_SECONDS);

  // Retrieve candidate scorecard
  const candidate = await getCandidateMatchById(candidateMatchId, requestingUserId, false);
  if (!candidate) {
    throw new HttpError(404, "Candidate match not found or you are not authorized to view it.");
  }

  // Retrieve protected item
  const item = await one<ProtectedItem>("SELECT * FROM protected_items WHERE id=?", candidate.itemId);
  if (!item) {
    throw new HttpError(404, "Protected item record not found.");
  }

  // Ownership verification check
  if (item.userId !== requestingUserId) {
    throw new HttpError(403, "You can only initiate ownership verification for your own registered items.");
  }

  // Eligibility check
  const eligibility = isCandidateEligibleForVerification(candidate, item);
  if (!eligibility.eligible) {
    throw new HttpError(400, eligibility.reason || "Candidate is not eligible for verification.");
  }

  // Check for existing active session
  const existingSession = await getActiveSessionForCandidate(candidateMatchId);
  if (existingSession && new Date().toISOString() <= existingSession.expiresAt) {
    return formatClientChallenge(existingSession);
  }

  // Fetch owner fingerprint if available
  const fingerprint = await getItemFingerprintByItemId(item.id, requestingUserId, false).catch(() => null);

  // Generate private, non-leaking challenges
  const challenges = generateVerificationChallenges(item, fingerprint);

  // Persist session
  const newSession = await createSessionRecord(
    candidate.id,
    item.id,
    candidate.foundReportId,
    requestingUserId,
    challenges
  );

  return formatClientChallenge(newSession);
}

/**
 * Retrieves the current active challenge for a verification session.
 */
export async function getVerificationChallenge(
  sessionId: string,
  requestingUserId: string
): Promise<ClientChallengeView> {
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new HttpError(404, "Verification session not found.");
  }

  if (session.claimantUserId !== requestingUserId) {
    throw new HttpError(403, "Unauthorized access to verification challenge.");
  }

  if (new Date().toISOString() > session.expiresAt) {
    throw new HttpError(410, "Verification session has expired.");
  }

  return formatClientChallenge(session);
}

/**
 * Submits an answer to a blind ownership challenge.
 */
export async function submitVerificationAnswer(
  sessionId: string,
  rawAnswer: string,
  requestingUserId: string,
  ip = ""
): Promise<ClientVerificationResponse> {
  if (!requestingUserId) {
    throw new HttpError(401, "Authentication required.");
  }

  const answer = (rawAnswer || "").trim();
  if (answer.length === 0) {
    throw new HttpError(400, "Please provide an answer to the verification challenge.");
  }

  // Rate limit submissions per session
  rateLimit(`verif-sub:${requestingUserId}:${sessionId}`, VERIFICATION_CONFIG.RATE_LIMIT_MAX_REQUESTS, VERIFICATION_CONFIG.RATE_LIMIT_WINDOW_SECONDS);

  const session = await getSessionById(sessionId);
  if (!session) {
    throw new HttpError(404, "Verification session not found.");
  }

  if (session.claimantUserId !== requestingUserId) {
    throw new HttpError(403, "Unauthorized: you cannot submit answers for another user's session.");
  }

  // Already verified?
  if (session.state === "VERIFIED") {
    return {
      verified: true,
      verificationSessionId: session.id,
      state: "VERIFIED",
      attemptNumber: session.attemptCount,
      remainingAttempts: Math.max(0, session.maxAttempts - session.attemptCount),
      nextStep: "RECOVERY_PENDING",
      message: "Ownership already verified. Please proceed to recovery.",
    };
  }

  // Expiration check
  if (new Date().toISOString() > session.expiresAt) {
    await updateSessionRecord(session.id, {
      state: "EXPIRED",
      attemptCount: session.attemptCount,
      verificationScore: 0.0,
      verificationStrength: "weak",
      matchedEvidence: session.matchedEvidence,
      conflicts: session.conflicts,
      missingEvidence: session.missingEvidence,
    });

    return {
      verified: false,
      verificationSessionId: session.id,
      state: "EXPIRED",
      attemptNumber: session.attemptCount,
      remainingAttempts: 0,
      nextStep: "SESSION_TERMINATED",
      message: "Verification session has expired.",
    };
  }

  // Max attempts check
  if (session.attemptCount >= session.maxAttempts) {
    return {
      verified: false,
      verificationSessionId: session.id,
      state: "VERIFICATION_FAILED",
      attemptNumber: session.attemptCount,
      remainingAttempts: 0,
      nextStep: "SESSION_TERMINATED",
      message: "Maximum verification attempts reached. Please contact campus staff.",
    };
  }

  // Fetch item and owner fingerprint
  const item = await one<ProtectedItem>("SELECT * FROM protected_items WHERE id=?", session.itemId);
  if (!item) {
    throw new HttpError(404, "Protected item not found.");
  }

  const fingerprint = await getItemFingerprintByItemId(item.id, requestingUserId, false).catch(() => null);

  // Active challenge
  const activeChallenge = session.challenges[session.activeChallengeIndex] || session.challenges[0];

  // Evaluate claimant answer deterministically
  const evalResult = evaluateVerificationAnswer(answer, activeChallenge, item, fingerprint);

  // Determine policy state transition
  const decision = determineSessionOutcome(session, evalResult, item, fingerprint);

  // Update session record
  const updatedAttemptCount = session.attemptCount + 1;
  const updatedMatched = Array.from(new Set([...session.matchedEvidence, ...evalResult.matchedFeatures]));
  const updatedConflicts = Array.from(new Set([...session.conflicts, ...evalResult.conflicts]));
  const updatedMissing = Array.from(new Set([...session.missingEvidence, ...evalResult.missingEvidence]));

  await updateSessionRecord(session.id, {
    state: decision.nextState,
    attemptCount: updatedAttemptCount,
    verificationScore: decision.score,
    verificationStrength: evalResult.verificationStrength,
    matchedEvidence: updatedMatched,
    conflicts: updatedConflicts,
    missingEvidence: updatedMissing,
    activeChallengeIndex:
      decision.nextState === "PENDING_CHALLENGE" && session.activeChallengeIndex + 1 < session.challenges.length
        ? session.activeChallengeIndex + 1
        : session.activeChallengeIndex,
  });

  // Record audit log and synchronize with legacy tables
  await recordAuditAndEvidence(
    session,
    activeChallenge,
    answer,
    decision.nextState,
    decision.score,
    ip
  );

  return {
    verified: decision.verified,
    verificationSessionId: session.id,
    state: decision.nextState,
    attemptNumber: updatedAttemptCount,
    remainingAttempts: decision.remainingAttempts,
    nextStep: decision.nextStep,
    message: decision.clientMessage,
  };
}

/**
 * Staff manual review of an ambiguous or generic claim.
 */
export async function adminReviewVerificationSession(
  sessionId: string,
  approved: boolean,
  staffUserId: string,
  note = ""
): Promise<VerificationSession> {
  const staff = await one<{ id: string; role: string }>("SELECT id, role FROM users WHERE id=?", staffUserId);
  if (!staff || staff.role !== "staff") {
    throw new HttpError(403, "Only authorized staff can perform manual verification reviews.");
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    throw new HttpError(404, "Verification session not found.");
  }

  const newState = approved ? "VERIFIED" : "VERIFICATION_FAILED";
  const updated = await updateSessionRecord(session.id, {
    state: newState,
    attemptCount: session.attemptCount,
    verificationScore: approved ? 1.0 : session.verificationScore,
    verificationStrength: approved ? "strong" : session.verificationStrength,
    matchedEvidence: [...session.matchedEvidence, `Staff review: ${note || (approved ? "Approved" : "Rejected")}`],
    conflicts: session.conflicts,
    missingEvidence: session.missingEvidence,
  });

  return updated;
}
