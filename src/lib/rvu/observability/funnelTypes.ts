/**
 * KHOJ — Phase 10: Funnel & Observability Types
 * Strict typing for pipeline tracking, metrics calculation, and usability feedback.
 */

export type PipelineStage =
  | 'FOUND_REPORT'
  | 'FINGERPRINT_EXTRACTION'
  | 'EMBEDDING_GENERATION'
  | 'VECTOR_RETRIEVAL'
  | 'CANDIDATE_GENERATION'
  | 'RERANKING'
  | 'VERIFICATION_STARTED'
  | 'VERIFIED'
  | 'HANDOVER_STARTED'
  | 'RETURNED'
  | 'REWARD_OFFERED'
  | 'REWARD_COMPLETED'
  | 'REWARD_SKIPPED';

export type PipelineStatus = 'success' | 'failed' | 'partial' | 'ambiguous' | 'skipped';

export interface PipelineEvent {
  id: string;
  reportId: string;
  stage: PipelineStage;
  status: PipelineStatus;
  stageDurationMs: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FunnelMetrics {
  foundCount: number;
  fingerprintCount: number;
  candidateCount: number;
  verificationStartedCount: number;
  verifiedCount: number;
  handoverCount: number;
  returnedCount: number;
  rewardOfferedCount: number;
  rewardCompletedCount: number;
  rewardSkippedCount: number;
  rates: {
    foundToFingerprintRate: number;
    fingerprintToCandidateRate: number;
    candidateToVerificationRate: number;
    verificationSuccessRate: number;
    verifiedToHandoverRate: number;
    handoverToReturnedRate: number;
    successfulRecoveryRate: number; // Primary Metric: returnedCount / foundCount
  };
}

export interface RecoveryFeedback {
  id: string;
  reportId: string;
  userId: string;
  actorRole: 'owner' | 'finder';
  easyRating: 'yes' | 'mostly' | 'no';
  confusionNote: string;
  createdAt: string;
}

export interface OperationalStaffOverview {
  unresolvedFoundCount: number;
  ambiguousCandidateCount: number;
  verificationReviewQueueCount: number;
  disputedHandoverCount: number;
  disputedRewardCount: number;
  failedProcessingCount: number;
  funnel: FunnelMetrics;
  recentDisputes: Array<{
    reportId: string;
    itemTitle: string;
    disputeType: string;
    reason: string;
    createdAt: string;
  }>;
}
