/**
 * KHOJ — Owner Item Fingerprint Types
 * Strongly typed structures for owner-side feature extraction.
 *
 * CRITICAL PRODUCT PRINCIPLE:
 * These attributes are structured perceptual EVIDENCE, NOT an automated ownership decision.
 * Generic attributes (color, brand) and distinctive attributes (scratches, stickers, dents)
 * must be explicitly separated. Owner claims and visual observations must remain distinguishable.
 */

export interface DistinctiveFeature {
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
  description: string;
  locationOnObject?: string | null;
  confidence: number; // Extraction confidence estimate (0.0 to 1.0)
  source: "owner_text" | "visual_observation" | "corroborated";
}

export interface GenericAttributes {
  category: string;
  subcategory?: string | null;
  brand: string;
  model: string;
  primaryColor: string;
  secondaryColors: string[];
  material?: string | null;
  shape?: string | null;
  sizeDescription?: string | null;
}

export interface ImageQualityAssessment {
  quality: number; // 0.0 to 1.0 heuristic score
  usable: boolean;
  issues: string[]; // e.g. ["dark", "blurry", "obstructed", "too_small"]
}

export interface VisualObservation {
  imageId: string;
  viewAngle?: "front" | "back" | "side" | "top" | "close_up" | "unknown";
  observedAttributes: Partial<GenericAttributes>;
  distinctiveFeatures: DistinctiveFeature[];
  visibleText: string[];
  logos: string[];
  accessories: string[];
  condition: string;
  rawVisualDescription: string;
  imageQuality: ImageQualityAssessment;
}

export interface OwnerClaim {
  field: string;
  rawText: string;
  extractedValue: string;
  isDistinctive: boolean;
}

export type FingerprintExtractionStatus =
  | "extraction_success"
  | "extraction_partial"
  | "extraction_failed";

export interface OwnerFingerprintMetadata {
  extractionStatus: FingerprintExtractionStatus;
  extractionTimestamp: string;
  genericAttributes: GenericAttributes;
  distinctiveFeatures: DistinctiveFeature[];
  ownerClaims: OwnerClaim[];
  visualObservations: VisualObservation[];
  overallImageQuality?: ImageQualityAssessment | null;
  confidenceScores: Record<string, number>;
  extractionNotes?: string[];
}
