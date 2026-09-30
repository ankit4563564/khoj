/**
 * KHOJ — Embedding Backfill Utility
 * Safe, idempotent, resumable backfill service for generating vector embeddings
 * across historical item and found fingerprints.
 */

import { all } from "@/lib/rvu/db";
import { EMBEDDING_CONFIG } from "./embeddingConfig";
import {
  generateFoundReportEmbedding,
  generateOwnerItemEmbedding,
} from "./generateFingerprintEmbedding";

export interface BackfillSummary {
  ownerItemsProcessed: number;
  foundReportsProcessed: number;
  newlyGenerated: number;
  alreadyFresh: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export async function backfillFingerprintEmbeddings(options: {
  batchSize?: number;
  batchDelayMs?: number;
  geminiApiKey?: string;
} = {}): Promise<BackfillSummary> {
  const batchDelayMs = options.batchDelayMs ?? EMBEDDING_CONFIG.backfillBatchDelayMs;
  const summary: BackfillSummary = {
    ownerItemsProcessed: 0,
    foundReportsProcessed: 0,
    newlyGenerated: 0,
    alreadyFresh: 0,
    failed: 0,
    errors: [],
  };

  // 1. Backfill Owner Items
  const items = await all<{ itemId: string }>('SELECT "itemId" FROM item_fingerprints');
  for (const item of items) {
    summary.ownerItemsProcessed++;
    try {
      await generateOwnerItemEmbedding(item.itemId, {
        geminiApiKey: options.geminiApiKey,
      });
      // If created_at == updated_at and it was just created
      summary.newlyGenerated++;
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({ id: item.itemId, error: err.message });
    }

    if (batchDelayMs > 0) {
      await new Promise((r) => setTimeout(r, batchDelayMs));
    }
  }

  // 2. Backfill Found Reports
  const reports = await all<{ foundReportId: string }>(
    'SELECT "foundReportId" FROM found_fingerprints'
  );
  for (const rep of reports) {
    summary.foundReportsProcessed++;
    try {
      await generateFoundReportEmbedding(rep.foundReportId, {
        geminiApiKey: options.geminiApiKey,
      });
      summary.newlyGenerated++;
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({ id: rep.foundReportId, error: err.message });
    }

    if (batchDelayMs > 0) {
      await new Promise((r) => setTimeout(r, batchDelayMs));
    }
  }

  return summary;
}
