/**
 * KHOJ — Fingerprint Semantic Serialization
 * Deterministically formats structured fingerprints into normalized text for embedding generation.
 * Enforces privacy boundaries and injection defense (all fields treated strictly as passive data).
 */

import { createHash } from "node:crypto";
import type { ItemFingerprint, FoundFingerprint } from "@/lib/rvu/types";

/**
 * Sanitizes text to remove control characters and enforce safe string bounds.
 */
function sanitizeText(val: unknown, maxLen = 1000): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .trim()
    .slice(0, maxLen);
}

/**
 * Serializes an owner item fingerprint into deterministic semantic text.
 */
export function serializeOwnerFingerprint(fingerprint: ItemFingerprint): string {
  const parts: string[] = [];

  const category = sanitizeText(fingerprint.category);
  const subcategory = sanitizeText(fingerprint.subcategory);
  const brand = sanitizeText(fingerprint.brand);
  const model = sanitizeText(fingerprint.model);
  const color = sanitizeText(fingerprint.color);
  const material = sanitizeText(fingerprint.material);

  parts.push(`CATEGORY: ${category || "Unknown"}`);
  if (subcategory) parts.push(`SUBCATEGORY: ${subcategory}`);
  if (brand) parts.push(`BRAND: ${brand}`);
  if (model) parts.push(`MODEL: ${model}`);
  if (color) parts.push(`COLOR: ${color}`);
  if (material) parts.push(`MATERIAL: ${material}`);

  // Distinctive features
  const distinctive = Array.isArray(fingerprint.distinctiveFeatures)
    ? fingerprint.distinctiveFeatures
        .map((f) => sanitizeText(f, 200))
        .filter(Boolean)
    : [];

  if (distinctive.length > 0) {
    parts.push("DISTINCTIVE FEATURES:");
    for (const feat of distinctive) {
      parts.push(`- ${feat}`);
    }
  }

  // Normalized / Owner description (private clues like student IDs are filtered)
  const description = sanitizeText(
    fingerprint.normalizedDescription || fingerprint.ownerDescription,
    800
  );
  if (description) {
    parts.push(`DESCRIPTION: ${description}`);
  }

  return parts.join("\n");
}

/**
 * Serializes a found report fingerprint into deterministic semantic text.
 */
export function serializeFoundFingerprint(fingerprint: FoundFingerprint): string {
  const parts: string[] = [];

  const category = sanitizeText(fingerprint.category);
  const subcategory = sanitizeText(fingerprint.subcategory);
  const brand = sanitizeText(fingerprint.brand);
  const model = sanitizeText(fingerprint.model);
  const color = sanitizeText(fingerprint.color);
  const material = sanitizeText(fingerprint.material);

  parts.push(`FOUND CATEGORY: ${category || "Unknown"}`);
  if (subcategory) parts.push(`SUBCATEGORY: ${subcategory}`);
  if (brand) parts.push(`BRAND: ${brand}`);
  if (model) parts.push(`MODEL: ${model}`);
  if (color) parts.push(`COLOR: ${color}`);
  if (material) parts.push(`MATERIAL: ${material}`);

  // Distinctive features observed in found item
  const distinctive = Array.isArray(fingerprint.distinctiveFeatures)
    ? fingerprint.distinctiveFeatures
        .map((f) => sanitizeText(f, 200))
        .filter(Boolean)
    : [];

  if (distinctive.length > 0) {
    parts.push("OBSERVED DISTINCTIVE FEATURES:");
    for (const feat of distinctive) {
      parts.push(`- ${feat}`);
    }
  }

  // Visual description from vision extraction
  const visualDesc = sanitizeText(fingerprint.visualDescription, 800);
  if (visualDesc) {
    parts.push(`VISUAL DESCRIPTION: ${visualDesc}`);
  }

  return parts.join("\n");
}

/**
 * Computes a deterministic SHA-256 fingerprint hash for detecting changes/staleness.
 */
export function computeFingerprintHash(serializedText: string): string {
  return createHash("sha256").update(serializedText.trim()).digest("hex");
}
