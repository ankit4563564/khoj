/**
 * KHOJ — Multimodal Candidate Reranking Pipeline
 * Orchestrates Phase 5 vector candidate retrieval, multimodal attribute & distinctive feature reranking,
 * ambiguity safety gating, and scorecard database persistence.
 *
 * CRITICAL RULE:
 * A reranked candidate is NOT an ownership verdict.
 * It strictly organizes evidence for Phase 7 blind verification.
 */

import { all, one, transaction } from "@/lib/rvu/db";
import { getEmbedding } from "@/lib/rvu/embeddings";
import { searchSimilarLostItems } from "@/lib/rvu/embeddings/vectorSearch";
import { createCandidateMatch } from "@/lib/rvu/fingerprints/candidateRepository";
import type { FoundFingerprint, ItemFingerprint, ProtectedItem, Report } from "@/lib/rvu/types";
import { RERANKING_CONFIG } from "./rerankingConfig";
import type { RerankedScorecard, RerankResult } from "./rerankingTypes";
import { scoreCandidateRerank } from "./scoreCandidateRerank";

export async function rerankFoundCandidates(
  foundReportId: string,
  options: {
    topK?: number;
    minSimilarity?: number;
    geminiApiKey?: string;
  } = {}
): Promise<RerankResult> {
  const notes: string[] = [];

  // 1. Fetch found report and found fingerprint
  const foundReport = await one<Report>("SELECT * FROM reports WHERE id=?", foundReportId);
  if (!foundReport) {
    throw new Error(`Found report not found: ${foundReportId}`);
  }

  const rawFoundFp = await one<any>(
    'SELECT * FROM found_fingerprints WHERE "foundReportId"=?',
    foundReportId
  );
  if (!rawFoundFp) {
    throw new Error(`Found fingerprint not found for report: ${foundReportId}`);
  }

  const foundFp: FoundFingerprint = {
    ...rawFoundFp,
    visibleText: JSON.parse(rawFoundFp.visibleText || "[]"),
    logos: JSON.parse(rawFoundFp.logos || "[]"),
    accessories: JSON.parse(rawFoundFp.accessories || "[]"),
    distinctiveFeatures: JSON.parse(rawFoundFp.distinctiveFeatures || "[]"),
    metadata: JSON.parse(rawFoundFp.metadata || "{}"),
  };

  // 2. Perform Phase 5 Top-K Vector Retrieval
  let retrievedCandidates: Array<{ sourceId: string; similarity: number }> = [];
  try {
    const vectorResults = await searchSimilarLostItems({
      foundReportId,
      topK: options.topK || 20,
      minSimilarity: options.minSimilarity ?? 0.0,
      geminiApiKey: options.geminiApiKey,
    });
    retrievedCandidates = vectorResults.map((r) => ({
      sourceId: r.sourceId,
      similarity: r.similarity,
    }));
  } catch (vecErr) {
    notes.push(`Vector retrieval warning: ${vecErr}`);
  }

  // Also query active registered lost items in the database to ensure full candidate coverage
  const lostItems = await all<ProtectedItem>(
    "SELECT * FROM protected_items WHERE status='lost'"
  );

  const candidateItemMap = new Map<string, { item: ProtectedItem; vectorSim: number | null }>();

  // Add vector retrieval candidates first
  for (const vc of retrievedCandidates) {
    const item = lostItems.find((li) => li.id === vc.sourceId);
    if (item) {
      candidateItemMap.set(item.id, { item, vectorSim: vc.similarity });
    }
  }

  // Add any other active lost items
  for (const item of lostItems) {
    if (!candidateItemMap.has(item.id)) {
      candidateItemMap.set(item.id, { item, vectorSim: null });
    }
  }

  const scorecards: RerankedScorecard[] = [];

  // 3. Multimodal Reranking for each candidate
  for (const [itemId, { item, vectorSim }] of candidateItemMap.entries()) {
    const rawItemFp = await one<any>('SELECT * FROM item_fingerprints WHERE "itemId"=?', itemId);
    if (!rawItemFp) continue;

    const itemFp: ItemFingerprint = {
      ...rawItemFp,
      visibleText: JSON.parse(rawItemFp.visibleText || "[]"),
      logos: JSON.parse(rawItemFp.logos || "[]"),
      accessories: JSON.parse(rawItemFp.accessories || "[]"),
      distinctiveFeatures: JSON.parse(rawItemFp.distinctiveFeatures || "[]"),
      metadata: JSON.parse(rawItemFp.metadata || "{}"),
    };

    let lostReport: Report | null = null;
    if (item.lostReportId) {
      lostReport = (await one<Report>("SELECT * FROM reports WHERE id=?", item.lostReportId)) || null;
    }

    // Retrieve Phase 4 baseline scorecard if exists
    const existingMatch = await one<any>(
      'SELECT "overallScore" FROM candidate_matches WHERE "foundReportId"=? AND "itemId"=?',
      foundReportId,
      itemId
    );
    const baselineScore = existingMatch ? Number((existingMatch.overallScore / 100).toFixed(2)) : 0.0;

    // Execute multimodal reranking scoring
    const sc = scoreCandidateRerank({
      ownerFingerprint: itemFp,
      foundFingerprint: foundFp,
      ownerItem: item,
      foundReport,
      ownerLostReport: lostReport,
      rawVectorSimilarity: vectorSim,
      baselinePhase4Score: baselineScore,
    });

    scorecards.push(sc);
  }

  // 4. Sort Candidates Descending by Rerank Score
  scorecards.sort((a, b) => b.rerankScore - a.rerankScore);

  // 5. Ambiguity Safety Gate
  let isAmbiguous = false;
  if (scorecards.length >= 2) {
    const top = scorecards[0];
    const second = scorecards[1];

    if (
      top.rerankScore >= RERANKING_CONFIG.ambiguity.minScoreThreshold &&
      top.rerankScore - second.rerankScore < RERANKING_CONFIG.ambiguity.scoreMargin
    ) {
      isAmbiguous = true;
      notes.push(
        `Ambiguity gate triggered: top candidate #${top.itemId} (${top.rerankScore}) and second #${second.itemId} (${second.rerankScore}) are within ${RERANKING_CONFIG.ambiguity.scoreMargin} margin.`
      );

      for (let i = 0; i < scorecards.length; i++) {
        if (top.rerankScore - scorecards[i].rerankScore < RERANKING_CONFIG.ambiguity.scoreMargin) {
          scorecards[i].isAmbiguous = true;
          if (scorecards[i].candidateState === "HIGH_CONFIDENCE_CANDIDATE") {
            scorecards[i].candidateState = "REQUIRES_MANUAL_REVIEW";
            scorecards[i].confidenceTier = "medium";
            scorecards[i].candidateStatus = "candidate";
            scorecards[i].explanation +=
              "\n- Ambiguity detected: visually identical candidates close in score; downgraded to manual review.";
          }
        }
      }
    }
  }

  // 6. Persist Reranked Candidate Results to candidate_matches
  for (const sc of scorecards) {
    try {
      await createCandidateMatch(
        {
          foundReportId: sc.foundReportId,
          itemId: sc.itemId,
          vectorSimilarity: sc.vectorRetrievalSignal,
          attributeScore: Math.round(sc.components.structuredAttributeCompatibility * 100),
          uniqueClueScore: Math.round(sc.components.distinctivePhysicalEvidence * 100),
          locationScore: Math.round(sc.components.contextualCompatibility * 100),
          timeScore: Math.round(sc.components.temporalCompatibility * 100),
          overallScore: sc.scaledScore, // Persist Phase 6 rerank score
          confidenceTier: sc.confidenceTier,
          status: sc.candidateStatus,
          evidence: [
            sc.explanation,
            `reranker_version:${sc.rerankerVersion}`,
            `baseline_score:${sc.baselineScore}`,
            `rerank_score:${sc.rerankScore}`,
            ...sc.matchingEvidence.distinctive,
            ...sc.matchingEvidence.generic,
            ...sc.conflicts,
          ],
        },
        true // isStaffOrSystem
      );
    } catch (saveErr) {
      notes.push(`Candidate persistence warning for #${sc.itemId}: ${saveErr}`);
    }
  }

  return {
    foundReportId,
    candidates: scorecards,
    topCandidate: scorecards.length > 0 ? scorecards[0] : null,
    isAmbiguous,
    totalEvaluated: candidateItemMap.size,
    notes,
  };
}
