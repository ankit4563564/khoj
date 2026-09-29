/**
 * KHOJ — Fingerprint & Matching Validation Layer
 * Zero external dependencies. Strict, defensive server-side validation.
 */

import {
  categories,
  type ConfidenceTier,
  type CandidateStatus,
  type VerificationResult,
  type ItemFingerprint,
  type FoundFingerprint,
  type CandidateScoreCard,
  type VerificationEvidence,
} from "@/lib/rvu/types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateId(id: unknown, fieldName = "ID"): string {
  if (typeof id !== "string" || !id.trim() || id.length > 128) {
    throw new ValidationError(`Invalid ${fieldName}: must be a non-empty string under 128 characters.`);
  }
  // Safe alphanumeric + hyphen + underscore + colon format
  if (!/^[a-zA-Z0-9_\-:]+$/.test(id.trim())) {
    throw new ValidationError(`Invalid ${fieldName}: contains illegal characters.`);
  }
  return id.trim();
}

export function validateString(
  val: unknown,
  fieldName: string,
  minLen = 0,
  maxLen = 2000,
  required = false
): string {
  if (val === undefined || val === null) {
    if (required) throw new ValidationError(`${fieldName} is required.`);
    return "";
  }
  if (typeof val !== "string") {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  const trimmed = val.trim();
  if (required && trimmed.length < minLen) {
    throw new ValidationError(`${fieldName} must be at least ${minLen} characters long.`);
  }
  if (trimmed.length > maxLen) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLen} characters.`);
  }
  return trimmed;
}

export function validateCategory(cat: unknown): string {
  const categoryStr = validateString(cat, "Category", 2, 80, true);
  return categoryStr;
}

export function validateStringArray(
  arr: unknown,
  fieldName: string,
  maxItems = 50,
  maxItemLen = 200
): string[] {
  if (arr === undefined || arr === null) return [];
  if (!Array.isArray(arr)) {
    throw new ValidationError(`${fieldName} must be an array of strings.`);
  }
  if (arr.length > maxItems) {
    throw new ValidationError(`${fieldName} contains too many items (max ${maxItems}).`);
  }
  return arr.map((item, idx) => {
    if (typeof item !== "string") {
      throw new ValidationError(`${fieldName}[${idx}] must be a string.`);
    }
    const trimmed = item.trim();
    if (trimmed.length > maxItemLen) {
      throw new ValidationError(`${fieldName}[${idx}] exceeds maximum length of ${maxItemLen}.`);
    }
    return trimmed;
  });
}

export function validateMetadata(obj: unknown, fieldName = "Metadata"): Record<string, unknown> {
  if (obj === undefined || obj === null) return {};
  if (typeof obj !== "object" || Array.isArray(obj)) {
    throw new ValidationError(`${fieldName} must be a valid key-value object.`);
  }
  // Ensure object is serializable to JSON and not excessively nested/sized
  try {
    const serialized = JSON.stringify(obj);
    if (serialized.length > 32000) {
      throw new ValidationError(`${fieldName} payload exceeds maximum size limit (32KB).`);
    }
    return JSON.parse(serialized);
  } catch {
    throw new ValidationError(`${fieldName} contains circular references or non-serializable values.`);
  }
}

export function validateTimestamp(ts: unknown, fieldName = "Timestamp"): string {
  if (typeof ts !== "string" || !ts.trim()) {
    return new Date().toISOString();
  }
  const parsed = Date.parse(ts);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid ISO 8601 date string.`);
  }
  return new Date(parsed).toISOString();
}

export function validateScore(num: unknown, fieldName: string): number {
  if (typeof num !== "number" || !Number.isFinite(num) || num < 0 || num > 100) {
    throw new ValidationError(`${fieldName} must be a number between 0 and 100.`);
  }
  return Math.round(num);
}

export function validateConfidenceTier(tier: unknown): ConfidenceTier {
  if (tier !== "high" && tier !== "medium" && tier !== "low") {
    throw new ValidationError("Invalid confidenceTier: must be 'high', 'medium', or 'low'.");
  }
  return tier;
}

export function validateCandidateStatus(status: unknown): CandidateStatus {
  const valid: CandidateStatus[] = [
    "candidate",
    "verification_required",
    "verified",
    "rejected",
    "expired",
  ];
  if (!valid.includes(status as CandidateStatus)) {
    throw new ValidationError(`Invalid status: must be one of ${valid.join(", ")}.`);
  }
  return status as CandidateStatus;
}

export function validateVerificationResult(res: unknown): VerificationResult {
  if (res !== "pending" && res !== "passed" && res !== "failed") {
    throw new ValidationError("Invalid verification result: must be 'pending', 'passed', or 'failed'.");
  }
  return res;
}

/**
 * Validates complete ItemFingerprint input before database insertion or update.
 */
export function validateItemFingerprintInput(
  input: Partial<ItemFingerprint>
): Omit<ItemFingerprint, "id" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Item fingerprint input must be an object.");
  }

  return {
    itemId: validateId(input.itemId, "itemId"),
    category: validateCategory(input.category),
    subcategory: input.subcategory ? validateString(input.subcategory, "subcategory", 0, 80) : null,
    brand: validateString(input.brand, "brand", 0, 80),
    model: validateString(input.model, "model", 0, 80),
    color: validateString(input.color, "color", 0, 60),
    material: input.material ? validateString(input.material, "material", 0, 60) : null,
    visibleText: validateStringArray(input.visibleText, "visibleText"),
    logos: validateStringArray(input.logos, "logos"),
    accessories: validateStringArray(input.accessories, "accessories"),
    distinctiveFeatures: validateStringArray(input.distinctiveFeatures, "distinctiveFeatures"),
    condition: validateString(input.condition || "unknown", "condition", 0, 40),
    ownerDescription: validateString(input.ownerDescription, "ownerDescription", 0, 2000),
    normalizedDescription: validateString(input.normalizedDescription, "normalizedDescription", 0, 2000),
    metadata: validateMetadata(input.metadata),
    imageReference: input.imageReference ? validateId(input.imageReference, "imageReference") : null,
    textEmbeddingReference: input.textEmbeddingReference ? String(input.textEmbeddingReference) : null,
    imageEmbeddingReference: input.imageEmbeddingReference ? String(input.imageEmbeddingReference) : null,
  };
}

/**
 * Validates complete FoundFingerprint input before database insertion or update.
 */
export function validateFoundFingerprintInput(
  input: Partial<FoundFingerprint>
): Omit<FoundFingerprint, "id" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Found fingerprint input must be an object.");
  }

  return {
    foundReportId: validateId(input.foundReportId, "foundReportId"),
    category: validateCategory(input.category),
    subcategory: input.subcategory ? validateString(input.subcategory, "subcategory", 0, 80) : null,
    brand: validateString(input.brand, "brand", 0, 80),
    model: validateString(input.model, "model", 0, 80),
    color: validateString(input.color, "color", 0, 60),
    material: input.material ? validateString(input.material, "material", 0, 60) : null,
    visibleText: validateStringArray(input.visibleText, "visibleText"),
    logos: validateStringArray(input.logos, "logos"),
    accessories: validateStringArray(input.accessories, "accessories"),
    distinctiveFeatures: validateStringArray(input.distinctiveFeatures, "distinctiveFeatures"),
    condition: validateString(input.condition || "unknown", "condition", 0, 40),
    visualDescription: validateString(input.visualDescription, "visualDescription", 0, 2000),
    foundLocation: validateString(input.foundLocation, "foundLocation", 1, 150, true),
    foundAt: validateTimestamp(input.foundAt, "foundAt"),
    metadata: validateMetadata(input.metadata),
    imageReference: input.imageReference ? validateId(input.imageReference, "imageReference") : null,
    imageEmbeddingReference: input.imageEmbeddingReference ? String(input.imageEmbeddingReference) : null,
  };
}

/**
 * Validates complete CandidateScoreCard input.
 */
export function validateCandidateScoreCardInput(
  input: Partial<CandidateScoreCard>
): Omit<CandidateScoreCard, "id" | "createdAt" | "updatedAt"> {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Candidate score card input must be an object.");
  }

  return {
    foundReportId: validateId(input.foundReportId, "foundReportId"),
    itemId: validateId(input.itemId, "itemId"),
    vectorSimilarity:
      typeof input.vectorSimilarity === "number" ? Math.max(0, Math.min(1, input.vectorSimilarity)) : null,
    attributeScore: validateScore(input.attributeScore ?? 0, "attributeScore"),
    uniqueClueScore: validateScore(input.uniqueClueScore ?? 0, "uniqueClueScore"),
    locationScore: validateScore(input.locationScore ?? 0, "locationScore"),
    timeScore: validateScore(input.timeScore ?? 0, "timeScore"),
    overallScore: validateScore(input.overallScore ?? 0, "overallScore"),
    confidenceTier: validateConfidenceTier(input.confidenceTier),
    status: validateCandidateStatus(input.status ?? "candidate"),
    evidence: validateStringArray(input.evidence, "evidence", 100, 500),
  };
}

/**
 * Validates complete VerificationEvidence input.
 */
export function validateVerificationEvidenceInput(
  input: Partial<VerificationEvidence>
): Omit<VerificationEvidence, "id" | "createdAt"> {
  if (!input || typeof input !== "object") {
    throw new ValidationError("Verification evidence input must be an object.");
  }

  return {
    candidateMatchId: validateId(input.candidateMatchId, "candidateMatchId"),
    itemId: validateId(input.itemId, "itemId"),
    question: validateString(input.question, "question", 3, 500, true),
    ownerAnswer: validateString(input.ownerAnswer, "ownerAnswer", 1, 1000, true),
    expectedEvidence: validateString(input.expectedEvidence, "expectedEvidence", 1, 1000, true),
    result: validateVerificationResult(input.result ?? "pending"),
    evidenceSource: validateString(input.evidenceSource || "owner_registration", "evidenceSource", 2, 80),
  };
}
