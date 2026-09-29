/**
 * KHOJ — Phase 6: Multimodal Candidate Reranking Types
 * Defines data structures, scorecards, and evidence breakdowns for multimodal reranking.
 */

export type RerankCandidateState =
  | "HIGH_CONFIDENCE_CANDIDATE"
  | "REQUIRES_MANUAL_REVIEW"
  | "LOW_CONFIDENCE_CANDIDATE";

export interface VectorSignalProvenance {
  similarity: number;
  model: string;
  version: string;
  modality: string;
}

export interface MultimodalVectorEvidence {
  foundImage?: VectorSignalProvenance | null;
  foundText?: VectorSignalProvenance | null;
  ownerImage?: VectorSignalProvenance | null;
  ownerText?: VectorSignalProvenance | null;
  compositeSimilarity: number;
}

export interface RerankScoreComponents {
  distinctivePhysicalEvidence: number;        // Weight: 0.35
  structuredAttributeCompatibility: number;   // Weight: 0.20
  vectorRetrievalSimilarity: number;          // Weight: 0.25
  contextualCompatibility: number;            // Weight: 0.10
  temporalCompatibility: number;              // Weight: 0.10
}

export interface MatchingEvidenceBreakdown {
  distinctive: string[];
  generic: string[];
  context: string[];
  temporal: string[];
}

export interface RerankedScorecard {
  candidateId: string;
  foundReportId: string;
  itemId: string;
  
  // Explicitly separate score channels
  rerankScore: number;                        // Phase 6 multimodal rerank score (0.00 - 1.00)
  scaledScore: number;                        // 0 - 100 for display
  baselineScore: number;                      // Phase 4 baseline deterministic score (0.00 - 1.00)
  vectorRetrievalSignal: number;              // Phase 5 raw vector similarity (-1.00 - 1.00)
  
  components: RerankScoreComponents;
  vectorEvidence: MultimodalVectorEvidence;
  matchingEvidence: MatchingEvidenceBreakdown;
  conflicts: string[];
  missingEvidence: string[];
  
  candidateState: RerankCandidateState;
  confidenceTier: "high" | "medium" | "low";
  candidateStatus: "candidate" | "verification_required";
  isAmbiguous: boolean;
  explanation: string;
  
  rerankerVersion: string;
  scoringConfigVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface RerankResult {
  foundReportId: string;
  candidates: RerankedScorecard[];
  topCandidate: RerankedScorecard | null;
  isAmbiguous: boolean;
  totalEvaluated: number;
  notes: string[];
}
