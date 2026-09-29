/**
 * KHOJ — Phase 6: Multimodal Reranking Configuration
 * Engineering hypothesis weights, thresholds, and safety bounds.
 *
 * CRITICAL NOTE:
 * These weights are engineering hypotheses, NOT calibrated probabilities.
 * They will be recalibrated using real KHOJ campus pilot feedback.
 */

export const RERANKING_CONFIG = {
  rerankerVersion: "v1" as const,
  scoringConfigVersion: "v1" as const,

  // Hypothesized component weights (Sum = 1.00)
  weights: {
    distinctivePhysicalEvidence: 0.35,
    structuredAttributeCompatibility: 0.20,
    vectorRetrievalSimilarity: 0.25,
    contextualCompatibility: 0.10,
    temporalCompatibility: 0.10,
  },

  // Confidence gating thresholds
  thresholds: {
    highConfidence: 0.80,       // >= 0.80 requires corroborating distinctive physical marks
    manualReview: 0.50,         // 0.50 - 0.79 or ambiguous pairs
    lowConfidence: 0.50,        // < 0.50
  },

  // Ambiguity safety rule
  ambiguity: {
    minScoreThreshold: 0.65,    // Candidates above this score are checked for close rivals
    scoreMargin: 0.08,          // If top - second < 0.08, flag AMBIGUOUS and downgrade to REQUIRES_MANUAL_REVIEW
  },

  // Safety caps
  caps: {
    genericOnlyCap: 0.70,       // Items with 0 distinctive evidence cannot exceed 0.70
    hardConflictCap: 0.40,      // Contradictory brands, categories, or colors capped at 0.40
  },
};
