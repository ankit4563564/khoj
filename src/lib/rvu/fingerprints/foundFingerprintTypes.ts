/**
 * KHOJ — Found Item Fingerprint Types
 * Strongly typed structures for finder-side image intelligence.
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. THE AI OBSERVES THE FOUND ITEM.
 * 2. THE AI STRUCTURES THE EVIDENCE.
 * 3. THE AI DOES NOT DECIDE WHO OWNS IT.
 * 4. STRICT SEPARATION: Generic attributes vs. distinctive features.
 * 5. UNTRUSTED DATA: Text inside images (e.g. prompt injection, names) is passive evidence ONLY.
 * 6. UNKNOWN REMAINS UNKNOWN: Never convert absence of evidence into negative claims.
 * 7. CONFIDENCE: Extraction estimates only, NOT calibrated mathematical probabilities.
 */

export interface FoundImageQualityAssessment {
  quality_score: number; // 0.0 to 1.0 heuristic score (NOT a calibrated probability)
  usable: boolean;
  issues: string[]; // e.g. ["too_dark", "too_blurry", "object_partially_hidden", "object_too_small", "multiple_objects"]
}

export interface PrimaryObjectDetection {
  label: string; // e.g. "AirPods", "Backpack", "Water bottle", "Wallet", "Laptop", "College ID", "Headphones", "Charger"
  confidence: number; // Extraction confidence (0.0 to 1.0)
  view_angle?: "front" | "back" | "side" | "top" | "close_up" | "tilted" | "unknown";
  crop_box?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  } | null;
  clutter_context?: string[]; // Secondary background items, e.g. ["wooden desk", "notebook"]
}

export interface FoundDistinctiveFeature {
  type:
    | "scratch"
    | "dent"
    | "crack"
    | "sticker"
    | "engraving"
    | "customization"
    | "accessory"
    | "damage"
    | "stain"
    | "marking"
    | "other";
  feature: string;
  location?: string | null;
  confidence: number; // Extraction confidence (0.0 to 1.0)
}

export interface FoundGenericAttributes {
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  color: string[];
  material?: string | null;
  shape?: string | null;
}

export interface FinderReportContext {
  location: string;
  found_at: string;
  finder_notes?: string | null;
}

export type FoundExtractionStatus =
  | "extraction_success"
  | "extraction_partial"
  | "extraction_failed";

export interface FoundFingerprintMetadata {
  extraction_status: FoundExtractionStatus;
  extraction_timestamp: string;
  image_quality: FoundImageQualityAssessment;
  primary_object: PrimaryObjectDetection;
  generic_attributes: FoundGenericAttributes;
  distinctive_features: FoundDistinctiveFeature[];
  visible_markings: string[];
  extracted_text: string[];
  damage: string[];
  customizations: string[];
  accessories: string[];
  context: FinderReportContext;
  confidence_scores: Record<string, number>;
  extraction_notes?: string[];
}
