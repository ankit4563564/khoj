/**
 * KHOJ — Phase 7: Challenge Generator
 * Generates blind ownership challenges strictly from protected owner evidence.
 * 
 * CRITICAL PRIVACY INVARIANT:
 * The generated challenge question must NEVER reveal the protected answer.
 * (e.g. "What distinctive sticker or mark is on your backpack?" vs "Does your bag have a Superman sticker?")
 */

import { id } from "@/lib/rvu/db";
import type { ItemFingerprint, ProtectedItem } from "@/lib/rvu/types";
import type { VerificationChallenge, VerificationChallengeType } from "./verificationTypes";
import { VERIFICATION_CONFIG } from "./verificationConfig";

interface ClassifiedFeature {
  type: VerificationChallengeType;
  rawText: string;
  priority: number;
}

const DAMAGE_KEYWORDS = ["scratch", "scratched", "dent", "dented", "crack", "cracked", "tear", "torn", "chip", "chipped", "damage", "broken", "scuff"];
const ENGRAVING_KEYWORDS = ["engrav", "initials", "laser", "etched", "inscribed", "monogram", "carved"];
const STICKER_CUSTOM_KEYWORDS = ["sticker", "decal", "patch", "custom", "drawing", "paint", "tape", "mod"];
const ACCESSORY_KEYWORDS = ["keychain", "charm", "carabiner", "tag", "strap", "lanyard", "case", "holder", "tie"];
const MARKING_KEYWORDS = ["stain", "ink", "mark", "spot", "discolor", "blemish"];

/**
 * Classifies a distinctive feature string into a priority tier and challenge category.
 */
function classifyFeature(featureStr: string): ClassifiedFeature {
  const lower = featureStr.toLowerCase();

  // Priority 1: Physical damage
  if (DAMAGE_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { type: "distinctive_damage", rawText: featureStr, priority: 1 };
  }

  // Priority 2: Engravings
  if (ENGRAVING_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { type: "engraving", rawText: featureStr, priority: 2 };
  }

  // Priority 3: Customizations / Stickers
  if (STICKER_CUSTOM_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { type: "customization", rawText: featureStr, priority: 3 };
  }

  // Priority 4: Accessories
  if (ACCESSORY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { type: "unique_accessory", rawText: featureStr, priority: 4 };
  }

  // Priority 5: Uncommon markings
  if (MARKING_KEYWORDS.some((kw) => lower.includes(kw))) {
    return { type: "distinctive_marking", rawText: featureStr, priority: 5 };
  }

  return { type: "general_distinctive", rawText: featureStr, priority: 6 };
}

/**
 * Crafts an open-ended, non-leaking challenge question based on category and feature type.
 */
function craftQuestion(category: string, type: VerificationChallengeType, isFollowUp = false): string {
  const cat = category.toLowerCase().trim() || "item";

  if (isFollowUp) {
    return `Where on your ${cat} is this feature located, or what additional accessory or mark is attached?`;
  }

  switch (type) {
    case "distinctive_damage":
      return `What distinctive physical damage, scratch, dent, tear, or mark does your ${cat} have?`;
    case "engraving":
      return `What personal engraving, initials, or text mark is inscribed on your ${cat}?`;
    case "customization":
      return `What custom sticker, patch, artwork, or modification is on your ${cat}?`;
    case "unique_accessory":
      return `What unique accessory, keychain, charm, or attachment is with your ${cat}?`;
    case "distinctive_marking":
      return `What unusual marking, stain, or identifying coloration does your ${cat} have?`;
    case "case_or_attachment":
      return `What is distinctive or unusual about your ${cat}'s case or protective cover?`;
    case "general_distinctive":
    default:
      return `Describe one distinctive feature, mark, customization, or damage that distinguishes your ${cat} from others.`;
  }
}

/**
 * Generates 1–2 sequential blind verification challenges for a candidate.
 */
export function generateVerificationChallenges(
  item: ProtectedItem,
  fingerprint?: ItemFingerprint | null,
  challengeCount = VERIFICATION_CONFIG.DEFAULT_CHALLENGE_COUNT
): VerificationChallenge[] {
  const category = fingerprint?.category || item.category || "item";
  const candidates: ClassifiedFeature[] = [];

  // 1. Gather distinctive features from fingerprint
  const distinctiveFeatures: string[] = Array.isArray(fingerprint?.distinctiveFeatures)
    ? fingerprint!.distinctiveFeatures
    : [];
  for (const feat of distinctiveFeatures) {
    if (feat && typeof feat === "string" && feat.trim().length > 0) {
      candidates.push(classifyFeature(feat));
    }
  }

  // 2. Gather accessories
  const accessories: string[] = Array.isArray(fingerprint?.accessories)
    ? fingerprint!.accessories
    : [];
  for (const acc of accessories) {
    if (acc && typeof acc === "string" && acc.trim().length > 0) {
      candidates.push(classifyFeature(acc));
    }
  }

  // 3. Fallback to private registration detail or description if no explicit features
  if (candidates.length === 0 && item.privateDetail && item.privateDetail.trim().length > 0) {
    candidates.push(classifyFeature(item.privateDetail));
  }

  // Sort by priority (1 is highest)
  candidates.sort((a, b) => a.priority - b.priority);

  const challenges: VerificationChallenge[] = [];
  const primaryFeature = candidates[0];

  if (primaryFeature) {
    challenges.push({
      id: `ch-${id("").slice(0, 12)}`,
      type: primaryFeature.type,
      question: craftQuestion(category, primaryFeature.type, false),
      category,
      internalExpectedClue: primaryFeature.rawText,
    });

    if (challengeCount > 1) {
      // Follow-up challenge for location or secondary detail
      const secondaryFeature = candidates[1];
      challenges.push({
        id: `ch-${id("").slice(0, 12)}`,
        type: secondaryFeature ? secondaryFeature.type : "general_distinctive",
        question: craftQuestion(category, secondaryFeature ? secondaryFeature.type : "general_distinctive", true),
        category,
        internalExpectedClue: secondaryFeature ? secondaryFeature.rawText : undefined,
      });
    }
  } else {
    // Generic-only item (no distinctive features registered)
    challenges.push({
      id: `ch-${id("").slice(0, 12)}`,
      type: "general_distinctive",
      question: `Describe any specific identifying feature, purchase detail, or private mark of your ${category.toLowerCase()}.`,
      category,
      internalExpectedClue: item.privateDetail || item.description || undefined,
    });
  }

  return challenges;
}
