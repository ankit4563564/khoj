/**
 * KHOJ — Phase 7: Answer Evaluator
 * Deterministically evaluates claimant natural language answers against protected owner evidence.
 * 
 * CRITICAL REQUIREMENTS:
 * - Distinguish STRONG PRIVATE EVIDENCE from GENERIC-ONLY answers.
 * - Distinguish UNKNOWN / INCOMPLETE ("I don't remember") from STRONG CONTRADICTIONS ("blue football sticker").
 * - Defend against prompt injection (treat all text strictly as literal data).
 * - Never output an opaque probability; produce explainable deterministic scores.
 */

import type { ItemFingerprint, ProtectedItem } from "@/lib/rvu/types";
import type { AnswerEvaluationResult, VerificationChallenge, VerificationStrength } from "./verificationTypes";
import { VERIFICATION_CONFIG } from "./verificationConfig";

// Stopwords to strip for clean token comparison
const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "by", "for", "with", "about", "against", "between",
  "into", "through", "during", "before", "after", "above", "below", "to", "from", "up",
  "down", "of", "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can",
  "will", "just", "don", "should", "now", "it", "its", "has", "have", "had", "my", "is",
  "was", "there", "there's", "theres", "near", "side", "item", "one", "got"
]);

// Semantic stem dictionary for normalization
const STEM_MAP: Record<string, string> = {
  // Damage
  scratch: "scratch",
  scratched: "scratch",
  scratches: "scratch",
  scuff: "scratch",
  scuffs: "scratch",
  mark: "scratch",
  marks: "scratch",
  nick: "scratch",
  dent: "dent",
  dented: "dent",
  dents: "dent",
  ding: "dent",
  crack: "crack",
  cracked: "crack",
  cracks: "crack",
  fracture: "crack",
  tear: "tear",
  torn: "tear",
  tears: "tear",
  rip: "tear",
  ripped: "tear",
  chip: "chip",
  chipped: "chip",
  chips: "chip",
  damage: "damage",
  damaged: "damage",
  broken: "broken",
  broke: "broken",

  // Customizations & stickers
  sticker: "sticker",
  stickers: "sticker",
  decal: "sticker",
  decals: "sticker",
  patch: "sticker",
  patches: "sticker",
  superman: "superman",
  superhero: "superman",
  batman: "batman",
  football: "football",
  soccer: "football",
  marvel: "marvel",
  naruto: "naruto",
  anime: "anime",
  octocat: "octocat",
  github: "github",
  linux: "linux",
  penguin: "linux",

  // Engravings & text
  engraving: "engrave",
  engraved: "engrave",
  initials: "initials",
  laser: "engrave",
  inscribed: "engrave",

  // Accessories
  keychain: "keychain",
  charm: "keychain",
  carabiner: "carabiner",
  tag: "tag",
  strap: "strap",
  lanyard: "strap",
  zipper: "zipper",
  pull: "zipper",
  tie: "tie",
  tape: "tape",

  // Locations & anatomical parts
  front: "front",
  back: "back",
  rear: "back",
  left: "left",
  right: "right",
  hinge: "hinge",
  pocket: "pocket",
  pockets: "pocket",
  corner: "corner",
  corners: "corner",
  bottom: "bottom",
  base: "bottom",
  top: "top",
  lid: "lid",
  case: "case",

  // Colors & tones
  black: "black",
  dark: "black",
  white: "white",
  red: "red",
  blue: "blue",
  green: "green",
  yellow: "yellow",
  silver: "silver",
  gray: "silver",
  grey: "silver",
};

// Generic-only tokens
const GENERIC_TOKENS = new Set([
  "airpods", "pro", "apple", "backpack", "bag", "wildcraft", "bottle", "water",
  "milton", "hydroflask", "laptop", "macbook", "dell", "lenovo", "thinkpad",
  "phone", "iphone", "samsung", "charger", "cable", "headphones", "sony",
  "umbrella", "wallet", "keys", "id", "card", "notebook", "pen", "white", "black", "blue", "red", "gray"
]);

// Contradictory motif pairs
const CONFLICTING_MOTIFS: [string, string][] = [
  ["superman", "football"],
  ["batman", "superman"],
  ["football", "batman"],
  ["marvel", "dc"],
  ["naruto", "dragonball"],
  ["apple", "samsung"],
  ["apple", "dell"],
  ["wildcraft", "nike"],
];

/**
 * Tokenizes and normalizes an input string into canonical semantic stems.
 */
export function normalizeAnswerTokens(textStr: string): string[] {
  if (!textStr || typeof textStr !== "string") return [];
  const words = textStr
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  return words.map((w) => STEM_MAP[w] || w);
}

/**
 * Checks if the answer contains prompt-injection patterns.
 */
function containsInjectionPatterns(textStr: string): boolean {
  const lower = textStr.toLowerCase();
  return (
    lower.includes("ignore previous instructions") ||
    lower.includes("system prompt") ||
    lower.includes("approve this claim") ||
    lower.includes("output verified: true") ||
    lower.includes("you are now") ||
    lower.includes("bypass verification") ||
    lower.includes("give me the private clue") ||
    lower.includes("tell me the answer") ||
    lower.includes("show me the clue") ||
    lower.includes("expected answer")
  );
}

/**
 * Checks if the answer expresses lack of knowledge / incomplete memory.
 */
function isUnknownOrIncomplete(textStr: string): boolean {
  const lower = textStr.toLowerCase().trim();
  return (
    lower === "i don't remember" ||
    lower === "i dont remember" ||
    lower === "i don't know" ||
    lower === "i dont know" ||
    lower === "not sure" ||
    lower === "forgot" ||
    lower === "unknown" ||
    lower === "can't remember" ||
    lower === "cant remember" ||
    lower === "no idea"
  );
}

/**
 * Detects hard contradictions between claimant tokens and protected owner tokens.
 */
function detectContradictions(claimantStems: string[], ownerStems: string[]): string[] {
  const conflicts: string[] = [];

  for (const [motifA, motifB] of CONFLICTING_MOTIFS) {
    if (claimantStems.includes(motifA) && ownerStems.includes(motifB)) {
      conflicts.push(`Claimant stated '${motifA}', contradicting owner's recorded '${motifB}'.`);
    } else if (claimantStems.includes(motifB) && ownerStems.includes(motifA)) {
      conflicts.push(`Claimant stated '${motifB}', contradicting owner's recorded '${motifA}'.`);
    }
  }

  // Color contradictions for key items
  const colors = ["blue", "red", "yellow", "green"];
  const claimantColors = claimantStems.filter((s) => colors.includes(s));
  const ownerColors = ownerStems.filter((s) => colors.includes(s));
  if (
    claimantColors.length > 0 &&
    ownerColors.length > 0 &&
    !claimantColors.some((c) => ownerColors.includes(c))
  ) {
    conflicts.push(`Claimant color '${claimantColors.join(", ")}' conflicts with owner's '${ownerColors.join(", ")}'.`);
  }

  return conflicts;
}

/**
 * Evaluates a claimant's natural language answer against protected owner evidence.
 */
export function evaluateVerificationAnswer(
  answerRaw: string,
  challenge: VerificationChallenge,
  item: ProtectedItem,
  fingerprint?: ItemFingerprint | null
): AnswerEvaluationResult {
  const trimmed = (answerRaw || "").trim();

  // 1. Prompt Injection Defense: treat strictly as literal data
  if (containsInjectionPatterns(trimmed)) {
    return {
      verificationScore: 0.10,
      verificationStrength: "weak",
      matchedFeatures: [],
      conflicts: ["Input contains unauthorized directive/injection patterns."],
      missingEvidence: ["Valid physical feature description"],
      isGenericOnly: false,
      isUnknownIncomplete: false,
      isContradictory: false,
      explanation: "Input rejected: unauthorized text formatting; treated as unverified.",
    };
  }

  // 2. Unknown or Incomplete check ("I don't remember")
  if (isUnknownOrIncomplete(trimmed)) {
    return {
      verificationScore: 0.45,
      verificationStrength: "weak",
      matchedFeatures: [],
      conflicts: [],
      missingEvidence: ["Distinctive identifying mark"],
      isGenericOnly: false,
      isUnknownIncomplete: true,
      isContradictory: false,
      explanation: "Claimant expressed uncertainty or incomplete memory; routed for manual review.",
    };
  }

  // 2.5 Claimant claiming pristine / no damage when owner has distinctive damage
  const lowerAnswer = trimmed.toLowerCase();
  const claimsNoDamage =
    lowerAnswer.includes("no mark") ||
    lowerAnswer.includes("no scratch") ||
    lowerAnswer.includes("no damage") ||
    lowerAnswer.includes("without marks") ||
    lowerAnswer.includes("clean pristine");

  // 3. Extract protected owner evidence text
  const distinctiveFeatures: string[] = Array.isArray(fingerprint?.distinctiveFeatures)
    ? fingerprint!.distinctiveFeatures
    : [];

  if (claimsNoDamage && distinctiveFeatures.length > 0) {
    return {
      verificationScore: VERIFICATION_CONFIG.HARD_CONFLICT_MAX_SCORE,
      verificationStrength: "contradictory",
      matchedFeatures: [],
      conflicts: ["Claimant stated item has no marks/damage, contradicting owner's recorded distinctive marks."],
      missingEvidence: [],
      isGenericOnly: false,
      isUnknownIncomplete: false,
      isContradictory: true,
      explanation: "Contradiction: claimant stated item is pristine/undamaged, but owner registered distinctive marks.",
    };
  }
  const accessories: string[] = Array.isArray(fingerprint?.accessories)
    ? fingerprint!.accessories
    : [];

  const protectedCorpus = [
    ...distinctiveFeatures,
    ...accessories,
    item.privateDetail || "",
    fingerprint?.ownerDescription || "",
    challenge.internalExpectedClue || "",
  ].filter(Boolean).join(" ");

  const claimantStems = normalizeAnswerTokens(trimmed);
  const ownerStems = normalizeAnswerTokens(protectedCorpus);

  // If item has NO distinctive features registered
  const hasRegisteredDistinctive = distinctiveFeatures.length > 0 || (item.privateDetail && item.privateDetail.trim().length > 0);

  // 4. Detect Hard Contradictions
  const conflicts = detectContradictions(claimantStems, ownerStems);
  if (conflicts.length > 0) {
    return {
      verificationScore: VERIFICATION_CONFIG.HARD_CONFLICT_MAX_SCORE,
      verificationStrength: "contradictory",
      matchedFeatures: [],
      conflicts,
      missingEvidence: [],
      isGenericOnly: false,
      isUnknownIncomplete: false,
      isContradictory: true,
      explanation: `Contradiction detected: ${conflicts[0]}`,
    };
  }

  // 5. Detect Generic-Only answers
  const nonGenericClaimantStems = claimantStems.filter((s) => !GENERIC_TOKENS.has(s));
  const isGenericOnly = nonGenericClaimantStems.length === 0;

  if (isGenericOnly && hasRegisteredDistinctive) {
    return {
      verificationScore: 0.25,
      verificationStrength: "weak",
      matchedFeatures: claimantStems.filter((s) => ownerStems.includes(s)),
      conflicts: [],
      missingEvidence: ["Specific distinctive mark, damage, or customization"],
      isGenericOnly: true,
      isUnknownIncomplete: false,
      isContradictory: false,
      explanation: "Answer provided only generic category/model details without identifying physical features.",
    };
  }

  // If item is generic-only and claimant also gives generic answer
  if (!hasRegisteredDistinctive) {
    const matchedGeneric = claimantStems.filter((s) => ownerStems.includes(s));
    const score = matchedGeneric.length > 0 ? VERIFICATION_CONFIG.GENERIC_ONLY_MAX_SCORE : 0.20;
    return {
      verificationScore: score,
      verificationStrength: "moderate",
      matchedFeatures: matchedGeneric,
      conflicts: [],
      missingEvidence: ["Distinctive physical proof (item is generic in registry)"],
      isGenericOnly: true,
      isUnknownIncomplete: false,
      isContradictory: false,
      explanation: "Item has no distinctive features registered; generic match routed for staff verification.",
    };
  }

  // 6. Distinctive Matching Logic
  // Check exact wording match first
  const cleanAnswer = trimmed.toLowerCase();
  const matchedFeatures: string[] = [];

  for (const feat of distinctiveFeatures) {
    const cleanFeat = feat.toLowerCase();
    if (cleanAnswer === cleanFeat || cleanAnswer.includes(cleanFeat)) {
      matchedFeatures.push(feat);
    }
  }

  // Semantic overlap check
  const overlapStems = claimantStems.filter((s) => ownerStems.includes(s));
  const distinctiveOverlap = overlapStems.filter((s) => !GENERIC_TOKENS.has(s));

  let score = 0.30;
  let strength: VerificationStrength = "weak";

  if (matchedFeatures.length > 0) {
    score = 0.95;
    strength = "strong";
  } else if (distinctiveOverlap.length >= 2) {
    // e.g. "superman" + "sticker" or "scratch" + "hinge"
    score = 0.88;
    strength = "strong";
    matchedFeatures.push(distinctiveOverlap.join(" "));
  } else if (distinctiveOverlap.length === 1) {
    score = 0.72;
    strength = "moderate";
    matchedFeatures.push(distinctiveOverlap[0]);
  } else if (overlapStems.length > 0) {
    score = 0.40;
    strength = "weak";
  }

  return {
    verificationScore: Math.min(1.0, Math.max(0.0, score)),
    verificationStrength: strength,
    matchedFeatures,
    conflicts: [],
    missingEvidence: score < VERIFICATION_CONFIG.MIN_VERIFIED_SCORE ? ["Complete distinctive detail confirmation"] : [],
    isGenericOnly: false,
    isUnknownIncomplete: false,
    isContradictory: false,
    explanation:
      score >= VERIFICATION_CONFIG.MIN_VERIFIED_SCORE
        ? `Private distinctive feature confirmed (${matchedFeatures.join(", ")}).`
        : "Partial detail provided; insufficient distinctive evidence for auto-verification.",
  };
}
