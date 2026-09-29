/**
 * KHOJ — Candidate Scorecard Generator
 * Implements the baseline matching hypothesis:
 *   Distinctive Feature Similarity × 0.50
 * + Generic Attribute Compatibility × 0.25
 * + Location / Time Compatibility × 0.15
 * + Registration / Lost Timing     × 0.10
 * = Composite Candidate Score (1.00)
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. A MATCH IS A CANDIDATE, NOT A VERDICT.
 * 2. GENERIC ATTRIBUTES NEVER DOMINATE: High scores require distinctive corroboration.
 * 3. EXPLAINABILITY: Scorecards must provide clear human-readable evidence breakdowns.
 * 4. THRESHOLDS: >=0.80 High Confidence, 0.50-0.79 Manual Review, <0.50 Low Confidence.
 */

import { ItemFingerprint, FoundFingerprint, ProtectedItem, Report } from "../types";
import { compareGenericAttributes } from "./compareAttributes";
import { compareDistinctiveFeatures } from "./compareDistinctiveFeatures";
import { compareContext } from "./compareContext";
import { CandidateState, DetailedCandidateScorecard } from "./matchingTypes";

export function generateCandidateScorecard(params: {
  ownerFingerprint: ItemFingerprint;
  foundFingerprint: FoundFingerprint;
  ownerItem?: Partial<ProtectedItem> | null;
  ownerLostReport?: Partial<Report> | null;
  foundReport?: Partial<Report> | null;
}): DetailedCandidateScorecard {
  const { ownerFingerprint: oFp, foundFingerprint: fFp } = params;

  // 1. Generic Attribute Comparison
  const genericComparison = compareGenericAttributes(
    {
      category: oFp.category,
      subcategory: oFp.subcategory,
      brand: oFp.brand,
      model: oFp.model,
      color: oFp.color,
      material: oFp.material,
    },
    {
      category: fFp.category,
      subcategory: fFp.subcategory,
      brand: fFp.brand,
      model: fFp.model,
      color: fFp.color,
      material: fFp.material,
    }
  );

  // 2. Distinctive Feature Comparison (50% Weight)
  const distinctiveComparison = compareDistinctiveFeatures(
    oFp.distinctiveFeatures || [],
    fFp.distinctiveFeatures || [],
    fFp.visibleText || []
  );

  // 3. Contextual Evidence Comparison
  const contextComparison = compareContext({
    ownerLocation: params.ownerLostReport?.location || null,
    foundLocation: fFp.foundLocation || params.foundReport?.location || null,
    ownerLostDate: params.ownerLostReport?.date || null,
    foundDate: fFp.foundAt || params.foundReport?.date || null,
    itemCreatedAt: params.ownerItem?.createdAt || oFp.createdAt,
    foundCreatedAt: params.foundReport?.createdAt || fFp.createdAt,
  });

  // 4. Compute Weighted Candidate Score
  const distWeight = 0.50;
  const genWeight = 0.25;
  const locTimeWeight = 0.15;
  const regWeight = 0.10;

  const rawScore =
    distinctiveComparison.score * distWeight +
    genericComparison.score * genWeight +
    contextComparison.combinedLocationTimeScore * locTimeWeight +
    contextComparison.registrationTimingScore * regWeight;

  let candidateScore = Math.max(0, Math.min(1, Math.round(rawScore * 100) / 100));

  // Consolidate evidence, conflicts, and missing items
  const allConflicts = [
    ...genericComparison.conflicts,
    ...distinctiveComparison.conflicts,
    ...contextComparison.conflicts,
  ];

  const allMissing = [
    ...genericComparison.missingEvidence,
    ...distinctiveComparison.missingEvidence,
    ...contextComparison.missingEvidence,
  ];

  // RULE A: Generic Attributes MUST NEVER dominate!
  // If no distinctive feature was matched, cap the score below the high confidence threshold (0.74 max)
  const hasDistinctiveMatch = distinctiveComparison.matchedFeatures.length > 0;
  if (!hasDistinctiveMatch && candidateScore >= 0.75) {
    candidateScore = 0.72; // Caps generic-only matches at manual review
  }

  // RULE B: Severe penalty if direct hard conflict exists
  if (allConflicts.length > 0) {
    candidateScore = Math.min(candidateScore, 0.45);
  }

  // 5. Confidence Gating
  let candidateState: CandidateState = "LOW_CONFIDENCE_CANDIDATE";
  if (candidateScore >= 0.80) {
    candidateState = "HIGH_CONFIDENCE_CANDIDATE";
  } else if (candidateScore >= 0.50) {
    candidateState = "REQUIRES_MANUAL_REVIEW";
  } else {
    candidateState = "LOW_CONFIDENCE_CANDIDATE";
  }

  // 6. Generate Human-Readable Explanation
  const explanationLines: string[] = [];
  if (candidateState === "HIGH_CONFIDENCE_CANDIDATE") {
    explanationLines.push("Strong candidate match based on structured evidence:");
    if (distinctiveComparison.matchedFeatures.length > 0) {
      explanationLines.push(
        `- Distinctive evidence: ${distinctiveComparison.matchedFeatures.join("; ")}`
      );
    }
    if (genericComparison.matchingAttributes.length > 0) {
      explanationLines.push(
        `- Compatible attributes: ${genericComparison.matchingAttributes.join(", ")}`
      );
    }
    if (contextComparison.contextMatches.length > 0) {
      explanationLines.push(
        `- Context support: ${contextComparison.contextMatches.join("; ")}`
      );
    }
  } else if (candidateState === "REQUIRES_MANUAL_REVIEW") {
    explanationLines.push("Candidate requires staff manual review:");
    if (!hasDistinctiveMatch) {
      explanationLines.push("- Generic attributes match, but distinctive features are missing or unobserved.");
    }
    if (genericComparison.matchingAttributes.length > 0) {
      explanationLines.push(
        `- Observed matches: ${genericComparison.matchingAttributes.join(", ")}`
      );
    }
    if (allMissing.length > 0) {
      explanationLines.push(`- Unconfirmed points: ${allMissing.slice(0, 2).join("; ")}`);
    }
  } else {
    explanationLines.push("Low confidence candidate:");
    if (allConflicts.length > 0) {
      explanationLines.push(`- Contradictory evidence: ${allConflicts.join("; ")}`);
    } else {
      explanationLines.push("- Insufficient attribute or distinctive corroboration.");
    }
  }

  const scaledScore = Math.round(candidateScore * 100);

  return {
    itemId: oFp.itemId,
    foundReportId: fFp.foundReportId,
    candidateScore,
    scaledScore,
    components: {
      distinctiveFeatureSimilarity: distinctiveComparison.score,
      genericAttributeCompatibility: genericComparison.score,
      locationTimeCompatibility: contextComparison.combinedLocationTimeScore,
      registrationLostTiming: contextComparison.registrationTimingScore,
    },
    evidence: {
      matchingDistinctiveFeatures: distinctiveComparison.matchedFeatures,
      matchingGenericAttributes: genericComparison.matchingAttributes,
      contextMatches: contextComparison.contextMatches,
    },
    conflicts: allConflicts,
    missingEvidence: allMissing,
    candidateState,
    confidenceTier:
      candidateScore >= 0.80 ? "high" : candidateScore >= 0.50 ? "medium" : "low",
    candidateStatus:
      candidateScore >= 0.80 ? "verification_required" : "candidate",
    isAmbiguous: false,
    explanation: explanationLines.join("\n"),
  };
}
