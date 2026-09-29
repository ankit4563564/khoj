/**
 * KHOJ — Multimodal Candidate Reranking Scorer
 * Implements the 5-component hypothesis formula with safety caps and explainability.
 *
 * FORMULA:
 * Distinctive Physical Evidence        x 0.35
 * Structured Attribute Compatibility   x 0.20
 * Vector Retrieval Similarity          x 0.25
 * Contextual Compatibility             x 0.10
 * Temporal Compatibility               x 0.10
 * Total = 1.00
 */

import type { ItemFingerprint, FoundFingerprint, ProtectedItem, Report } from "@/lib/rvu/types";
import { compareStructuredAttributes } from "./computeAttributeEvidence";
import { compareContextAndTemporalEvidence } from "./computeContextTemporalEvidence";
import { compareDistinctivePhysicalFeatures } from "./computeDistinctiveEvidence";
import { evaluateMultimodalVectorEvidence } from "./computeVectorEvidence";
import { RERANKING_CONFIG } from "./rerankingConfig";
import type {
  RerankCandidateState,
  RerankedScorecard,
  RerankScoreComponents,
} from "./rerankingTypes";

export interface ScoreCandidateRerankInput {
  ownerFingerprint: ItemFingerprint;
  foundFingerprint: FoundFingerprint;
  ownerItem: ProtectedItem;
  foundReport: Report;
  ownerLostReport?: Report | null;
  rawVectorSimilarity?: number | null;
  baselinePhase4Score?: number;
}

export function scoreCandidateRerank(
  input: ScoreCandidateRerankInput
): RerankedScorecard {
  const {
    ownerFingerprint,
    foundFingerprint,
    ownerItem,
    foundReport,
    ownerLostReport,
    rawVectorSimilarity,
    baselinePhase4Score = 0.0,
  } = input;

  // 1. Evaluate Distinctive Physical Features (Weight: 0.35)
  const distinctiveResult = compareDistinctivePhysicalFeatures(
    ownerFingerprint.distinctiveFeatures || [],
    foundFingerprint.distinctiveFeatures || []
  );

  // 2. Evaluate Structured Attributes (Weight: 0.20)
  const attributeResult = compareStructuredAttributes({
    ownerCategory: ownerFingerprint.category || ownerItem.category,
    foundCategory: foundFingerprint.category || foundReport.category,
    ownerBrand: ownerFingerprint.brand || ownerItem.brand,
    foundBrand: foundFingerprint.brand || foundReport.brand,
    ownerModel: ownerFingerprint.model,
    foundModel: foundFingerprint.model,
    ownerColor: ownerFingerprint.color || ownerItem.color,
    foundColor: foundFingerprint.color || foundReport.color,
    ownerMaterial: ownerFingerprint.material || undefined,
    foundMaterial: foundFingerprint.material || undefined,
  });

  // 3. Evaluate Multimodal Vector Similarity (Weight: 0.25)
  const vectorResult = evaluateMultimodalVectorEvidence({
    rawCosineSimilarity: rawVectorSimilarity,
  });

  // 4. Evaluate Context & Temporal Timeline (Weight: 0.10 + 0.10)
  const contextTemporalResult = compareContextAndTemporalEvidence({
    ownerLastSeenLocation: ownerLostReport?.location,
    foundLocation: foundFingerprint.foundLocation || foundReport.location,
    lostAt: ownerLostReport?.date || ownerItem.createdAt,
    foundAt: foundFingerprint.foundAt || foundReport.date,
    registeredAt: ownerItem.createdAt,
  });

  // Consolidate evidence and conflicts
  const conflicts = [
    ...distinctiveResult.conflicts,
    ...attributeResult.conflicts,
    ...contextTemporalResult.conflicts,
  ];

  const missingEvidence = [
    ...distinctiveResult.missingEvidence,
    ...attributeResult.missingEvidence,
    ...contextTemporalResult.missingEvidence,
  ];

  // Component breakdown
  const components: RerankScoreComponents = {
    distinctivePhysicalEvidence: distinctiveResult.score,
    structuredAttributeCompatibility: attributeResult.score,
    vectorRetrievalSimilarity: vectorResult.score,
    contextualCompatibility: contextTemporalResult.contextScore,
    temporalCompatibility: contextTemporalResult.temporalScore,
  };

  // Compute weighted formula
  const w = RERANKING_CONFIG.weights;
  let rawRerankScore =
    components.distinctivePhysicalEvidence * w.distinctivePhysicalEvidence +
    components.structuredAttributeCompatibility * w.structuredAttributeCompatibility +
    components.vectorRetrievalSimilarity * w.vectorRetrievalSimilarity +
    components.contextualCompatibility * w.contextualCompatibility +
    components.temporalCompatibility * w.temporalCompatibility;

  // SAFETY CAP 1: Generic attributes alone must not overpower distinctive physical marks
  if (components.distinctivePhysicalEvidence === 0.0) {
    rawRerankScore = Math.min(rawRerankScore, RERANKING_CONFIG.caps.genericOnlyCap);
  }

  // SAFETY CAP 2: Hard contradictions (brand, category, color, motif) strictly capped
  if (conflicts.length > 0) {
    rawRerankScore = Math.min(rawRerankScore, RERANKING_CONFIG.caps.hardConflictCap);
  }

  const finalScore = Number(Math.min(1.0, Math.max(0.0, rawRerankScore)).toFixed(2));
  const scaledScore = Math.round(finalScore * 100);

  // Confidence Gating
  let candidateState: RerankCandidateState = "LOW_CONFIDENCE_CANDIDATE";
  let confidenceTier: "high" | "medium" | "low" = "low";
  let candidateStatus: "candidate" | "verification_required" = "candidate";

  if (
    finalScore >= RERANKING_CONFIG.thresholds.highConfidence &&
    components.distinctivePhysicalEvidence > 0 &&
    conflicts.length === 0
  ) {
    candidateState = "HIGH_CONFIDENCE_CANDIDATE";
    confidenceTier = "high";
    candidateStatus = "verification_required"; // Ready for blind verification in Phase 7 (never auto-verified!)
  } else if (finalScore >= RERANKING_CONFIG.thresholds.manualReview) {
    candidateState = "REQUIRES_MANUAL_REVIEW";
    confidenceTier = "medium";
    candidateStatus = "candidate";
  } else {
    candidateState = "LOW_CONFIDENCE_CANDIDATE";
    confidenceTier = "low";
    candidateStatus = "candidate";
  }

  // Generate Human-Readable Internal Explanation
  let explanation = "";
  if (candidateState === "HIGH_CONFIDENCE_CANDIDATE") {
    explanation = `High confidence candidate (${finalScore}): Distinctive physical evidence aligns (${distinctiveResult.matchedFeatures.join(", ")}). Attributes and semantic vectors are compatible.`;
  } else if (conflicts.length > 0) {
    explanation = `Low confidence candidate (${finalScore}): Contradictory evidence detected (${conflicts.join("; ")}).`;
  } else if (components.distinctivePhysicalEvidence === 0.0) {
    explanation = `Requires manual review (${finalScore}): Generic attributes and vector similarity match, but no corroborating distinctive physical evidence is visible.`;
  } else {
    explanation = `Candidate under review (${finalScore}): Partial physical and attribute overlap.`;
  }

  return {
    candidateId: `cand-rerank-${ownerItem.id}`,
    foundReportId: foundReport.id,
    itemId: ownerItem.id,
    rerankScore: finalScore,
    scaledScore,
    baselineScore: baselinePhase4Score,
    vectorRetrievalSignal: vectorResult.rawSimilarity,
    components,
    vectorEvidence: vectorResult.vectorEvidence,
    matchingEvidence: {
      distinctive: distinctiveResult.matchedFeatures,
      generic: attributeResult.matchedAttributes,
      context: contextTemporalResult.contextMatches,
      temporal: contextTemporalResult.temporalMatches,
    },
    conflicts,
    missingEvidence,
    candidateState,
    confidenceTier,
    candidateStatus,
    isAmbiguous: false,
    explanation,
    rerankerVersion: RERANKING_CONFIG.rerankerVersion,
    scoringConfigVersion: RERANKING_CONFIG.scoringConfigVersion,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
