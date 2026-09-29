/**
 * KHOJ — Phase 7: Blind Ownership Verification Types
 * Strict typing for blind verification sessions, challenge generation, answer evaluation, and audits.
 */

export type VerificationChallengeType =
  | 'distinctive_damage'
  | 'engraving'
  | 'customization'
  | 'unique_accessory'
  | 'distinctive_marking'
  | 'case_or_attachment'
  | 'general_distinctive';

export type VerificationState =
  | 'PENDING_CHALLENGE'
  | 'VERIFIED'
  | 'VERIFICATION_FAILED'
  | 'REQUIRES_MANUAL_REVIEW'
  | 'EXPIRED'
  | 'LOCKED';

export type VerificationStrength =
  | 'strong'
  | 'moderate'
  | 'weak'
  | 'contradictory';

export interface VerificationChallenge {
  id: string;
  type: VerificationChallengeType;
  question: string;
  category: string;
  // Kept server-side only; NEVER exposed over client/finder APIs!
  internalExpectedClue?: string;
}

export interface VerificationSession {
  id: string;
  candidateMatchId: string;
  itemId: string;
  foundReportId: string;
  claimantUserId: string;
  state: VerificationState;
  challenges: VerificationChallenge[];
  activeChallengeIndex: number;
  attemptCount: number;
  maxAttempts: number;
  verificationScore: number;
  verificationStrength: VerificationStrength;
  matchedEvidence: string[];
  conflicts: string[];
  missingEvidence: string[];
  algorithmVersion: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Public/claimant-safe view of a verification challenge.
 * Strips all expected clues, scores, and candidate rankings.
 */
export interface ClientChallengeView {
  sessionId: string;
  candidateMatchId: string;
  status: 'potential_match_found';
  question: string;
  challengeIndex: number;
  totalChallenges: number;
  attemptNumber: number;
  maxAttempts: number;
  expiresAt: string;
}

/**
 * Minimal next-step response after submitting a verification answer.
 * Preserves privacy invariants by never leaking scores, scorecards, or finder details.
 */
export interface ClientVerificationResponse {
  verified: boolean;
  verificationSessionId: string;
  state: VerificationState;
  attemptNumber: number;
  remainingAttempts: number;
  nextStep?: 'RECOVERY_PENDING' | 'MANUAL_REVIEW_QUEUED' | 'RETRY_ALLOWED' | 'SESSION_TERMINATED';
  message: string;
}

/**
 * Internal answer evaluation outcome.
 */
export interface AnswerEvaluationResult {
  verificationScore: number;
  verificationStrength: VerificationStrength;
  matchedFeatures: string[];
  conflicts: string[];
  missingEvidence: string[];
  isGenericOnly: boolean;
  isUnknownIncomplete: boolean;
  isContradictory: boolean;
  explanation: string;
}

/**
 * Security audit record persisted per attempt.
 */
export interface VerificationAuditRecord {
  id: string;
  sessionId: string;
  candidateMatchId: string;
  claimantUserId: string;
  attemptNumber: number;
  challengeType: string;
  result: VerificationState;
  score: number;
  matchedCategories: string[];
  ip: string;
  algorithmVersion: string;
  createdAt: string;
}
