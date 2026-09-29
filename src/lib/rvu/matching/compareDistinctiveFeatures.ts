/**
 * KHOJ — Distinctive Feature Comparison
 * Compares owner physical marks (scratches, dents, stickers, engravings, customizations)
 * against visual evidence found in the finder photo.
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. MOST IMPORTANT COMPONENT: Distinctive features carry 50% baseline matching weight.
 * 2. CONTROLLED TEXT SIMILARITY: Recognizes compatible evidence across wording variations without LLM verdicts.
 * 3. ABSENCE IS NOT NEGATION: An unobserved mark on the back of an item is MISSING EVIDENCE, not a conflict.
 * 4. MUTUALLY EXCLUSIVE MARKS ARE CONFLICTS: A blue football sticker vs red Superman sticker in the same spot is a CONFLICT.
 */

import { DistinctiveComparisonResult } from "./matchingTypes";

export interface DistinctiveFeaturesComparison {
  score: number; // 0.0 to 1.0
  matchedFeatures: string[];
  missingEvidence: string[];
  conflicts: string[];
  detailedResults: DistinctiveComparisonResult[];
}

interface ParsedDistinctiveItem {
  raw: string;
  type: string;
  description: string;
  keywords: string[];
  subjectTokens: string[];
  locationTokens: string[];
  location?: string | null;
}

/**
 * Normalizes and parses raw distinctive feature strings.
 */
function parseFeature(item: string): ParsedDistinctiveItem {
  let type = "marking";
  let description = item.trim();

  // Strip prefix like "STICKER: " or "SCRATCH: "
  const prefixMatch = description.match(/^([A-Z_]+):\s*(.+)$/i);
  if (prefixMatch) {
    type = prefixMatch[1].toLowerCase();
    description = prefixMatch[2].trim();
  } else {
    const lower = description.toLowerCase();
    if (lower.includes("scratch") || lower.includes("scuff")) type = "scratch";
    else if (lower.includes("dent") || lower.includes("ding")) type = "dent";
    else if (lower.includes("sticker") || lower.includes("patch") || lower.includes("decal")) type = "sticker";
    else if (lower.includes("engrav") || lower.includes("initial")) type = "engraving";
    else if (lower.includes("crack") || lower.includes("broken")) type = "crack";
    else if (lower.includes("stain") || lower.includes("mark")) type = "stain";
    else if (lower.includes("tape") || lower.includes("keychain") || lower.includes("lanyard")) type = "customization";
  }

  // Extract location if present in parentheses e.g. "(near hinge)"
  let location: string | null = null;
  const locMatch = description.match(/\(([^)]+)\)$/);
  if (locMatch) {
    location = locMatch[1].trim();
  }

  // Significant content tokens (>= 3 chars, skip common stopwords)
  const stopwords = new Set([
    "the", "and", "with", "near", "left", "right", "side", "small", "tiny", "minor",
    "has", "had", "this", "that", "there", "some", "item", "object", "lid", "part"
  ]);

  const typeWords = new Set([
    "sticker", "stickers", "decal", "decals", "patch", "patches", "scratch", "scratches",
    "dent", "dents", "crack", "cracked", "damage", "marking", "mark", "stain", "stains"
  ]);

  const locationWords = new Set([
    "front", "back", "pocket", "hinge", "corner", "bottom", "top", "edge", "rim", "side", "slider", "band"
  ]);

  const allWords = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w));

  const subjectTokens = allWords.filter((w) => !typeWords.has(w) && !locationWords.has(w));
  const locationTokens = allWords.filter((w) => locationWords.has(w));

  return {
    raw: item,
    type,
    description,
    keywords: allWords,
    subjectTokens,
    locationTokens,
    location,
  };
}

/**
 * Computes Jaccard/Token overlap between two keyword lists.
 */
function computeKeywordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const common = a.filter((w) => setB.has(w));
  return common.length / Math.min(a.length, b.length);
}

/**
 * Compares owner distinctive features against found distinctive features and extracted OCR text.
 */
export function compareDistinctiveFeatures(
  ownerFeatures: string[],
  foundFeatures: string[],
  foundExtractedText: string[] = []
): DistinctiveFeaturesComparison {
  const matchedFeatures: string[] = [];
  const missingEvidence: string[] = [];
  const conflicts: string[] = [];
  const detailedResults: DistinctiveComparisonResult[] = [];

  // Case 1: Owner recorded NO distinctive features
  if (!ownerFeatures || ownerFeatures.length === 0) {
    if (foundFeatures && foundFeatures.length > 0) {
      // Found item has distinctive marks (e.g. prominent sticker), but owner reported none
      return {
        score: 0.40,
        matchedFeatures: [],
        missingEvidence: [
          `Found item has ${foundFeatures.length} visible distinctive marks not mentioned in owner description`,
        ],
        conflicts: [],
        detailedResults: [],
      };
    }
    // Both owner and found have no distinctive features (generic items)
    return {
      score: 0.50, // Neutral baseline for plain items
      matchedFeatures: [],
      missingEvidence: ["No distinctive damage, stickers, or customizations recorded"],
      conflicts: [],
      detailedResults: [],
    };
  }

  const parsedOwner = ownerFeatures.map(parseFeature);
  const parsedFound = (foundFeatures || []).map(parseFeature);
  const extractedTextJoined = foundExtractedText.join(" ").toLowerCase();

  let totalScoreSum = 0;

  for (const oItem of parsedOwner) {
    let bestMatchScore = 0;
    let bestMatchedFound: ParsedDistinctiveItem | null = null;
    let isDirectConflict = false;
    let conflictReason = "";

    // 1. Check OCR / extracted text for engravings or named stickers (e.g. "Spider-Man", initials "KS")
    for (const kw of oItem.keywords) {
      if (extractedTextJoined.includes(kw)) {
        bestMatchScore = Math.max(bestMatchScore, 0.90);
      }
    }

    // 2. Compare against found distinctive features
    for (const fItem of parsedFound) {
      const typeMatches = oItem.type === fItem.type;
      const subjectOverlap = computeKeywordOverlap(oItem.subjectTokens, fItem.subjectTokens);
      const totalOverlap = computeKeywordOverlap(oItem.keywords, fItem.keywords);

      if (typeMatches) {
        if (oItem.type === "sticker" || oItem.type === "engraving") {
          if (subjectOverlap >= 0.35 || (oItem.subjectTokens.length === 0 && totalOverlap >= 0.4)) {
            const score = 0.65 + Math.max(subjectOverlap, totalOverlap) * 0.35;
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatchedFound = fItem;
            }
          } else if (
            subjectOverlap === 0 &&
            oItem.subjectTokens.length > 0 &&
            fItem.subjectTokens.length > 0
          ) {
            isDirectConflict = true;
            conflictReason = `Distinctive conflict: owner reported ${oItem.description}, but found item has ${fItem.description}`;
          }
        } else {
          // Physical marks: scratches, dents, cracks, stains, damage
          // If location or keywords overlap, they describe the same physical mark
          if (totalOverlap >= 0.35 || subjectOverlap >= 0.35) {
            const score = 0.70 + Math.max(subjectOverlap, totalOverlap) * 0.30;
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatchedFound = fItem;
            }
          }
        }
      } else if (totalOverlap >= 0.6) {
        const score = 0.65;
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatchedFound = fItem;
        }
      }
    }

    if (bestMatchScore >= 0.70) {
      const desc = bestMatchedFound
        ? `${oItem.description} ~ ${bestMatchedFound.description}`
        : oItem.description;
      matchedFeatures.push(desc);
      detailedResults.push({
        ownerFeature: oItem.description,
        foundFeature: bestMatchedFound ? bestMatchedFound.description : "Observed in photo",
        similarity: bestMatchScore,
        status: "match",
        featureDescription: desc,
      });
      totalScoreSum += bestMatchScore;
    } else if (bestMatchScore >= 0.40) {
      const desc = bestMatchedFound
        ? `Partial match: ${oItem.description} ~ ${bestMatchedFound.description}`
        : `Partial match: ${oItem.description}`;
      matchedFeatures.push(desc);
      detailedResults.push({
        ownerFeature: oItem.description,
        foundFeature: bestMatchedFound ? bestMatchedFound.description : null,
        similarity: bestMatchScore,
        status: "partial",
        featureDescription: desc,
      });
      totalScoreSum += bestMatchScore;
    } else if (isDirectConflict) {
      conflicts.push(conflictReason);
      detailedResults.push({
        ownerFeature: oItem.description,
        foundFeature: null,
        similarity: 0.0,
        status: "conflict",
        featureDescription: conflictReason,
      });
      totalScoreSum += 0.0;
    } else {
      // Unseen evidence (e.g. scratch not visible from current camera angle)
      missingEvidence.push(`Feature not visibly confirmed: "${oItem.description}"`);
      detailedResults.push({
        ownerFeature: oItem.description,
        foundFeature: null,
        similarity: 0.30,
        status: "missing_in_found",
        featureDescription: `Unobserved: ${oItem.description}`,
      });
      totalScoreSum += 0.30;
    }
  }

  let finalScore = totalScoreSum / parsedOwner.length;

  // Severe penalty if direct conflicting distinctive marks exist
  if (conflicts.length > 0) {
    finalScore = Math.min(finalScore, 0.20);
  }

  return {
    score: Math.max(0, Math.min(1, Math.round(finalScore * 100) / 100)),
    matchedFeatures,
    missingEvidence,
    conflicts,
    detailedResults,
  };
}
