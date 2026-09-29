/**
 * KHOJ — Distinctive Physical Evidence Comparator
 * Evaluates physical marks (scratches, dents, stickers, engravings, damage).
 * Separates matches, motif conflicts, and unobserved/missing evidence.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "on", "in", "near", "by", "at", "with", "and", "of", "to", "for", "is", "side"
]);

const DAMAGE_TYPES = new Set([
  "scratch", "scratched", "dent", "dented", "crack", "cracked", "tear", "torn",
  "sticker", "engraved", "engraving", "mark", "scuff", "chip", "chipped", "wear", "frayed", "tape",
  "damage", "damaged", "broken", "peeled", "peeling"
]);

const LOCATION_WORDS = new Set([
  "front", "back", "left", "right", "top", "bottom", "hinge", "corner", "pocket",
  "slider", "lid", "headband", "cable", "tip", "button", "vent", "base", "case",
  "zipper", "strap", "handle", "runner"
]);

function tokenize(text: string): { subjects: string[]; types: string[]; locations: string[] } {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const subjects: string[] = [];
  const types: string[] = [];
  const locations: string[] = [];

  for (const word of words) {
    if (DAMAGE_TYPES.has(word)) {
      types.push(word);
    } else if (LOCATION_WORDS.has(word)) {
      locations.push(word);
    } else {
      subjects.push(word);
    }
  }

  return { subjects, types, locations };
}

export interface DistinctiveComparisonResult {
  score: number;                              // 0.00 - 1.00
  matchedFeatures: string[];
  conflicts: string[];
  missingEvidence: string[];
}

export function compareDistinctivePhysicalFeatures(
  ownerFeatures: string[],
  foundFeatures: string[]
): DistinctiveComparisonResult {
  // If owner reported no distinctive features
  if (!ownerFeatures || ownerFeatures.length === 0) {
    return {
      score: 0.0,
      matchedFeatures: [],
      conflicts: [],
      missingEvidence: foundFeatures.length > 0
        ? ["Found item has distinctive marks not noted in owner profile"]
        : [],
    };
  }

  const matchedFeatures: string[] = [];
  const conflicts: string[] = [];
  const missingEvidence: string[] = [];

  let matchCredit = 0;

  for (const ownerFeat of ownerFeatures) {
    const ownerTok = tokenize(ownerFeat);
    let bestMatchScore = 0;
    let bestFoundFeat = "";
    let detectedConflict: string | null = null;

    for (const foundFeat of foundFeatures) {
      if (ownerFeat.trim().toLowerCase() === foundFeat.trim().toLowerCase()) {
        bestMatchScore = 1.0;
        bestFoundFeat = foundFeat;
        break;
      }

      const foundTok = tokenize(foundFeat);

      // Check damage type overlap
      const typeOverlap = ownerTok.types.filter((t) => foundTok.types.includes(t));
      // Check location overlap
      const locOverlap = ownerTok.locations.filter((l) => foundTok.locations.includes(l));
      // Check subject overlap
      const subjOverlap = ownerTok.subjects.filter((s) => foundTok.subjects.includes(s));

      const isSameType = typeOverlap.length > 0;
      const isSameLoc = locOverlap.length > 0;

      // Conflict detection for motifs/stickers:
      // If same location and both are stickers/engravings, but subjects are mutually exclusive (e.g. superman vs football)
      const isMotif = ownerTok.types.some((t) => ["sticker", "engraved", "engraving"].includes(t));
      if (isMotif && isSameLoc && ownerTok.subjects.length > 0 && foundTok.subjects.length > 0) {
        if (subjOverlap.length === 0) {
          detectedConflict = `Distinctive motif conflict: owner reported '${ownerFeat}', found item has '${foundFeat}'`;
          continue;
        }
      }

      // Physical & Custom Accessory match scoring
      const hasSubjectOverlap = subjOverlap.length > 0;
      if (isSameType || hasSubjectOverlap) {
        if (subjOverlap.length > 0 && isSameLoc) {
          bestMatchScore = Math.max(bestMatchScore, 1.0);
          bestFoundFeat = foundFeat;
        } else if (subjOverlap.length > 0 || (isSameType && isSameLoc)) {
          bestMatchScore = Math.max(bestMatchScore, 0.85);
          bestFoundFeat = foundFeat;
        } else {
          bestMatchScore = Math.max(bestMatchScore, 0.50);
          bestFoundFeat = foundFeat;
        }
      }
    }

    if (bestMatchScore >= 0.70) {
      matchCredit += bestMatchScore;
      matchedFeatures.push(
        `Distinctive mark matched: '${ownerFeat}' aligns with observed '${bestFoundFeat}'`
      );
    } else if (detectedConflict) {
      conflicts.push(detectedConflict);
    } else {
      // Unobserved mark is cataloged as MISSING evidence, NOT a contradiction!
      missingEvidence.push(
        `Unobserved feature: owner reported '${ownerFeat}' (not observed on found item)`
      );
    }
  }

  // Calculate raw distinctive score
  const maxPossible = ownerFeatures.length;
  let rawScore = maxPossible > 0 ? matchCredit / maxPossible : 0.0;

  // Penalize for explicit distinctive conflicts
  if (conflicts.length > 0) {
    rawScore = Math.max(0.0, rawScore - conflicts.length * 0.40);
  }

  return {
    score: Number(Math.min(1.0, Math.max(0.0, rawScore)).toFixed(2)),
    matchedFeatures,
    conflicts,
    missingEvidence,
  };
}
