/**
 * KHOJ — Phase 5: Embeddings & Vector Retrieval Types
 * Defines interfaces, models, and metadata for pgvector embedding pipeline.
 */

export type EmbeddingTaskType =
  | "RETRIEVAL_QUERY"
  | "RETRIEVAL_DOCUMENT"
  | "SEMANTIC_SIMILARITY";

export type EmbeddingModality =
  | "text_structured"
  | "image_visual";

export type EmbeddingSourceType =
  | "owner_item"
  | "found_report";

export type EmbeddingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "stale";

export interface EmbeddingModelMetadata {
  provider: string;
  modelName: string;
  modelVersion: string;
  dimension: number;
  supportsImageEmbedding: boolean;
}

export interface FingerprintEmbeddingRecord {
  id: string;
  sourceId: string;
  sourceType: EmbeddingSourceType;
  modality: EmbeddingModality;
  embedding: number[];
  modelName: string;
  modelVersion: string;
  dimension: number;
  contentHash: string;
  status: EmbeddingStatus;
  errorMessage?: string | null;
  category?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface VectorRetrievalResult {
  sourceId: string;
  similarity: number;
  retrievalSource: EmbeddingModality;
  embeddingModel: string;
  embeddingVersion: string;
  category?: string;
  metadata: Record<string, unknown>;
}

export interface VectorSearchQuery {
  queryEmbedding: number[];
  sourceTypeToSearch: EmbeddingSourceType;
  categoryFilter?: string;
  topK?: number;
  minSimilarity?: number;
  campusScope?: string;
}

export interface IEmbeddingProvider {
  getModelMetadata(): EmbeddingModelMetadata;
  generateTextEmbedding(text: string, taskType?: EmbeddingTaskType): Promise<number[]>;
  generateImageEmbedding(imageBuffer: Buffer, mimeType: string): Promise<number[] | null>;
}
