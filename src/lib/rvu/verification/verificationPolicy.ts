/**
 * KHOJ — Phase 7: Verification Policy Engine
 * Deterministic rules that adjudicate ownership verification state transitions.
 * 
 * CORE PRINCIPLE:
 * VERIFIED requires positive alignment of protected private physical clues.
 * Generic matching can NEVER yield VERIFIED status.
 */

import type { CandidateScoreCard, ItemFingerprint, ProtectedItem } from "@/lib/rvu/types";
import type { AnswerEvaluationResult, VerificationSession, VerificationState } from "./verificationTypes";
import { VERIFICATION_CONFIG } from "./verificationConfig";

export interface PolicyDecision {
  nextState: VerificationState;
  verified: boolean;
  score: number;
  remainingAttempts: number;
  clientMessage: string;
  nextStep?: "RECOVERY_PENDING" | "MANUAL_REVIEW_QUEUED" | "RETRY_ALLOWED" | "SESSION_TERMINATED";
}

/**
 * Checks if a candidate match is eligible to begin a verification session.
 */
export function isCandidateEligibleForVerification(
  candidate: CandidateScoreCard,
  item: ProtectedItem
): { eligible: boolean; reason?: string } {
  // Candidate must exist and belong to the item
  if (!candidate || candidate.itemId !== item.id) {
    return { eligible: false, reason: "Candidate record does not match registered item." };
  }

  // Eligible statuses: 'verification_required', 'candidate', 'flagged' (with review)
  const allowedStatuses = ["verification_required", "candidate", "flagged"];
  if (!allowedStatuses.includes(candidate.status)) {
    return { eligible: false, reason: `Candidate is not eligible in current status '${candidate.status}'.` };
  }

  return { eligible: true };
}

/**
 * Evaluates session state transition based on the latest answer evaluation.
 */
export function determineSessionOutcome(
  session: VerificationSession,
  evalResult: AnswerEvaluationResult,
  item: ProtectedItem,
  fingerprint?: ItemFingerprint | null
): PolicyDecision {
  const newAttemptCount = session.attemptCount + 1;
  const remainingAttempts = Math.max(0, session.maxAttempts - newAttemptCount);
  const nowTime = new Date().toISOString();

  // 1. Expiration check
  if (nowTime > session.expiresAt) {
    return {
      nextState: "EXPIRED",
      verified: false,
      score: 0.0,
      remainingAttempts: 0,
      clientMessage: "Verification session has expired. Please contact support or restart if allowed.",
      nextStep: "SESSION_TERMINATED",
    };
  }

  // 2. Generic-only item safety rule
  const hasDistinctiveFeatures =
    (Array.isArray(fingerprint?.distinctiveFeatures) && fingerprint!.distinctiveFeatures.length > 0) ||
    (item.privateDetail && item.privateDetail.trim().length > 0);

  if (!hasDistinctiveFeatures) {
    // Cannot be auto-verified
    return {
      nextState: "REQUIRES_MANUAL_REVIEW",
      verified: false,
      score: evalResult.verificationScore,
      remainingAttempts,
      clientMessage: "Your item details have been recorded. A campus administrator will review your claim.",
      nextStep: "MANUAL_REVIEW_QUEUED",
    };
  }

  // 3. Contradiction rule
  if (evalResult.isContradictory) {
    if (remainingAttempts === 0) {
      return {
        nextState: "VERIFICATION_FAILED",
        verified: false,
        score: evalResult.verificationScore,
        remainingAttempts: 0,
        clientMessage: "We could not verify ownership from that answer. Attempts exhausted.",
        nextStep: "SESSION_TERMINATED",
      };
    }

    return {
      nextState: "PENDING_CHALLENGE",
      verified: false,
      score: evalResult.verificationScore,
      remainingAttempts,
      clientMessage: "We could not verify ownership from that answer. You can try again.",
      nextStep: "RETRY_ALLOWED",
    };
  }

  // 4. Incomplete / Uncertainty rule ("I don't remember")
  if (evalResult.isUnknownIncomplete) {
    return {
      nextState: "REQUIRES_MANUAL_REVIEW",
      verified: false,
      score: evalResult.verificationScore,
      remainingAttempts,
      clientMessage: "We noted your response. A campus administrator will review additional proof options with you.",
      nextStep: "MANUAL_REVIEW_QUEUED",
    };
  }

  // 5. Generic-only answer on distinctive item
  if (evalResult.isGenericOnly) {
    if (remainingAttempts === 0) {
      return {
        nextState: "REQUIRES_MANUAL_REVIEW",
        verified: false,
        score: evalResult.verificationScore,
        remainingAttempts: 0,
        clientMessage: "General item details alone are insufficient for automated verification. Sent for manual review.",
        nextStep: "MANUAL_REVIEW_QUEUED",
      };
    }

    return {
      nextState: "PENDING_CHALLENGE",
      verified: false,
      score: evalResult.verificationScore,
      remainingAttempts,
      clientMessage: "We could not verify ownership from that answer. You can try again.",
      nextStep: "RETRY_ALLOWED",
    };
  }

  // 6. Positive Verification Check
  if (
    evalResult.verificationScore >= VERIFICATION_CONFIG.MIN_VERIFIED_SCORE &&
    evalResult.matchedFeatures.length > 0 &&
    evalResult.conflicts.length === 0
  ) {
    return {
      nextState: "VERIFIED",
      verified: true,
      score: evalResult.verificationScore,
      remainingAttempts,
      clientMessage: "Ownership verified! Please proceed to schedule safe item recovery.",
      nextStep: "RECOVERY_PENDING",
    };
  }

  // 7. Partial match / Ambiguous match
  if (evalResult.verificationScore >= VERIFICATION_CONFIG.MANUAL_REVIEW_THRESHOLD) {
    if (remainingAttempts > 0) {
      return {
        nextState: "PENDING_CHALLENGE",
        verified: false,
        score: evalResult.verificationScore,
        remainingAttempts,
        clientMessage: "We could not verify ownership from that answer. You can try again.",
        nextStep: "RETRY_ALLOWED",
      };
    }

    return {
      nextState: "REQUIRES_MANUAL_REVIEW",
      verified: false,
      score: evalResult.verificationScore,
      remainingAttempts: 0,
      clientMessage: "Verification requires manual staff review.",
      nextStep: "MANUAL_REVIEW_QUEUED",
    };
  }

  // 8. Low score / Insufficient match
  if (remainingAttempts === 0) {
    return {
      nextState: "VERIFICATION_FAILED",
      verified: false,
      score: evalResult.verificationScore,
      remainingAttempts: 0,
      clientMessage: "We could not verify ownership from that answer. Attempts exhausted.",
      nextStep: "SESSION_TERMINATED",
    };
  }

  return {
    nextState: "PENDING_CHALLENGE",
    verified: false,
    score: evalResult.verificationScore,
    remainingAttempts,
    clientMessage: "We could not verify ownership from that answer. You can try again.",
    nextStep: "RETRY_ALLOWED",
  };
}
