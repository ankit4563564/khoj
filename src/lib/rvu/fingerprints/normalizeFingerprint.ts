/**
 * KHOJ — Fingerprint Normalization Layer
 * Normalizes common variations in brand, model, color, and categories
 * without inventing details or forcing false certainty.
 */

import { categories } from "@/lib/rvu/types";

// Canonical brand aliases
const BRAND_ALIASES: Record<string, string> = {
  apple: "Apple",
  nike: "Nike",
  adidas: "Adidas",
  puma: "Puma",
  samsung: "Samsung",
  sony: "Sony",
  dell: "Dell",
  hp: "HP",
  lenovo: "Lenovo",
  asus: "ASUS",
  acer: "Acer",
  boat: "boAt",
  noise: "Noise",
  jbl: "JBL",
  bose: "Bose",
  oneplus: "OnePlus",
  google: "Google",
  bellroy: "Bellroy",
  hydroflask: "Hydro Flask",
  "hydro flask": "Hydro Flask",
  milton: "Milton",
  tupperware: "Tupperware",
  wildcraft: "Wildcraft",
  skybags: "Skybags",
  fastrack: "Fastrack",
  casio: "Casio",
};

// Common color keywords
const STANDARD_COLORS = [
  "black",
  "white",
  "space gray",
  "silver",
  "gray",
  "grey",
  "blue",
  "navy",
  "dark blue",
  "light blue",
  "red",
  "green",
  "dark green",
  "olive",
  "yellow",
  "gold",
  "rose gold",
  "purple",
  "violet",
  "pink",
  "orange",
  "brown",
  "tan",
  "beige",
  "teal",
  "maroon",
  "burgundy",
];

export function normalizeBrand(rawBrand: string): string {
  if (!rawBrand) return "";
  const cleaned = rawBrand.trim().toLowerCase();
  return BRAND_ALIASES[cleaned] || (rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1).trim());
}

export function normalizeCategory(rawCategory: string): string {
  if (!rawCategory) return "Other";
  const lower = rawCategory.trim().toLowerCase();

  for (const cat of categories) {
    if (cat.toLowerCase() === lower) return cat;
  }

  // Heuristic mapping
  if (lower.includes("earbud") || lower.includes("airpod") || lower.includes("laptop") || lower.includes("charger") || lower.includes("phone")) {
    return "Electronics";
  }
  if (lower.includes("card") || lower.includes("id") || lower.includes("badge") || lower.includes("license")) {
    return "ID cards";
  }
  if (lower.includes("key")) return "Keys";
  if (lower.includes("bag") || lower.includes("backpack") || lower.includes("tote") || lower.includes("sleeve")) {
    return "Bags";
  }
  if (lower.includes("book") || lower.includes("note") || lower.includes("pen") || lower.includes("pencil")) {
    return "Books & stationery";
  }
  if (lower.includes("jacket") || lower.includes("hoodie") || lower.includes("shirt") || lower.includes("hat")) {
    return "Clothing";
  }
  if (lower.includes("bottle") || lower.includes("flask") || lower.includes("umbrella") || lower.includes("wallet") || lower.includes("watch")) {
    return "Accessories";
  }

  return "Other";
}

export function normalizeModel(rawModel: string, _brand?: string): string {
  if (!rawModel) return "";
  let cleaned = rawModel.trim();

  // Normalize common variations without distorting specifics
  cleaned = cleaned
    .replace(/\bair\s*pods\b/gi, "AirPods")
    .replace(/\bmac\s*book\b/gi, "MacBook")
    .replace(/\bi\s*phone\b/gi, "iPhone")
    .replace(/\bpad\s*pro\b/gi, "iPad Pro");

  return cleaned;
}

export function extractColors(text: string): { primaryColor: string; secondaryColors: string[] } {
  if (!text) return { primaryColor: "Unknown", secondaryColors: [] };

  const lower = text.toLowerCase();
  const occurrences: Array<{ color: string; index: number }> = [];

  for (const c of STANDARD_COLORS) {
    const regex = new RegExp(`\\b${c}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lower)) !== null) {
      const formatted = c.charAt(0).toUpperCase() + c.slice(1);
      occurrences.push({ color: formatted, index: match.index });
    }
  }

  if (occurrences.length === 0) {
    return { primaryColor: "Unknown", secondaryColors: [] };
  }

  // Sort by earliest appearance in text
  occurrences.sort((a, b) => a.index - b.index);

  const matchedColors: string[] = [];
  for (const item of occurrences) {
    if (!matchedColors.includes(item.color)) {
      matchedColors.push(item.color);
    }
  }

  return {
    primaryColor: matchedColors[0],
    secondaryColors: matchedColors.slice(1),
  };
}

export function normalizeDescription(desc: string): string {
  if (!desc) return "";
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const cleanDescriptionText = normalizeDescription;
