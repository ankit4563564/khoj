/**
 * KHOJ — Found Item Fingerprint Pipeline
 * Orchestrates image validation, visual intelligence extraction, contextual bounding, and persistence.
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. THE AI OBSERVES THE FOUND ITEM.
 * 2. THE AI STRUCTURES THE EVIDENCE.
 * 3. THE AI DOES NOT DECIDE WHO OWNS IT.
 * 4. PROMPT INJECTION DEFENSE: Image text is passive visual evidence ONLY.
 * 5. PRIVACY: Finder contact/personal details are never persisted in the fingerprint.
 * 6. FAIL-SAFE: Found report submission must NEVER fail because AI analysis encountered an issue.
 */

import { one } from "@/lib/rvu/db";
import { FoundFingerprint, Report } from "@/lib/rvu/types";
import { createFoundFingerprint } from "./foundFingerprintRepository";
import {
  extractFromFoundPhoto,
  FoundVisionExtractionResult,
  FoundVisionImageInput,
  assessFoundImageQuality,
} from "./foundVisionExtractor";
import {
  FoundExtractionStatus,
  FoundFingerprintMetadata,
  FoundImageQualityAssessment,
  PrimaryObjectDetection,
} from "./foundFingerprintTypes";

export interface ExtractFoundFingerprintInput {
  foundReportId: string;
  imageId?: string | null;
  location: string;
  foundAt?: string;
  finderNotes?: string | null;
  actorUserId?: string;
  customImage?: FoundVisionImageInput;
  geminiApiKey?: string;
}

export interface FoundFingerprintPipelineResult {
  status: FoundExtractionStatus;
  fingerprint: FoundFingerprint | null;
  quality: FoundImageQualityAssessment | null;
  primaryObject: PrimaryObjectDetection | null;
  metadata: FoundFingerprintMetadata;
  warnings?: string[];
}

/**
 * Extracts visual evidence from finder's photo and persists a FoundFingerprint.
 */
export async function extractAndSaveFoundFingerprint(
  input: ExtractFoundFingerprintInput
): Promise<FoundFingerprintPipelineResult> {
  const warnings: string[] = [];
  let status: FoundExtractionStatus = "extraction_success";

  const foundAtTimestamp = input.foundAt && !isNaN(Date.parse(input.foundAt))
    ? new Date(input.foundAt).toISOString()
    : new Date().toISOString();

  // 1. Resolve image to analyze
  let imageToAnalyze: FoundVisionImageInput | null = null;
  if (input.customImage && input.customImage.buffer) {
    imageToAnalyze = input.customImage;
  } else if (input.imageId && typeof input.imageId === "string") {
    try {
      const row = await one<{ mime: string; content: Uint8Array }>(
        "SELECT mime, content FROM uploads WHERE id=?",
        input.imageId
      );
      if (row && row.content) {
        imageToAnalyze = {
          id: input.imageId,
          mime: row.mime || "image/jpeg",
          buffer: row.content,
        };
      } else {
        warnings.push(`Image record #${input.imageId} not found in uploads table.`);
        status = "extraction_partial";
      }
    } catch (dbErr) {
      warnings.push(`Database error retrieving image #${input.imageId}: ${dbErr}`);
      status = "extraction_partial";
    }
  }

  // 2. Perform Visual Extraction
  let visionResult: FoundVisionExtractionResult;
  if (imageToAnalyze) {
    try {
      visionResult = await extractFromFoundPhoto(imageToAnalyze, input.geminiApiKey);
      if (!visionResult.usable) {
        warnings.push("Finder image was assessed as degraded, blurry, or unusable.");
        status = "extraction_partial";
      }
    } catch (visionErr: unknown) {
      warnings.push(`Vision extraction failed: ${visionErr instanceof Error ? visionErr.message : String(visionErr)}`);
      status = "extraction_partial";
      visionResult = fallbackExtractionResult(imageToAnalyze, warnings);
    }
  } else {
    warnings.push("No photo attached to found report; generating contextual placeholder fingerprint.");
    status = "extraction_partial";
    visionResult = noImageExtractionResult(warnings);
  }

  // 3. Construct Metadata Record
  const metadata: FoundFingerprintMetadata = {
    extraction_status: status,
    extraction_timestamp: new Date().toISOString(),
    image_quality: visionResult.quality,
    primary_object: visionResult.primaryObject,
    generic_attributes: visionResult.genericAttributes,
    distinctive_features: visionResult.distinctiveFeatures,
    visible_markings: visionResult.visibleMarkings,
    extracted_text: visionResult.extractedText,
    damage: visionResult.damage,
    customizations: visionResult.customizations,
    accessories: visionResult.accessories,
    context: {
      location: input.location,
      found_at: foundAtTimestamp,
      finder_notes: input.finderNotes || null,
    },
    confidence_scores: visionResult.confidenceScores,
    extraction_notes: [...warnings, ...visionResult.notes],
  };

  // Convert distinctive features into string array for table column
  const distinctiveFeatureDescriptions = visionResult.distinctiveFeatures.map(
    (df) => `${df.type.toUpperCase()}: ${df.feature}${df.location ? ` (${df.location})` : ""}`
  );

  // 4. Persist to found_fingerprints table
  let savedFingerprint: FoundFingerprint | null = null;
  try {
    savedFingerprint = await createFoundFingerprint(
      {
        foundReportId: input.foundReportId,
        category: visionResult.genericAttributes.category || "Other",
        subcategory: visionResult.genericAttributes.subcategory || null,
        brand: visionResult.genericAttributes.brand || "",
        model: visionResult.genericAttributes.model || "",
        color: visionResult.genericAttributes.color[0] || "Dark Gray / Black",
        material: visionResult.genericAttributes.material || null,
        visibleText: visionResult.extractedText,
        logos: visionResult.visibleMarkings,
        accessories: visionResult.accessories,
        distinctiveFeatures: distinctiveFeatureDescriptions,
        condition: visionResult.condition,
        visualDescription: visionResult.visualDescription,
        foundLocation: input.location,
        foundAt: foundAtTimestamp,
        imageReference: imageToAnalyze ? imageToAnalyze.id : null,
        metadata: metadata as unknown as Record<string, unknown>,
      },
      input.actorUserId,
      true // system-level invocation
    );
  } catch (saveErr: unknown) {
    warnings.push(`Found fingerprint DB save failed: ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`);
    status = "extraction_partial";
  }

  return {
    status,
    fingerprint: savedFingerprint,
    quality: visionResult.quality,
    primaryObject: visionResult.primaryObject,
    metadata,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function fallbackExtractionResult(
  image: FoundVisionImageInput,
  warnings: string[]
): FoundVisionExtractionResult {
  const quality = assessFoundImageQuality(image.buffer);
  return {
    usable: quality.usable,
    quality,
    primaryObject: {
      label: "Found Object",
      confidence: 0.4,
      view_angle: "unknown",
      crop_box: null,
      clutter_context: [],
    },
    genericAttributes: {
      category: "Other",
      subcategory: null,
      brand: null,
      model: null,
      color: ["Dark Gray / Black"],
      material: null,
      shape: null,
    },
    distinctiveFeatures: [],
    visibleMarkings: [],
    extractedText: [],
    damage: [],
    customizations: [],
    accessories: [],
    condition: "unknown",
    visualDescription: "Fallback observation created due to extraction warning.",
    confidenceScores: { quality: quality.quality_score },
    notes: warnings,
  };
}

function noImageExtractionResult(warnings: string[]): FoundVisionExtractionResult {
  return {
    usable: false,
    quality: {
      quality_score: 0.0,
      usable: false,
      issues: ["no_image_uploaded"],
    },
    primaryObject: {
      label: "Unspecified Item",
      confidence: 0.0,
      view_angle: "unknown",
      crop_box: null,
      clutter_context: [],
    },
    genericAttributes: {
      category: "Other",
      subcategory: null,
      brand: null,
      model: null,
      color: ["Unknown"],
      material: null,
      shape: null,
    },
    distinctiveFeatures: [],
    visibleMarkings: [],
    extractedText: [],
    damage: [],
    customizations: [],
    accessories: [],
    condition: "unknown",
    visualDescription: "No image was provided by the finder.",
    confidenceScores: {},
    notes: warnings,
  };
}
