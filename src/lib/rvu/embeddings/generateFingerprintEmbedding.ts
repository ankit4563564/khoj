/**
 * KHOJ — Fingerprint Embedding Generation Pipeline
 * Generates and stores 768-dimensional embeddings for owner items and found reports.
 * Enforces caching, idempotency, and content-hash freshness detection.
 */

import { one } from "@/lib/rvu/db";
import type { ItemFingerprint, FoundFingerprint } from "@/lib/rvu/types";
import { EMBEDDING_CONFIG } from "./embeddingConfig";
import { getEmbeddingProvider } from "./embeddingProvider";
import {
  getEmbedding,
  upsertEmbedding,
} from "./embeddingRepository";
import type {
  FingerprintEmbeddingRecord,
} from "./embeddingTypes";
import {
  computeFingerprintHash,
  serializeFoundFingerprint,
  serializeOwnerFingerprint,
} from "./serializeFingerprint";

export interface GenerateEmbeddingOptions {
  forceRefresh?: boolean;
  geminiApiKey?: string;
}

/**
 * Generates and persists a structured text embedding for an owner's protected item.
 */
export async function generateOwnerItemEmbedding(
  itemId: string,
  options: GenerateEmbeddingOptions = {}
): Promise<FingerprintEmbeddingRecord> {
  // 1. Fetch item fingerprint
  const rawRow = await one<any>(
    'SELECT * FROM item_fingerprints WHERE "itemId"=?',
    itemId
  );

  if (!rawRow) {
    throw new Error(`Item fingerprint not found for itemId: ${itemId}`);
  }

  const fingerprint: ItemFingerprint = {
    ...rawRow,
    visibleText: JSON.parse(rawRow.visibleText || "[]"),
    logos: JSON.parse(rawRow.logos || "[]"),
    accessories: JSON.parse(rawRow.accessories || "[]"),
    distinctiveFeatures: JSON.parse(rawRow.distinctiveFeatures || "[]"),
    metadata: JSON.parse(rawRow.metadata || "{}"),
  };

  // 2. Serialize to deterministic semantic text and hash
  const serialized = serializeOwnerFingerprint(fingerprint);
  const contentHash = computeFingerprintHash(serialized);

  // 3. Idempotency check: if existing embedding is ready and hash matches, return cached
  if (!options.forceRefresh) {
    const existing = await getEmbedding(
      itemId,
      "text_structured",
      EMBEDDING_CONFIG.modelName,
      EMBEDDING_CONFIG.modelVersion
    );

    if (existing && existing.status === "ready" && existing.contentHash === contentHash) {
      return existing;
    }
  }

  // 4. Generate embedding vector via active provider
  const provider = getEmbeddingProvider(options.geminiApiKey);
  const vector = await provider.generateTextEmbedding(
    serialized,
    "RETRIEVAL_DOCUMENT"
  );

  // 5. Persist to storage
  const record = await upsertEmbedding({
    sourceId: itemId,
    sourceType: "owner_item",
    modality: "text_structured",
    embedding: vector,
    modelName: EMBEDDING_CONFIG.modelName,
    modelVersion: EMBEDDING_CONFIG.modelVersion,
    dimension: EMBEDDING_CONFIG.dimension,
    contentHash,
    status: "ready",
    category: fingerprint.category,
    metadata: {
      brand: fingerprint.brand,
      model: fingerprint.model,
      color: fingerprint.color,
      featureCount: fingerprint.distinctiveFeatures?.length || 0,
    },
  });

  return record;
}

/**
 * Generates and persists a structured text embedding for a finder's found report.
 */
export async function generateFoundReportEmbedding(
  foundReportId: string,
  options: GenerateEmbeddingOptions = {}
): Promise<FingerprintEmbeddingRecord> {
  // 1. Fetch found fingerprint
  const rawRow = await one<any>(
    'SELECT * FROM found_fingerprints WHERE "foundReportId"=?',
    foundReportId
  );

  if (!rawRow) {
    throw new Error(`Found fingerprint not found for foundReportId: ${foundReportId}`);
  }

  const fingerprint: FoundFingerprint = {
    ...rawRow,
    visibleText: JSON.parse(rawRow.visibleText || "[]"),
    logos: JSON.parse(rawRow.logos || "[]"),
    accessories: JSON.parse(rawRow.accessories || "[]"),
    distinctiveFeatures: JSON.parse(rawRow.distinctiveFeatures || "[]"),
    metadata: JSON.parse(rawRow.metadata || "{}"),
  };

  // 2. Serialize to deterministic semantic text and hash
  const serialized = serializeFoundFingerprint(fingerprint);
  const contentHash = computeFingerprintHash(serialized);

  // 3. Idempotency check: if existing embedding is ready and hash matches, return cached
  if (!options.forceRefresh) {
    const existing = await getEmbedding(
      foundReportId,
      "text_structured",
      EMBEDDING_CONFIG.modelName,
      EMBEDDING_CONFIG.modelVersion
    );

    if (existing && existing.status === "ready" && existing.contentHash === contentHash) {
      return existing;
    }
  }

  // 4. Generate embedding vector via active provider
  const provider = getEmbeddingProvider(options.geminiApiKey);
  const vector = await provider.generateTextEmbedding(
    serialized,
    "RETRIEVAL_QUERY"
  );

  // 5. Persist to storage
  const record = await upsertEmbedding({
    sourceId: foundReportId,
    sourceType: "found_report",
    modality: "text_structured",
    embedding: vector,
    modelName: EMBEDDING_CONFIG.modelName,
    modelVersion: EMBEDDING_CONFIG.modelVersion,
    dimension: EMBEDDING_CONFIG.dimension,
    contentHash,
    status: "ready",
    category: fingerprint.category,
    metadata: {
      foundLocation: fingerprint.foundLocation,
      brand: fingerprint.brand,
      model: fingerprint.model,
      color: fingerprint.color,
      featureCount: fingerprint.distinctiveFeatures?.length || 0,
    },
  });

  return record;
}
