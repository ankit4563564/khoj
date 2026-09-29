/**
 * KHOJ — Embedding Provider Abstraction
 * Supports Google Gemini text-embedding-004 and deterministic local fallback.
 */

import { createHash } from "node:crypto";
import { EMBEDDING_CONFIG } from "./embeddingConfig";
import type {
  EmbeddingModelMetadata,
  EmbeddingTaskType,
  IEmbeddingProvider,
} from "./embeddingTypes";

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean = false,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

/**
 * Production Gemini Embedding Provider.
 * Calls Google's Generative Language API for text-embedding-004.
 */
export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new EmbeddingError("GEMINI_API_KEY is not configured", false);
    }
    this.apiKey = key;
  }

  getModelMetadata(): EmbeddingModelMetadata {
    return {
      provider: EMBEDDING_CONFIG.provider,
      modelName: EMBEDDING_CONFIG.modelName,
      modelVersion: EMBEDDING_CONFIG.modelVersion,
      dimension: EMBEDDING_CONFIG.dimension,
      supportsImageEmbedding: false, // Documented limitation: text-embedding-004 Generative Language API is text-only
    };
  }

  async generateTextEmbedding(
    text: string,
    taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT"
  ): Promise<number[]> {
    if (!text || !text.trim()) {
      throw new EmbeddingError("Cannot embed empty or whitespace-only text", false);
    }

    const payload = {
      model: `models/${EMBEDDING_CONFIG.modelName}`,
      content: {
        parts: [{ text: text.trim() }],
      },
      taskType: taskType,
    };

    let attempt = 0;
    let delayMs = EMBEDDING_CONFIG.initialRetryDelayMs;

    while (attempt < EMBEDDING_CONFIG.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EMBEDDING_CONFIG.timeoutMs);

        const response = await fetch(EMBEDDING_CONFIG.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as {
            embedding?: { values?: number[] };
          };
          const values = data.embedding?.values;
          if (!values || !Array.isArray(values) || values.length !== EMBEDDING_CONFIG.dimension) {
            throw new EmbeddingError(
              `Unexpected embedding response format or dimension: got ${values?.length}, expected ${EMBEDDING_CONFIG.dimension}`,
              false
            );
          }
          return values;
        }

        const isRateLimit = response.status === 429;
        const isServerError = response.status >= 500 && response.status < 600;
        const isRetryable = isRateLimit || isServerError;

        if (!isRetryable || attempt >= EMBEDDING_CONFIG.maxRetries) {
          const errorBody = await response.text().catch(() => "");
          throw new EmbeddingError(
            `Gemini embedding API failed with HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
            isRetryable,
            response.status
          );
        }

        // Bounded exponential backoff with jitter
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delayMs + jitter));
        delayMs = Math.min(delayMs * 2, EMBEDDING_CONFIG.maxRetryDelayMs);
      } catch (err: unknown) {
        if (err instanceof EmbeddingError && !err.isRetryable) {
          throw err;
        }
        if (attempt >= EMBEDDING_CONFIG.maxRetries) {
          throw new EmbeddingError(
            `Gemini embedding failed after ${attempt} attempts: ${(err as Error).message}`,
            false
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 2, EMBEDDING_CONFIG.maxRetryDelayMs);
      }
    }

    throw new EmbeddingError("Embedding generation failed after max retries", false);
  }

  /**
   * Gemini Generative Language API text-embedding-004 does NOT support direct image embeddings.
   * Documented limitation: returns null so the pipeline uses structured visual description embedding.
   */
  async generateImageEmbedding(
    _imageBuffer: Buffer,
    _mimeType: string
  ): Promise<number[] | null> {
    return null;
  }
}

/**
 * Deterministic Local Embedding Provider.
 * Generates reproducible 768-dimensional unit vectors via SHA-256 token hashing
 * and n-gram projection. Ideal for offline execution, unit tests, and CI/CD.
 */
export class DeterministicLocalEmbeddingProvider implements IEmbeddingProvider {
  getModelMetadata(): EmbeddingModelMetadata {
    return {
      provider: "local_deterministic",
      modelName: EMBEDDING_CONFIG.modelName,
      modelVersion: EMBEDDING_CONFIG.modelVersion,
      dimension: EMBEDDING_CONFIG.dimension,
      supportsImageEmbedding: false,
    };
  }

  async generateTextEmbedding(
    text: string,
    _taskType?: EmbeddingTaskType
  ): Promise<number[]> {
    if (!text || !text.trim()) {
      throw new EmbeddingError("Cannot embed empty or whitespace-only text", false);
    }

    const vector = new Float64Array(EMBEDDING_CONFIG.dimension);
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const tokens = normalized.split(/\s+/).filter(Boolean);

    // Seed representation from tokens
    for (const token of tokens) {
      const hash = createHash("sha256").update(token).digest();
      for (let i = 0; i < EMBEDDING_CONFIG.dimension; i++) {
        const byteIndex = i % hash.length;
        const sign = (hash[byteIndex] & 1) === 0 ? 1 : -1;
        const magnitude = (hash[byteIndex] >> 1) / 128.0;
        vector[i] += sign * magnitude;
      }
    }

    // Add 2-gram context
    for (let t = 0; t < tokens.length - 1; t++) {
      const bigram = `${tokens[t]}_${tokens[t + 1]}`;
      const hash = createHash("sha256").update(bigram).digest();
      for (let i = 0; i < EMBEDDING_CONFIG.dimension; i += 2) {
        const byteIndex = (i / 2) % hash.length;
        const sign = (hash[byteIndex] & 2) === 0 ? 1 : -1;
        vector[i] += sign * 0.5;
      }
    }

    // L2 Normalize to unit sphere (essential for cosine similarity)
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq) || 1.0;
    const result: number[] = new Array(EMBEDDING_CONFIG.dimension);
    for (let i = 0; i < vector.length; i++) {
      result[i] = Number((vector[i] / norm).toFixed(6));
    }

    return result;
  }

  async generateImageEmbedding(
    _imageBuffer: Buffer,
    _mimeType: string
  ): Promise<number[] | null> {
    return null;
  }
}

/**
 * Factory for obtaining the active embedding provider.
 */
export function getEmbeddingProvider(apiKeyOverride?: string): IEmbeddingProvider {
  const key = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (key) {
    return new GeminiEmbeddingProvider(key);
  }
  return new DeterministicLocalEmbeddingProvider();
}
