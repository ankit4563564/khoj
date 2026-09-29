/**
 * KHOJ — Vector Candidate Retrieval Engine
 * Executes Top-K semantic similarity search across vector embeddings.
 * Dual-backend: Supabase pgvector RPC with fast local memory-mapped vector search.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { EMBEDDING_CONFIG } from "./embeddingConfig";
import { listReadyEmbeddings } from "./embeddingRepository";
import type {
  VectorRetrievalResult,
  VectorSearchQuery,
} from "./embeddingTypes";
import { generateFoundReportEmbedding } from "./generateFingerprintEmbedding";

/**
 * Computes exact cosine similarity between two unit vectors.
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  const rawSim = dotProduct / denominator;
  // Bounded between -1.0 and 1.0, rounded to 4 decimals
  return Number(Math.max(-1, Math.min(1, rawSim)).toFixed(4));
}

/**
 * Searches similar embeddings using Supabase pgvector RPC or local fallback.
 */
export async function searchVectorEmbeddings(
  query: VectorSearchQuery
): Promise<VectorRetrievalResult[]> {
  const topK = Math.min(query.topK || EMBEDDING_CONFIG.defaultTopK, EMBEDDING_CONFIG.maxTopK);
  const minSimilarity = query.minSimilarity ?? EMBEDDING_CONFIG.defaultMinSimilarity;

  // 1. Try Supabase pgvector RPC if available
  const supabase = createAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("match_fingerprint_embeddings", {
        query_embedding: query.queryEmbedding,
        match_threshold: minSimilarity,
        match_count: topK,
        filter_source_type: query.sourceTypeToSearch,
        filter_category: query.categoryFilter || null,
      });

      if (!error && Array.isArray(data)) {
        return data.map((item: any) => ({
          sourceId: item.source_id,
          similarity: Number(item.similarity.toFixed(4)),
          retrievalSource: item.modality,
          embeddingModel: item.model_name,
          embeddingVersion: item.model_version,
          category: item.category,
          metadata: item.metadata || {},
        }));
      }
    } catch (rpcErr) {
      console.warn("Supabase vector RPC search failed, falling back to local engine:", rpcErr);
    }
  }

  // 2. Fast Local Search over SQLite embeddings
  const readyRecords = await listReadyEmbeddings(
    query.sourceTypeToSearch,
    query.categoryFilter
  );

  const scored: VectorRetrievalResult[] = [];

  for (const record of readyRecords) {
    if (!record.embedding || record.embedding.length !== query.queryEmbedding.length) {
      continue;
    }

    const similarity = computeCosineSimilarity(query.queryEmbedding, record.embedding);

    if (similarity >= minSimilarity) {
      scored.push({
        sourceId: record.sourceId,
        similarity,
        retrievalSource: record.modality,
        embeddingModel: record.modelName,
        embeddingVersion: record.modelVersion,
        category: record.category || undefined,
        metadata: record.metadata,
      });
    }
  }

  // Sort descending by similarity
  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, topK);
}

/**
 * High-level API: Retrieves candidate lost items for a found report using vector search.
 */
export async function searchSimilarLostItems(params: {
  foundReportId: string;
  topK?: number;
  minSimilarity?: number;
  categoryFilter?: string;
  geminiApiKey?: string;
}): Promise<VectorRetrievalResult[]> {
  // 1. Ensure found report has a fresh embedding
  const foundEmbeddingRecord = await generateFoundReportEmbedding(
    params.foundReportId,
    { geminiApiKey: params.geminiApiKey }
  );

  // 2. Execute vector search across owner item embeddings
  return searchVectorEmbeddings({
    queryEmbedding: foundEmbeddingRecord.embedding,
    sourceTypeToSearch: "owner_item",
    categoryFilter: params.categoryFilter,
    topK: params.topK,
    minSimilarity: params.minSimilarity,
  });
}
