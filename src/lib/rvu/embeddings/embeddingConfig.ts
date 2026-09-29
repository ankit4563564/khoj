/**
 * KHOJ — Embedding Engine Configuration
 *
 * CRITICAL VERIFICATION:
 * Verified Provider: Google Gemini Generative Language API
 * Verified Model: text-embedding-004
 * Official Output Dimension: 768
 * Modality Supported by Endpoint: Text (parts[].text)
 * Image Direct Byte Embedding: Unsupported by Generative Language API without Vertex AI IAM.
 * Strongest Supported Image Approach: Structured visual semantic fingerprint representation.
 */

export const EMBEDDING_CONFIG = {
  provider: "gemini" as const,
  modelName: "text-embedding-004" as const,
  modelVersion: "v1" as const,
  dimension: 768 as const,
  apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",

  // Operational parameters
  maxRetries: 3,
  initialRetryDelayMs: 400,
  maxRetryDelayMs: 3000,
  timeoutMs: 10000,

  // Retrieval bounds
  defaultTopK: 10,
  maxTopK: 50,
  defaultMinSimilarity: 0.35,

  // Batching / Backfill rate limiting
  backfillBatchDelayMs: 250,
};
