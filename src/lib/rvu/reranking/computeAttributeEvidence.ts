/**
 * KHOJ — Structured Attribute Evidence Comparator
 * Compares generic properties (category, subcategory, brand, model, color, material).
 * Enforces hard conflict detection while preserving unknown/unobserved attributes.
 */

export interface AttributeComparisonResult {
  score: number;                              // 0.00 - 1.00
  matchedAttributes: string[];
  conflicts: string[];
  missingEvidence: string[];
}

const CATEGORY_MAP: Record<string, string[]> = {
  electronics: ["electronics", "charger", "gadgets", "device"],
  bags: ["bags", "backpack", "accessories"],
  accessories: ["accessories", "water bottles", "wallets", "keys", "bags"],
  "id cards": ["id cards", "identity", "cards"],
};

function normalize(val: string | null | undefined): string {
  if (!val) return "";
  return val.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function compareStructuredAttributes(params: {
  ownerCategory: string;
  foundCategory: string;
  ownerBrand: string;
  foundBrand: string;
  ownerModel?: string;
  foundModel?: string;
  ownerColor: string;
  foundColor: string;
  ownerMaterial?: string;
  foundMaterial?: string;
}): AttributeComparisonResult {
  const matchedAttributes: string[] = [];
  const conflicts: string[] = [];
  const missingEvidence: string[] = [];

  let totalWeight = 0;
  let earnedWeight = 0;

  // 1. Category (Weight: 35% of attribute block)
  totalWeight += 35;
  const oCat = normalize(params.ownerCategory);
  const fCat = normalize(params.foundCategory);

  if (oCat && fCat) {
    if (oCat === fCat) {
      earnedWeight += 35;
      matchedAttributes.push(`Category match: ${params.ownerCategory}`);
    } else {
      const allowed = CATEGORY_MAP[oCat] || [oCat];
      if (allowed.some((c) => fCat.includes(c) || c.includes(fCat))) {
        earnedWeight += 25;
        matchedAttributes.push(`Category compatible: ${params.ownerCategory} ~ ${params.foundCategory}`);
      } else {
        conflicts.push(`Hard category contradiction: owner '${params.ownerCategory}' vs found '${params.foundCategory}'`);
      }
    }
  } else {
    missingEvidence.push("Category unconfirmed in one or both records");
  }

  // 2. Brand (Weight: 25% of attribute block)
  totalWeight += 25;
  const oBrand = normalize(params.ownerBrand);
  const fBrand = normalize(params.foundBrand);

  if (oBrand && fBrand) {
    if (oBrand === fBrand || oBrand.includes(fBrand) || fBrand.includes(oBrand)) {
      earnedWeight += 25;
      matchedAttributes.push(`Brand match: ${params.ownerBrand}`);
    } else {
      // Strong brand conflict
      conflicts.push(`Brand conflict: owner reported '${params.ownerBrand}', found item is '${params.foundBrand}'`);
    }
  } else if (!oBrand || !fBrand) {
    // Unseen brand is UNKNOWN, never a conflict!
    missingEvidence.push(`Brand not verified (${!oBrand ? "owner omitted" : "finder could not determine"})`);
    earnedWeight += 12; // Partial baseline credit for unobserved brand
  }

  // 3. Color (Weight: 25% of attribute block)
  totalWeight += 25;
  const oColor = normalize(params.ownerColor);
  const fColor = normalize(params.foundColor);

  if (oColor && fColor) {
    if (oColor === fColor || oColor.includes(fColor) || fColor.includes(oColor)) {
      earnedWeight += 25;
      matchedAttributes.push(`Color match: ${params.ownerColor}`);
    } else if (
      (oColor.includes("gray") && fColor.includes("gray")) ||
      (oColor.includes("black") && fColor.includes("dark"))
    ) {
      earnedWeight += 20;
      matchedAttributes.push(`Color tone compatible: ${params.ownerColor} ~ ${params.foundColor}`);
    } else {
      conflicts.push(`Color contradiction: owner '${params.ownerColor}' vs observed '${params.foundColor}'`);
    }
  } else {
    missingEvidence.push("Color unverified");
    earnedWeight += 10;
  }

  // 4. Model & Material (Weight: 15% of attribute block)
  totalWeight += 15;
  const oModel = normalize(params.ownerModel);
  const fModel = normalize(params.foundModel);

  if (oModel && fModel) {
    if (oModel === fModel || oModel.includes(fModel) || fModel.includes(oModel)) {
      earnedWeight += 15;
      matchedAttributes.push(`Model match: ${params.ownerModel}`);
    } else {
      earnedWeight += 5; // Different sub-models may still be visually similar
      missingEvidence.push(`Model variation: owner '${params.ownerModel}' vs found '${params.foundModel}'`);
    }
  } else {
    missingEvidence.push("Specific model designation unobserved");
    earnedWeight += 7;
  }

  let rawScore = earnedWeight / totalWeight;

  // Harsh penalty if hard conflicts exist
  if (conflicts.length > 0) {
    rawScore = Math.min(rawScore, 0.35);
  }

  return {
    score: Number(Math.min(1.0, Math.max(0.0, rawScore)).toFixed(2)),
    matchedAttributes,
    conflicts,
    missingEvidence,
  };
}
