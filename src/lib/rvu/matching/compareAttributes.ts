/**
 * KHOJ — Generic Attribute Comparison
 * Deterministic comparison of category, subcategory, brand, model, color, material, and shape.
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. CONFLICT vs. UNKNOWN: Clearly distinguish between contradictory evidence and absent evidence.
 * 2. GENERIC ATTRIBUTES ARE WEAK EVIDENCE: A match on "black + backpack" does not prove identity.
 * 3. BRAND / COLOR CONFLICTS: Strongly lower candidate plausibility.
 */

import { AttributeComparisonResult, ComparisonStatus } from "./matchingTypes";
import { normalizeBrand, normalizeCategory, normalizeModel } from "../fingerprints/normalizeFingerprint";

export interface GenericAttributesComparison {
  score: number; // 0.0 to 1.0
  attributeResults: AttributeComparisonResult[];
  matchingAttributes: string[];
  conflicts: string[];
  missingEvidence: string[];
  isCategoryCompatible: boolean;
}

/**
 * Checks if two categories are plausibly compatible.
 */
export function areCategoriesCompatible(catA: string, catB: string): boolean {
  if (!catA || !catB) return true; // Give benefit of doubt if category unassigned
  const normA = normalizeCategory(catA).toLowerCase();
  const normB = normalizeCategory(catB).toLowerCase();

  if (normA === normB) return true;
  if (normA === "other" || normB === "other") return true;

  // Cross-category compatibility for campus items
  const compatiblePairs: Array<[string, string]> = [
    ["accessories", "other"],
    ["bags", "accessories"],
    ["books & stationery", "accessories"],
    ["bottles & tumblers", "accessories"],
    ["bottles & tumblers", "other"],
    ["cards & ids", "id cards"],
    ["bags & backpacks", "bags"],
    ["books & notes", "books & stationery"],
  ];

  for (const [p1, p2] of compatiblePairs) {
    if ((normA === p1 && normB === p2) || (normA === p2 && normB === p1)) {
      return true;
    }
  }

  return false;
}

/**
 * Compares owner generic attributes against found generic attributes.
 */
export function compareGenericAttributes(
  owner: {
    category: string;
    subcategory?: string | null;
    brand?: string | null;
    model?: string | null;
    color: string;
    secondaryColors?: string[];
    material?: string | null;
    shape?: string | null;
  },
  found: {
    category: string;
    subcategory?: string | null;
    brand?: string | null;
    model?: string | null;
    color: string;
    secondaryColors?: string[];
    material?: string | null;
    shape?: string | null;
  }
): GenericAttributesComparison {
  const results: AttributeComparisonResult[] = [];
  const matchingAttributes: string[] = [];
  const conflicts: string[] = [];
  const missingEvidence: string[] = [];

  // 1. Category comparison
  const catA = normalizeCategory(owner.category);
  const catB = normalizeCategory(found.category);
  const isCategoryCompatible = areCategoriesCompatible(catA, catB);

  if (catA === catB) {
    results.push({
      attribute: "category",
      ownerValue: catA,
      foundValue: catB,
      status: "match",
      score: 1.0,
      isConflict: false,
      isMissing: false,
    });
    matchingAttributes.push(`Category: ${catA}`);
  } else if (isCategoryCompatible) {
    results.push({
      attribute: "category",
      ownerValue: catA,
      foundValue: catB,
      status: "compatible",
      score: 0.7,
      isConflict: false,
      isMissing: false,
    });
    matchingAttributes.push(`Compatible category: ${catA} ~ ${catB}`);
  } else {
    results.push({
      attribute: "category",
      ownerValue: catA,
      foundValue: catB,
      status: "conflict",
      score: 0.0,
      isConflict: true,
      isMissing: false,
    });
    conflicts.push(`Incompatible category: owner has "${catA}", found item is "${catB}"`);
  }

  // 2. Subcategory comparison
  const subA = owner.subcategory?.trim();
  const subB = found.subcategory?.trim();
  if (subA && subB) {
    if (subA.toLowerCase() === subB.toLowerCase()) {
      results.push({
        attribute: "subcategory",
        ownerValue: subA,
        foundValue: subB,
        status: "match",
        score: 1.0,
        isConflict: false,
        isMissing: false,
      });
      matchingAttributes.push(`Subcategory: ${subA}`);
    } else {
      results.push({
        attribute: "subcategory",
        ownerValue: subA,
        foundValue: subB,
        status: "conflict",
        score: 0.2,
        isConflict: true,
        isMissing: false,
      });
      conflicts.push(`Subcategory difference: owner "${subA}" vs found "${subB}"`);
    }
  } else {
    results.push({
      attribute: "subcategory",
      ownerValue: subA || null,
      foundValue: subB || null,
      status: "unknown",
      score: 0.5,
      isConflict: false,
      isMissing: true,
    });
    missingEvidence.push("Subcategory not specified on both items");
  }

  // 3. Brand comparison
  const brandA = owner.brand ? normalizeBrand(owner.brand) : "";
  const brandB = found.brand ? normalizeBrand(found.brand) : "";

  if (brandA && brandB) {
    if (brandA.toLowerCase() === brandB.toLowerCase()) {
      results.push({
        attribute: "brand",
        ownerValue: brandA,
        foundValue: brandB,
        status: "match",
        score: 1.0,
        isConflict: false,
        isMissing: false,
      });
      matchingAttributes.push(`Brand: ${brandA}`);
    } else {
      results.push({
        attribute: "brand",
        ownerValue: brandA,
        foundValue: brandB,
        status: "conflict",
        score: 0.0,
        isConflict: true,
        isMissing: false,
      });
      conflicts.push(`Brand conflict: owner has "${brandA}", found is "${brandB}"`);
    }
  } else {
    results.push({
      attribute: "brand",
      ownerValue: brandA || null,
      foundValue: brandB || null,
      status: "unknown",
      score: 0.5,
      isConflict: false,
      isMissing: true,
    });
    missingEvidence.push(brandA ? "Brand not visible on found item" : "Owner did not specify brand");
  }

  // 4. Model comparison
  const modelA = owner.model ? normalizeModel(owner.model, brandA) : "";
  const modelB = found.model ? normalizeModel(found.model, brandB) : "";

  if (modelA && modelB) {
    if (modelA.toLowerCase() === modelB.toLowerCase()) {
      results.push({
        attribute: "model",
        ownerValue: modelA,
        foundValue: modelB,
        status: "match",
        score: 1.0,
        isConflict: false,
        isMissing: false,
      });
      matchingAttributes.push(`Model: ${modelA}`);
    } else if (
      modelA.toLowerCase().includes(modelB.toLowerCase()) ||
      modelB.toLowerCase().includes(modelA.toLowerCase())
    ) {
      results.push({
        attribute: "model",
        ownerValue: modelA,
        foundValue: modelB,
        status: "compatible",
        score: 0.75,
        isConflict: false,
        isMissing: false,
      });
      matchingAttributes.push(`Compatible model variant: ${modelA} ~ ${modelB}`);
    } else {
      results.push({
        attribute: "model",
        ownerValue: modelA,
        foundValue: modelB,
        status: "conflict",
        score: 0.1,
        isConflict: true,
        isMissing: false,
      });
      conflicts.push(`Model difference: owner "${modelA}" vs found "${modelB}"`);
    }
  } else {
    results.push({
      attribute: "model",
      ownerValue: modelA || null,
      foundValue: modelB || null,
      status: "unknown",
      score: 0.5,
      isConflict: false,
      isMissing: true,
    });
    missingEvidence.push(modelA ? "Specific model not confirmed on found item" : "Model not specified");
  }

  // 5. Color comparison
  const colorA = (owner.color || "").toLowerCase().trim();
  const colorB = (found.color || "").toLowerCase().trim();

  const ownerAllColors = [colorA, ...(owner.secondaryColors || []).map((c) => c.toLowerCase())].filter(Boolean);
  const foundAllColors = [colorB, ...(found.secondaryColors || []).map((c) => c.toLowerCase())].filter(Boolean);

  if (colorA && colorB && colorA !== "unknown" && colorB !== "unknown") {
    if (colorA === colorB) {
      results.push({
        attribute: "color",
        ownerValue: owner.color,
        foundValue: found.color,
        status: "match",
        score: 1.0,
        isConflict: false,
        isMissing: false,
      });
      matchingAttributes.push(`Color: ${owner.color}`);
    } else if (
      ownerAllColors.some((oc) => foundAllColors.includes(oc)) ||
      areColorsCompatible(colorA, colorB)
    ) {
      results.push({
        attribute: "color",
        ownerValue: owner.color,
        foundValue: found.color,
        status: "compatible",
        score: 0.75,
        isConflict: false,
        isMissing: false,
      });
      matchingAttributes.push(`Compatible color palette: ${owner.color} ~ ${found.color}`);
    } else {
      results.push({
        attribute: "color",
        ownerValue: owner.color,
        foundValue: found.color,
        status: "conflict",
        score: 0.0,
        isConflict: true,
        isMissing: false,
      });
      conflicts.push(`Color conflict: owner reported "${owner.color}", but found is "${found.color}"`);
    }
  } else {
    results.push({
      attribute: "color",
      ownerValue: owner.color || null,
      foundValue: found.color || null,
      status: "unknown",
      score: 0.5,
      isConflict: false,
      isMissing: true,
    });
    missingEvidence.push("Color unconfirmed or unknown");
  }

  // 6. Material comparison
  const matA = owner.material?.trim();
  const matB = found.material?.trim();
  if (matA && matB) {
    if (matA.toLowerCase() === matB.toLowerCase()) {
      results.push({
        attribute: "material",
        ownerValue: matA,
        foundValue: matB,
        status: "match",
        score: 1.0,
        isConflict: false,
        isMissing: false,
      });
      matchingAttributes.push(`Material: ${matA}`);
    } else {
      results.push({
        attribute: "material",
        ownerValue: matA,
        foundValue: matB,
        status: "conflict",
        score: 0.2,
        isConflict: true,
        isMissing: false,
      });
      conflicts.push(`Material difference: owner "${matA}" vs found "${matB}"`);
    }
  }

  // Compute composite score for generic attributes
  // Weights: category (0.25), brand (0.30), color (0.25), model (0.15), subcategory/material (0.05)
  const catScore = results.find((r) => r.attribute === "category")?.score ?? 0.5;
  const brandScore = results.find((r) => r.attribute === "brand")?.score ?? 0.5;
  const colorScore = results.find((r) => r.attribute === "color")?.score ?? 0.5;
  const modelScore = results.find((r) => r.attribute === "model")?.score ?? 0.5;
  const subScore = results.find((r) => r.attribute === "subcategory")?.score ?? 0.5;

  let composite =
    catScore * 0.25 +
    brandScore * 0.30 +
    colorScore * 0.25 +
    modelScore * 0.15 +
    subScore * 0.05;

  // Severe penalty if direct category or brand conflict
  if (conflicts.some((c) => c.includes("Incompatible category") || c.includes("Brand conflict"))) {
    composite = Math.min(composite, 0.25);
  }

  // Penalty if direct color conflict
  if (conflicts.some((c) => c.includes("Color conflict"))) {
    composite = Math.min(composite, 0.40);
  }

  return {
    score: Math.max(0, Math.min(1, Math.round(composite * 100) / 100)),
    attributeResults: results,
    matchingAttributes,
    conflicts,
    missingEvidence,
    isCategoryCompatible,
  };
}

function areColorsCompatible(c1: string, c2: string): boolean {
  const c1Low = c1.toLowerCase();
  const c2Low = c2.toLowerCase();
  const grays = ["gray", "grey", "space gray", "silver", "dark gray"];
  if (grays.some((g) => c1Low.includes(g)) && grays.some((g) => c2Low.includes(g))) {
    return true;
  }
  const darks = ["black", "dark gray", "navy", "dark blue"];
  if (darks.some((d) => c1Low.includes(d)) && darks.some((d) => c2Low.includes(d))) {
    return true;
  }
  return false;
}
