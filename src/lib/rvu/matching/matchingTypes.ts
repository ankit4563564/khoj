/**
 * KHOJ — Matching Engine Types (Phase 4)
 * Strongly typed structures for deterministic candidate scoring,
 * attribute comparison, distinctive-feature corroboration, and confidence gating.
 *
 * CRITICAL PRODUCT PRINCIPLE:
 * A match is a candidate, NOT a verdict.
 * The engine does NOT decide ownership. It computes plausible candidate matches
 * from structured evidence.
 */

import { CandidateStatus, ConfidenceTier } from "../types";

export type ComparisonStatus = "match" | "compatible" | "conflict" | "unknown";

export interface AttributeComparisonResult {
  attribute: string;
  ownerValue: string | null;
  foundValue: string | null;
  status: ComparisonStatus;
  score: number; // 0.0 to 1.0
  isConflict: boolean;
  isMissing: boolean;
  notes?: string;
}

export interface DistinctiveComparisonResult {
  ownerFeature: string;
  foundFeature?: string | null;
  similarity: number; // 0.0 to 1.0
  status: "match" | "partial" | "missing_in_found" | "conflict";
  featureDescription: string;
  locationCompatibility?: boolean;
}

export interface ContextComparisonResult {
  locationMatch: boolean;
  locationScore: number; // 0.0 to 1.0
  timeMatch: boolean;
  timeScore: number; // 0.0 to 1.0
  registrationTimingScore: number; // 0.0 to 1.0
  notes: string[];
}

export type CandidateState =
  | "HIGH_CONFIDENCE_CANDIDATE"
  | "REQUIRES_MANUAL_REVIEW"
  | "LOW_CONFIDENCE_CANDIDATE";

export interface DetailedCandidateScorecard {
  itemId: string;
  foundReportId: string;
  candidateScore: number; // 0.0 to 1.0 composite candidate score
  scaledScore: number; // 0 to 100 integer for Phase 1 candidate_matches table

  components: {
    distinctiveFeatureSimilarity: number; // Weight: 0.50
    genericAttributeCompatibility: number; // Weight: 0.25
    locationTimeCompatibility: number; // Weight: 0.15
    registrationLostTiming: number; // Weight: 0.10
  };

  evidence: {
    matchingDistinctiveFeatures: string[];
    matchingGenericAttributes: string[];
    contextMatches: string[];
  };

  conflicts: string[];
  missingEvidence: string[];

  candidateState: CandidateState;
  confidenceTier: ConfidenceTier;
  candidateStatus: CandidateStatus;
  isAmbiguous: boolean;
  explanation: string;
}

export interface MatchFilterOptions {
  allowUnmarkedLost?: boolean; // Default false (only considers items marked lost)
  categoryFilter?: boolean; // Default true (discards obvious category mismatches)
  minReviewScore?: number; // Default 0.50
  highConfidenceScore?: number; // Default 0.80
  ambiguityMargin?: number; // Default 0.08
}
