/**
 * KHOJ — Phase 11: Real RVU Controlled Pilot Types
 * Strict typing for Ground Truth, Failure Taxonomy, Incidents, and Real Pilot Metrics.
 */

export type PilotCaseClassification =
  | 'RETURNED'
  | 'UNRETURNED'
  | 'NO_MATCH'
  | 'MANUAL_REVIEW'
  | 'DISPUTED'
  | 'UNKNOWN';

export type PilotFailureStage =
  | 'NONE'
  | 'NO_FINDER'
  | 'NO_MATCH'
  | 'RETRIEVAL_FAILURE'
  | 'RERANKING_FAILURE'
  | 'VERIFICATION_FAILURE'
  | 'OWNER_UNAVAILABLE'
  | 'FINDER_UNAVAILABLE'
  | 'HANDOVER_FAILURE'
  | 'DISPUTE'
  | 'DATA_QUALITY'
  | 'OTHER';

export type IncidentType =
  | 'wrong_item'
  | 'suspicious_behavior'
  | 'safety_concern'
  | 'impersonation'
  | 'disputed_ownership'
  | 'handover_dispute'
  | 'reward_dispute';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface PilotGroundTruth {
  id: string;
  reportId: string;
  trueOwnerId: string | null;
  trueItemId: string | null;
  hasRealMatch: boolean;
  candidateRank: number | null;
  verificationResult: 'passed' | 'failed' | 'generic_rejected' | 'unverified' | 'skipped';
  handoverResult: 'completed' | 'cancelled' | 'disputed' | 'uninitiated';
  returnedResult: 'RETURNED' | 'UNRETURNED';
  caseClassification: PilotCaseClassification;
  failureStage: PilotFailureStage;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PilotIncident {
  id: string;
  reportId: string | null;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  reportedBy: string;
  details: string;
  status: IncidentStatus;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PilotEvaluationMetrics {
  totalParticipants: number;
  totalItemsRegistered: number;
  totalFoundReports: number;
  totalLostReports: number;
  candidatesGeneratedCount: number;
  verificationsStartedCount: number;
  verificationsPassedCount: number;
  handoversInitiatedCount: number;
  returnedCount: number;

  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  recallAt10: number;
  recallAt20: number;

  falsePositiveRate: number;
  falseNegativeRate: number;
  ambiguityRate: number;
  verificationSuccessRate: number;
  manualReviewRate: number;
  successfulRecoveryRate: number; // Primary Metric

  timeMetricsMinutes: {
    medianFoundToCandidate: number;
    medianCandidateToVerification: number;
    medianVerificationToHandover: number;
    medianFoundToReturned: number;
  };

  categoryBreakdown: Record<string, { total: number; returned: number; recoveryRate: number }>;
  sameModelSeparation: {
    totalSameModelCases: number;
    top1SeparatedCount: number;
    top3SeparatedCount: number;
    ambiguousCount: number;
  };
  ownerWithoutPhotoMetrics: {
    totalCases: number;
    retrievedCount: number;
    verifiedCount: number;
    returnedCount: number;
    recoveryRate: number;
  };
  imageQualityMetrics: Record<'good' | 'acceptable' | 'poor' | 'unusable', { total: number; recovered: number; recoveryRate: number }>;
  failureTaxonomy: Record<PilotFailureStage, number>;
}

export interface MetricComparisonRow {
  metric: string;
  simulatedPhase10: string;
  realPilotPhase11: string;
  delta: string;
  operationalAnalysis: string;
}
