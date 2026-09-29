/**
 * KHOJ — Multimodal Vector Evidence Evaluator
 * Evaluates semantic vector similarity signals and tracks model provenance.
 * Preserves raw similarity values while computing normalized retrieval signals.
 */

import { EMBEDDING_CONFIG } from "@/lib/rvu/embeddings";
import type {
  MultimodalVectorEvidence,
  VectorSignalProvenance,
} from "./rerankingTypes";

export interface VectorEvaluationResult {
  score: number;                              // Normalized score 0.00 - 1.00 (Weight: 0.25)
  rawSimilarity: number;                      // Raw cosine similarity (-1.00 to 1.00)
  vectorEvidence: MultimodalVectorEvidence;
}

/**
 * Normalizes raw cosine similarity into a calibrated 0.00 - 1.00 retrieval score.
 * Formula: normalized = clamp((raw - 0.30) / 0.65, 0.0, 1.0)
 * Rationale: For text-embedding-004, semantic relevance starts around 0.30,
 * and high similarity reaches 0.95.
 */
export function normalizeCosineSimilarity(raw: number): number {
  if (raw <= 0.30) return 0.0;
  if (raw >= 0.95) return 1.0;
  return Number(((raw - 0.30) / 0.65).toFixed(3));
}

export function evaluateMultimodalVectorEvidence(params: {
  rawCosineSimilarity?: number | null;
  foundTextSimilarity?: number | null;
  foundImageSimilarity?: number | null;
  ownerTextSimilarity?: number | null;
  ownerImageSimilarity?: number | null;
  modelName?: string;
  modelVersion?: string;
}): VectorEvaluationResult {
  const model = params.modelName || EMBEDDING_CONFIG.modelName;
  const version = params.modelVersion || EMBEDDING_CONFIG.modelVersion;

  const vectorEvidence: MultimodalVectorEvidence = {
    compositeSimilarity: 0.0,
  };

  const signals: number[] = [];

  // Track found text retrieval signal
  const foundTextSim = params.foundTextSimilarity ?? params.rawCosineSimilarity;
  if (foundTextSim !== null && foundTextSim !== undefined) {
    const prov: VectorSignalProvenance = {
      similarity: Number(foundTextSim.toFixed(4)),
      model,
      version,
      modality: "text_structured",
    };
    vectorEvidence.foundText = prov;
    signals.push(foundTextSim);
  }

  // Track found image retrieval signal (if available from vision pipeline)
  if (params.foundImageSimilarity !== null && params.foundImageSimilarity !== undefined) {
    const prov: VectorSignalProvenance = {
      similarity: Number(params.foundImageSimilarity.toFixed(4)),
      model,
      version,
      modality: "image_visual",
    };
    vectorEvidence.foundImage = prov;
    signals.push(params.foundImageSimilarity);
  }

  // Composite signal calculation (Deterministic rule: highest reliable modality signal)
  const compositeRaw = signals.length > 0 ? Math.max(...signals) : 0.0;
  vectorEvidence.compositeSimilarity = Number(compositeRaw.toFixed(4));

  const normalizedScore = normalizeCosineSimilarity(compositeRaw);

  return {
    score: normalizedScore,
    rawSimilarity: compositeRaw,
    vectorEvidence,
  };
}
