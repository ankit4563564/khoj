/**
 * KHOJ — Fingerprint Embedding Repository
 * Persists and manages vector embedding records across SQLite and Supabase.
 */

import { id, now, one, all, run, transaction } from "@/lib/rvu/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMBEDDING_CONFIG } from "./embeddingConfig";
import type {
  EmbeddingModality,
  EmbeddingSourceType,
  EmbeddingStatus,
  FingerprintEmbeddingRecord,
} from "./embeddingTypes";

interface RawEmbeddingRow {
  id: string;
  sourceId: string;
  sourceType: string;
  modality: string;
  embedding: string; // JSON string in SQLite
  modelName: string;
  modelVersion: string;
  dimension: number;
  contentHash: string;
  status: string;
  errorMessage: string | null;
  category: string | null;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

function parseRow(row: RawEmbeddingRow): FingerprintEmbeddingRecord {
  let embeddingVector: number[] = [];
  try {
    embeddingVector = JSON.parse(row.embedding || "[]");
  } catch {
    embeddingVector = [];
  }

  let metadataObj: Record<string, unknown> = {};
  try {
    metadataObj = JSON.parse(row.metadata || "{}");
  } catch {
    metadataObj = {};
  }

  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceType: row.sourceType as EmbeddingSourceType,
    modality: row.modality as EmbeddingModality,
    embedding: embeddingVector,
    modelName: row.modelName,
    modelVersion: row.modelVersion,
    dimension: Number(row.dimension) || EMBEDDING_CONFIG.dimension,
    contentHash: row.contentHash,
    status: row.status as EmbeddingStatus,
    errorMessage: row.errorMessage,
    category: row.category,
    metadata: metadataObj,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Creates or updates an embedding record (idempotent).
 */
export async function upsertEmbedding(
  params: {
    sourceId: string;
    sourceType: EmbeddingSourceType;
    modality: EmbeddingModality;
    embedding: number[];
    modelName?: string;
    modelVersion?: string;
    dimension?: number;
    contentHash: string;
    status?: EmbeddingStatus;
    errorMessage?: string | null;
    category?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<FingerprintEmbeddingRecord> {
  const modelName = params.modelName || EMBEDDING_CONFIG.modelName;
  const modelVersion = params.modelVersion || EMBEDDING_CONFIG.modelVersion;
  const dimension = params.dimension || EMBEDDING_CONFIG.dimension;
  const status = params.status || "ready";
  const errorMessage = params.errorMessage || null;
  const category = params.category || null;
  const metadataJson = JSON.stringify(params.metadata || {});
  const embeddingJson = JSON.stringify(params.embedding);
  const currentTime = now();

  // 1. Persist to local SQLite
  const existing = one<RawEmbeddingRow>(
    "SELECT * FROM fingerprint_embeddings WHERE sourceId=? AND modality=? AND modelName=? AND modelVersion=?",
    params.sourceId,
    params.modality,
    modelName,
    modelVersion
  );

  let recordId: string;

  if (existing) {
    recordId = existing.id;
    run(
      `UPDATE fingerprint_embeddings 
       SET embedding=?, dimension=?, contentHash=?, status=?, errorMessage=?, category=?, metadata=?, updatedAt=? 
       WHERE id=?`,
      embeddingJson,
      dimension,
      params.contentHash,
      status,
      errorMessage,
      category,
      metadataJson,
      currentTime,
      recordId
    );
  } else {
    recordId = id("emb");
    run(
      `INSERT INTO fingerprint_embeddings 
       (id, sourceId, sourceType, modality, embedding, modelName, modelVersion, dimension, contentHash, status, errorMessage, category, metadata, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      recordId,
      params.sourceId,
      params.sourceType,
      params.modality,
      embeddingJson,
      modelName,
      modelVersion,
      dimension,
      params.contentHash,
      status,
      errorMessage,
      category,
      metadataJson,
      currentTime,
      currentTime
    );
  }

  // 2. Synchronize to Supabase if available
  const supabase = createAdminClient();
  if (supabase) {
    try {
      await supabase.from("fingerprint_embeddings").upsert(
        {
          id: recordId,
          source_id: params.sourceId,
          source_type: params.sourceType,
          modality: params.modality,
          embedding: params.embedding,
          model_name: modelName,
          model_version: modelVersion,
          dimension: dimension,
          content_hash: params.contentHash,
          status: status,
          error_message: errorMessage,
          category: category,
          metadata: params.metadata || {},
          updated_at: currentTime,
        },
        { onConflict: "source_id, modality, model_name, model_version" }
      );
    } catch (supabaseErr) {
      console.warn("Supabase vector upsert skipped/failed:", supabaseErr);
    }
  }

  const updated = one<RawEmbeddingRow>(
    "SELECT * FROM fingerprint_embeddings WHERE id=?",
    recordId
  );
  return parseRow(updated!);
}

/**
 * Retrieves an embedding for a source ID and modality.
 */
export async function getEmbedding(
  sourceId: string,
  modality: EmbeddingModality = "text_structured",
  modelName: string = EMBEDDING_CONFIG.modelName,
  modelVersion: string = EMBEDDING_CONFIG.modelVersion
): Promise<FingerprintEmbeddingRecord | null> {
  const row = one<RawEmbeddingRow>(
    "SELECT * FROM fingerprint_embeddings WHERE sourceId=? AND modality=? AND modelName=? AND modelVersion=?",
    sourceId,
    modality,
    modelName,
    modelVersion
  );
  return row ? parseRow(row) : null;
}

/**
 * Marks embeddings for a source as stale (e.g. after owner updates item description).
 */
export async function markEmbeddingsStale(sourceId: string): Promise<void> {
  const currentTime = now();
  run(
    "UPDATE fingerprint_embeddings SET status='stale', updatedAt=? WHERE sourceId=?",
    currentTime,
    sourceId
  );

  const supabase = createAdminClient();
  if (supabase) {
    try {
      await supabase
        .from("fingerprint_embeddings")
        .update({ status: "stale", updated_at: currentTime })
        .eq("source_id", sourceId);
    } catch (err) {
      console.warn("Supabase mark stale warning:", err);
    }
  }
}

/**
 * Lists all ready embeddings for a source type (e.g., all owner items).
 */
export async function listReadyEmbeddings(
  sourceType: EmbeddingSourceType,
  categoryFilter?: string
): Promise<FingerprintEmbeddingRecord[]> {
  let query = "SELECT * FROM fingerprint_embeddings WHERE sourceType=? AND status='ready'";
  const args: any[] = [sourceType];

  if (categoryFilter) {
    query += " AND category=?";
    args.push(categoryFilter);
  }

  const rows = all<RawEmbeddingRow>(query, ...args);
  return rows.map(parseRow);
}
