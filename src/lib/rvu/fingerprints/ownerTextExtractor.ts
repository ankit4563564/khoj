/**
 * KHOJ — Owner Natural Language Text Extractor
 * Converts freeform owner text into structured generic attributes and distinctive features.
 *
 * CRITICAL PRODUCT PRINCIPLE:
 * Generic attributes (white, Apple, backpack) and distinctive attributes
 * (scratch near hinge, Spider-Man sticker near bottom) must be explicitly separated.
 */

import {
  GenericAttributes,
  DistinctiveFeature,
  OwnerClaim,
} from "./ownerFingerprintTypes";
import {
  normalizeBrand,
  normalizeCategory,
  normalizeModel,
  extractColors,
} from "./normalizeFingerprint";

// Distinctive indicator patterns
const DISTINCTIVE_PATTERNS: Array<{
  type: DistinctiveFeature["type"];
  regex: RegExp;
  label: string;
}> = [
  {
    type: "scratch",
    regex: /(?:small|tiny|deep|light|faint|black|white|visible)?\s*(?:scratch|scratches|scuff|scuffs|scrape|scrapes)(?:\s+(?:on|near|around|at|by|inside|behind)\s+(?:the\s+)?[a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+){0,3})?/gi,
    label: "Scratch or scuff mark",
  },
  {
    type: "dent",
    regex: /(?:small|tiny|deep|minor)?\s*(?:dent|dents|ding|dings|depression)(?:\s+(?:on|near|around|at|by|in)\s+(?:the\s+)?[a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+){0,3})?/gi,
    label: "Physical dent or ding",
  },
  {
    type: "sticker",
    regex: /(?:[a-zA-Z0-9\s-]+)?\s*(?:sticker|stickers|decal|decals|skin|patch|patches)(?:\s+(?:on|near|around|at|by|inside|behind)\s+(?:the\s+)?[a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+){0,3})?/gi,
    label: "Sticker or decal",
  },
  {
    type: "engraving",
    regex: /(?:engraved|engraving|etched|etching|initials|name\s+written|custom\s+text)(?:\s+(?:on|near|at|by|in)\s+(?:the\s+)?[a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+){0,3})?/gi,
    label: "Custom engraving or inscription",
  },
  {
    type: "crack",
    regex: /(?:hairline|small|cracked|crack|broken|fractured)(?:\s+(?:glass|screen|lid|corner|casing|hinge|zipper|headband))(?:\s+(?:on|near|around|at|by|in)\s+(?:the\s+)?[a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+){0,3})?/gi,
    label: "Crack or physical fracture",
  },
  {
    type: "customization",
    regex: /(?:custom\s+case|protective\s+case|case\s+cover|case\s+holder|custom|personalized|keychain|charm|lanyard|tether|carabiner|tape)(?:\s+(?:on|near|around|at|by|in)\s+(?:the\s+)?[a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+){0,3})?/gi,
    label: "Personalized customization or accessory",
  },
  {
    type: "stain",
    regex: /(?:stain|stains|yellowish\s+mark|ink\s+mark|spot|discoloration)(?:\s+(?:on|near|around|at|inside)\s+(?:the\s+)?[a-zA-Z0-9-]+(?:\s+[a-zA-Z0-9-]+){0,3})?/gi,
    label: "Discoloration or stain mark",
  },
];

// Material keywords
const COMMON_MATERIALS = [
  "aluminum",
  "metal",
  "steel",
  "stainless steel",
  "plastic",
  "silicone",
  "rubber",
  "leather",
  "faux leather",
  "canvas",
  "nylon",
  "fabric",
  "polyester",
  "glass",
];

export interface TextExtractionResult {
  genericAttributes: GenericAttributes;
  distinctiveFeatures: DistinctiveFeature[];
  ownerClaims: OwnerClaim[];
  confidenceScores: Record<string, number>;
}

/**
 * Extracts structured generic and distinctive attributes from owner text.
 */
export function extractFromOwnerText(params: {
  title: string;
  category?: string;
  brand?: string;
  color?: string;
  description: string;
  privateDetail?: string;
}): TextExtractionResult {
  const combinedText = `${params.title} ${params.description} ${params.privateDetail || ""}`.trim();

  // 1. Extract Generic Attributes
  const normalizedCategory = normalizeCategory(params.category || params.title);
  const normalizedBrand = normalizeBrand(params.brand || detectBrand(combinedText));
  const model = normalizeModel(detectModel(params.title, normalizedBrand), normalizedBrand);

  const colors = extractColors(`${params.color || ""} ${combinedText}`);
  const material = detectMaterial(combinedText);
  const shape = detectShape(combinedText);
  const sizeDescription = detectSize(combinedText);

  const genericAttributes: GenericAttributes = {
    category: normalizedCategory,
    subcategory: detectSubcategory(combinedText, normalizedCategory),
    brand: normalizedBrand,
    model: model || params.title.trim(),
    primaryColor: colors.primaryColor,
    secondaryColors: colors.secondaryColors,
    material,
    shape,
    sizeDescription,
  };

  // 2. Extract Distinctive Features
  const distinctiveFeatures: DistinctiveFeature[] = [];
  const rawClaims: OwnerClaim[] = [];

  // Always record explicit private detail as a distinctive owner claim if present
  if (params.privateDetail && params.privateDetail.trim().length >= 3) {
    const rawDetail = params.privateDetail.trim();
    distinctiveFeatures.push({
      type: categorizeDistinctiveText(rawDetail),
      description: rawDetail,
      locationOnObject: extractLocationHint(rawDetail),
      confidence: 0.95, // High confidence: owner explicitly identified this
      source: "owner_text",
    });
    rawClaims.push({
      field: "privateDetail",
      rawText: rawDetail,
      extractedValue: rawDetail,
      isDistinctive: true,
    });
  }

  // Scan description for distinctive patterns
  for (const pattern of DISTINCTIVE_PATTERNS) {
    const matches = combinedText.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.trim();
        // Ignore negative statements e.g. "no scratches", "without any damage", "zero scratches"
        const matchIdx = combinedText.indexOf(match);
        if (matchIdx > 0) {
          const prefix = combinedText.slice(Math.max(0, matchIdx - 16), matchIdx).toLowerCase();
          if (prefix.includes("no ") || prefix.includes("without") || prefix.includes("zero ") || prefix.includes("free of")) {
            continue;
          }
        }

        // Avoid duplicate features of the same type or identical description
        const isDuplicate = distinctiveFeatures.some(
          (df) =>
            (df.type === pattern.type &&
              (df.description.toLowerCase().includes(cleaned.toLowerCase()) ||
                cleaned.toLowerCase().includes(df.description.toLowerCase()))) ||
            df.description.toLowerCase() === cleaned.toLowerCase()
        );
        if (!isDuplicate) {
          distinctiveFeatures.push({
            type: pattern.type,
            description: cleaned,
            locationOnObject: extractLocationHint(cleaned),
            confidence: 0.88,
            source: "owner_text",
          });
          rawClaims.push({
            field: "description_distinctive",
            rawText: cleaned,
            extractedValue: cleaned,
            isDistinctive: true,
          });
        }
      }
    }
  }

  // Record generic claims
  rawClaims.push(
    { field: "title", rawText: params.title, extractedValue: params.title, isDistinctive: false },
    { field: "category", rawText: params.category || "", extractedValue: genericAttributes.category, isDistinctive: false },
    { field: "brand", rawText: params.brand || "", extractedValue: genericAttributes.brand, isDistinctive: false },
    { field: "primaryColor", rawText: params.color || "", extractedValue: genericAttributes.primaryColor, isDistinctive: false }
  );

  const confidenceScores: Record<string, number> = {
    category: genericAttributes.category !== "Other" ? 0.95 : 0.6,
    brand: genericAttributes.brand ? 0.92 : 0.3,
    color: genericAttributes.primaryColor !== "Unknown" ? 0.9 : 0.4,
    distinctiveFeatures: distinctiveFeatures.length > 0 ? 0.88 : 0.0,
  };

  return {
    genericAttributes,
    distinctiveFeatures,
    ownerClaims: rawClaims,
    confidenceScores,
  };
}

function detectBrand(text: string): string {
  const brands = [
    "Apple",
    "Nike",
    "Hydro Flask",
    "Bellroy",
    "Samsung",
    "Dell",
    "Lenovo",
    "Sony",
    "boAt",
    "Noise",
    "HP",
    "Milton",
    "Wildcraft",
    "JBL",
  ];
  const lower = text.toLowerCase();
  for (const b of brands) {
    if (new RegExp(`\\b${b}\\b`, "i").test(lower)) return b;
  }
  return "";
}

function detectModel(title: string, brand: string): string {
  if (brand.toLowerCase() === "apple") {
    if (/airpods\s*pro\s*(?:2|2nd\s*gen)?/i.test(title)) return "AirPods Pro (2nd Gen)";
    if (/airpods\s*(?:3|3rd\s*gen)?/i.test(title)) return "AirPods (3rd Gen)";
    if (/macbook\s*pro\s*(?:14|16)?/i.test(title)) return "MacBook Pro";
    if (/macbook\s*air/i.test(title)) return "MacBook Air";
    if (/iphone\s*(?:13|14|15|16)/i.test(title)) return "iPhone";
  }
  return title;
}

function detectMaterial(text: string): string | null {
  const lower = text.toLowerCase();
  for (const m of COMMON_MATERIALS) {
    if (new RegExp(`\\b${m}\\b`, "i").test(lower)) {
      return m.charAt(0).toUpperCase() + m.slice(1);
    }
  }
  return null;
}

function detectShape(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("rectangular") || lower.includes("cylinder") || lower.includes("round") || lower.includes("oval") || lower.includes("square")) {
    const match = lower.match(/\b(rectangular|cylindrical|cylinder|round|oval|square|compact)\b/i);
    return match ? match[1].toLowerCase() : null;
  }
  return null;
}

function detectSize(text: string): string | null {
  const match = text.match(/\b(\d+(?:\.\d+)?\s*(?:inch|in|cm|mm|liter|l|ml|oz))\b/i);
  return match ? match[1] : null;
}

function detectSubcategory(text: string, category: string): string | null {
  const lower = text.toLowerCase();
  if (category === "Electronics") {
    if (lower.includes("airpod") || lower.includes("earbud") || lower.includes("headphone")) return "Audio & Earbuds";
    if (lower.includes("laptop") || lower.includes("macbook")) return "Laptops";
    if (lower.includes("charger") || lower.includes("cable") || lower.includes("adapter")) return "Chargers & Cables";
    if (lower.includes("phone")) return "Smartphones";
  }
  if (category === "Bags") {
    if (lower.includes("backpack")) return "Backpacks";
    if (lower.includes("sleeve")) return "Laptop Sleeves";
    if (lower.includes("tote")) return "Tote Bags";
  }
  if (category === "Accessories") {
    if (lower.includes("bottle") || lower.includes("flask")) return "Water Bottles";
    if (lower.includes("wallet")) return "Wallets";
    if (lower.includes("watch")) return "Watches";
    if (lower.includes("umbrella")) return "Umbrellas";
  }
  if (category === "ID cards") {
    if (lower.includes("student")) return "Student ID";
    if (lower.includes("faculty") || lower.includes("staff")) return "Faculty / Staff ID";
  }
  return null;
}

function extractLocationHint(text: string): string | null {
  const match = text.match(/\b(?:near|on|around|at|by|inside|behind|bottom|top|left|right|front|back)\s+([a-zA-Z0-9\s-]+?)(?=[,.;]|$)/i);
  return match ? match[0].trim() : null;
}

function categorizeDistinctiveText(text: string): DistinctiveFeature["type"] {
  const lower = text.toLowerCase();
  if (lower.includes("scratch") || lower.includes("scuff")) return "scratch";
  if (lower.includes("dent") || lower.includes("ding")) return "dent";
  if (lower.includes("sticker") || lower.includes("decal")) return "sticker";
  if (lower.includes("engrav") || lower.includes("etch") || lower.includes("initial")) return "engraving";
  if (lower.includes("crack") || lower.includes("broken")) return "crack";
  if (lower.includes("stain") || lower.includes("mark")) return "stain";
  if (lower.includes("keychain") || lower.includes("charm")) return "accessory";
  return "customization";
}
