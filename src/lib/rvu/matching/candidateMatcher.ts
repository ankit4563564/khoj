/**
 * KHOJ — Baseline Candidate Matcher Engine
 * Evaluates registered lost items against found item fingerprints,
 * generates scorecards, applies ambiguity safety gates, and persists candidate matches.
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. A MATCH IS A CANDIDATE, NOT A VERDICT: The engine does not decide ownership.
 * 2. IDENTICAL ITEM SAFETY: If top candidates are too close (<0.08 difference), flag as AMBIGUOUS / MANUAL REVIEW.
 * 3. CANDIDATE ISOLATION: Preserves all plausible candidates without prematurely selecting one.
 */

import { all, one } from "@/lib/rvu/db";
import { ItemFingerprint, FoundFingerprint, ProtectedItem, Report } from "../types";
import { createCandidateMatch } from "../fingerprints/candidateRepository";
import { areCategoriesCompatible } from "./compareAttributes";
import { generateCandidateScorecard } from "./scoreCandidate";
import { DetailedCandidateScorecard, MatchFilterOptions } from "./matchingTypes";

export interface CandidateMatchingResult {
  foundReportId: string;
  evaluatedCount: number;
  candidates: DetailedCandidateScorecard[];
  topCandidate: DetailedCandidateScorecard | null;
  isAmbiguous: boolean;
  notes: string[];
}

/**
 * Evaluates all eligible lost items against a found report fingerprint.
 */
export async function matchFoundItem(
  foundReportId: string,
  options: MatchFilterOptions = {}
): Promise<CandidateMatchingResult> {
  const notes: string[] = [];
  const minReviewScore = options.minReviewScore ?? 0.50;
  const ambiguityMargin = options.ambiguityMargin ?? 0.08;

  // 1. Retrieve target Found Report and Found Fingerprint
  const foundReport = one<Report>("SELECT * FROM reports WHERE id=?", foundReportId);
  if (!foundReport || foundReport.kind !== "found") {
    return {
      foundReportId,
      evaluatedCount: 0,
      candidates: [],
      topCandidate: null,
      isAmbiguous: false,
      notes: [`Report #${foundReportId} is not a valid found report.`],
    };
  }

  const rawFoundFp = one<any>(
    "SELECT * FROM found_fingerprints WHERE foundReportId=?",
    foundReportId
  );
  if (!rawFoundFp) {
    return {
      foundReportId,
      evaluatedCount: 0,
      candidates: [],
      topCandidate: null,
      isAmbiguous: false,
      notes: [`Found fingerprint for report #${foundReportId} does not exist yet.`],
    };
  }

  const foundFp: FoundFingerprint = {
    ...rawFoundFp,
    visibleText: JSON.parse(rawFoundFp.visibleText || "[]"),
    logos: JSON.parse(rawFoundFp.logos || "[]"),
    accessories: JSON.parse(rawFoundFp.accessories || "[]"),
    distinctiveFeatures: JSON.parse(rawFoundFp.distinctiveFeatures || "[]"),
    metadata: JSON.parse(rawFoundFp.metadata || "{}"),
  };

  // 2. Query Eligible Registered Items
  // By default, consider items marked 'lost' or with open lost reports
  let eligibleItems: ProtectedItem[] = [];
  if (options.allowUnmarkedLost) {
    eligibleItems = all<ProtectedItem>("SELECT * FROM protected_items");
  } else {
    eligibleItems = all<ProtectedItem>(
      "SELECT * FROM protected_items WHERE status='lost' OR lostReportId IS NOT NULL"
    );
  }

  if (eligibleItems.length === 0) {
    notes.push("No eligible lost items currently registered in campus vault.");
    return {
      foundReportId,
      evaluatedCount: 0,
      candidates: [],
      topCandidate: null,
      isAmbiguous: false,
      notes,
    };
  }

  // 3. Evaluate each eligible item
  const scorecards: DetailedCandidateScorecard[] = [];

  for (const item of eligibleItems) {
    // Basic category compatibility pre-check
    if (options.categoryFilter !== false) {
      if (!areCategoriesCompatible(item.category, foundFp.category)) {
        continue;
      }
    }

    // Retrieve item fingerprint
    const rawItemFp = one<any>(
      "SELECT * FROM item_fingerprints WHERE itemId=?",
      item.id
    );
    if (!rawItemFp) continue;

    const itemFp: ItemFingerprint = {
      ...rawItemFp,
      visibleText: JSON.parse(rawItemFp.visibleText || "[]"),
      logos: JSON.parse(rawItemFp.logos || "[]"),
      accessories: JSON.parse(rawItemFp.accessories || "[]"),
      distinctiveFeatures: JSON.parse(rawItemFp.distinctiveFeatures || "[]"),
      metadata: JSON.parse(rawItemFp.metadata || "{}"),
    };

    // Retrieve corresponding lost report if available
    let lostReport: Report | null = null;
    if (item.lostReportId) {
      lostReport = one<Report>("SELECT * FROM reports WHERE id=?", item.lostReportId) || null;
    }

    // Generate scorecard
    const scorecard = generateCandidateScorecard({
      ownerFingerprint: itemFp,
      foundFingerprint: foundFp,
      ownerItem: item,
      ownerLostReport: lostReport,
      foundReport,
    });

    // Only keep plausible candidates (score >= 0.35)
    if (scorecard.candidateScore >= 0.35) {
      scorecards.push(scorecard);
    }
  }

  // 4. Sort candidates by score descending
  scorecards.sort((a, b) => b.candidateScore - a.candidateScore);

  // 5. Ambiguity Safety Check (Identical Item Rule)
  let isAmbiguous = false;
  if (scorecards.length >= 2) {
    const top = scorecards[0];
    const second = scorecards[1];

    if (
      top.candidateScore >= minReviewScore &&
      second.candidateScore >= minReviewScore &&
      top.candidateScore - second.candidateScore < ambiguityMargin
    ) {
      isAmbiguous = true;
      notes.push(
        `Ambiguity detected: top candidates #${top.itemId} (${top.candidateScore}) and #${second.itemId} (${second.candidateScore}) are within margin of error.`
      );

      // Flag and downgrade top candidate from auto-proceeding
      for (let i = 0; i < scorecards.length; i++) {
        if (top.candidateScore - scorecards[i].candidateScore < ambiguityMargin) {
          scorecards[i].isAmbiguous = true;
          if (scorecards[i].candidateState === "HIGH_CONFIDENCE_CANDIDATE") {
            scorecards[i].candidateState = "REQUIRES_MANUAL_REVIEW";
            scorecards[i].confidenceTier = "medium";
            scorecards[i].candidateStatus = "candidate";
            scorecards[i].explanation +=
              "\n- Multiple near-identical candidates detected; requires manual staff review.";
          }
        }
      }
    }
  }

  // 6. Persist Candidate Matches to database
  for (const sc of scorecards) {
    let vectorSim: number | null = null;
    try {
      const { getEmbedding } = await import("@/lib/rvu/embeddings/embeddingRepository");
      const { computeCosineSimilarity } = await import("@/lib/rvu/embeddings/vectorSearch");
      const itemEmb = await getEmbedding(sc.itemId);
      const foundEmb = await getEmbedding(sc.foundReportId);
      if (itemEmb?.embedding && foundEmb?.embedding) {
        vectorSim = computeCosineSimilarity(itemEmb.embedding, foundEmb.embedding);
      }
    } catch {
      // Embedding retrieval optional
    }

    try {
      await createCandidateMatch(
        {
          foundReportId: sc.foundReportId,
          itemId: sc.itemId,
          vectorSimilarity: vectorSim,
          attributeScore: Math.round(sc.components.genericAttributeCompatibility * 100),
          uniqueClueScore: Math.round(sc.components.distinctiveFeatureSimilarity * 100),
          locationScore: Math.round(sc.components.locationTimeCompatibility * 100),
          timeScore: Math.round(sc.components.registrationLostTiming * 100),
          overallScore: sc.scaledScore,
          confidenceTier: sc.confidenceTier,
          status: sc.candidateStatus,
          evidence: [
            sc.explanation,
            ...sc.evidence.matchingDistinctiveFeatures,
            ...sc.evidence.matchingGenericAttributes,
            ...sc.conflicts,
          ],
        },
        true // isStaffOrSystem
      );
    } catch (saveErr) {
      notes.push(`Warning: failed to persist candidate #${sc.itemId}: ${saveErr}`);
    }
  }

  return {
    foundReportId,
    evaluatedCount: eligibleItems.length,
    candidates: scorecards,
    topCandidate: scorecards.length > 0 ? scorecards[0] : null,
    isAmbiguous,
    notes,
  };
}
