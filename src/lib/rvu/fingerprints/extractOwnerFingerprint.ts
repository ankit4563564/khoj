/**
 * KHOJ — Owner Item Fingerprint Pipeline
 * Coordinates Owner Text Extraction + Multi-Photo Vision Extraction + Evidence Synthesis + Persistence.
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. AI OBSERVES EVIDENCE — IT DOES NOT DECIDE OWNERSHIP.
 * 2. OWNER CLAIMS vs. VISUAL OBSERVATIONS are strictly separated and preserved.
 * 3. GENERIC ATTRIBUTES (brand, category, color) vs DISTINCTIVE FEATURES (scratches, stickers) are strictly separated.
 * 4. FAIL-SAFE: Item registration must never break because AI extraction failed or was unavailable.
 * 5. CONFIDENCE ESTIMATES: Stored as heuristic extraction estimates (0.0 to 1.0), not calibrated probabilities.
 */

import { one } from "@/lib/rvu/db";
import { ItemFingerprint } from "@/lib/rvu/types";
import { createItemFingerprint } from "./itemFingerprintRepository";
import { extractFromOwnerText, TextExtractionResult } from "./ownerTextExtractor";
import {
  extractFromOwnerPhotos,
  OwnerImageInput,
  OwnerVisionExtractionResult,
} from "./ownerVisionExtractor";
import {
  DistinctiveFeature,
  FingerprintExtractionStatus,
  GenericAttributes,
  ImageQualityAssessment,
  OwnerClaim,
  OwnerFingerprintMetadata,
  VisualObservation,
} from "./ownerFingerprintTypes";
import { cleanDescriptionText } from "./normalizeFingerprint";

export interface ExtractOwnerFingerprintInput {
  itemId: string;
  name: string;
  category?: string;
  brand?: string;
  color?: string;
  description: string;
  privateDetail?: string;
  imageIds?: string[];
  actorUserId?: string;
  customImages?: OwnerImageInput[]; // Direct buffers for testing or custom upload pipelines
  geminiApiKey?: string;
}

export interface OwnerFingerprintPipelineResult {
  status: FingerprintExtractionStatus;
  fingerprint: ItemFingerprint | null;
  quality: ImageQualityAssessment | null;
  metadata: OwnerFingerprintMetadata;
  warnings?: string[];
}

/**
 * Extracts, structures, and persists an owner item fingerprint.
 */
export async function extractAndSaveOwnerFingerprint(
  input: ExtractOwnerFingerprintInput
): Promise<OwnerFingerprintPipelineResult> {
  const warnings: string[] = [];
  let status: FingerprintExtractionStatus = "extraction_success";

  // 1. Extract from Owner Text (Deterministic & Robust)
  let textResult: TextExtractionResult;
  try {
    textResult = extractFromOwnerText({
      title: input.name,
      category: input.category,
      brand: input.brand,
      color: input.color,
      description: input.description,
      privateDetail: input.privateDetail,
    });
  } catch (err: unknown) {
    warnings.push(`Text extraction warning: ${err instanceof Error ? err.message : String(err)}`);
    textResult = {
      genericAttributes: {
        category: input.category || "Electronics",
        brand: input.brand || "",
        model: input.name,
        primaryColor: input.color || "Unknown",
        secondaryColors: [],
      },
      distinctiveFeatures: [],
      ownerClaims: [],
      confidenceScores: {},
    };
    status = "extraction_partial";
  }

  // 2. Fetch Photos from database if imageIds provided
  const imagesToAnalyze: OwnerImageInput[] = [];
  if (Array.isArray(input.customImages) && input.customImages.length > 0) {
    imagesToAnalyze.push(...input.customImages.slice(0, 3));
  } else if (Array.isArray(input.imageIds) && input.imageIds.length > 0) {
    for (const imgId of input.imageIds.slice(0, 3)) {
      if (!imgId || typeof imgId !== "string") continue;
      try {
        const row = one<{ mime: string; content: Uint8Array }>(
          "SELECT mime, content FROM uploads WHERE id=?",
          imgId
        );
        if (row && row.content) {
          imagesToAnalyze.push({
            id: imgId,
            mime: row.mime || "image/jpeg",
            buffer: row.content,
          });
        }
      } catch (dbErr) {
        warnings.push(`Failed to load image #${imgId}: ${dbErr}`);
      }
    }
  }

  // 3. Vision Extraction (Multi-photo Gemini 2.5 Flash)
  let visionResult: OwnerVisionExtractionResult | null = null;
  if (imagesToAnalyze.length > 0) {
    try {
      visionResult = await extractFromOwnerPhotos(imagesToAnalyze, input.geminiApiKey);
      if (!visionResult.usable) {
        warnings.push("Attached owner photos were assessed as poor or unusable.");
        if (status === "extraction_success") status = "extraction_partial";
      }
    } catch (visionErr: unknown) {
      warnings.push(`Vision extraction failed: ${visionErr instanceof Error ? visionErr.message : String(visionErr)}`);
      status = "extraction_partial";
    }
  } else {
    // No images attached; valid text-only registration
    if (status === "extraction_success") {
      // Complete text extraction with no images attached is still high quality
      status = "extraction_success";
    }
  }

  // 4. Synthesize Generic Attributes
  const consolidatedGeneric: GenericAttributes = {
    category:
      visionResult?.synthesizedGeneric?.category ||
      textResult.genericAttributes.category ||
      "Electronics",
    subcategory:
      visionResult?.synthesizedGeneric?.subcategory ||
      textResult.genericAttributes.subcategory ||
      null,
    brand:
      visionResult?.synthesizedGeneric?.brand ||
      textResult.genericAttributes.brand ||
      "",
    model:
      visionResult?.synthesizedGeneric?.model ||
      textResult.genericAttributes.model ||
      input.name,
    primaryColor:
      visionResult?.synthesizedGeneric?.primaryColor ||
      textResult.genericAttributes.primaryColor ||
      "Dark Gray / Black",
    secondaryColors: Array.from(
      new Set([
        ...textResult.genericAttributes.secondaryColors,
        ...(visionResult?.synthesizedGeneric?.secondaryColors || []),
      ])
    ),
    material:
      visionResult?.synthesizedGeneric?.material ||
      textResult.genericAttributes.material ||
      null,
    shape:
      visionResult?.synthesizedGeneric?.shape ||
      textResult.genericAttributes.shape ||
      null,
    sizeDescription: textResult.genericAttributes.sizeDescription || null,
  };

  // 5. Corroborate & Reconcile Distinctive Features
  // Clearly separate Owner Claims vs. Visual Observations
  const reconciledDistinctive: DistinctiveFeature[] = [];

  // Add text distinctive features (source: "owner_text")
  for (const textDf of textResult.distinctiveFeatures) {
    let corroborated = false;
    let corroboratedDf: DistinctiveFeature | null = null;

    if (visionResult && visionResult.synthesizedDistinctive.length > 0) {
      for (const visDf of visionResult.synthesizedDistinctive) {
        if (featuresMatch(textDf, visDf)) {
          corroborated = true;
          corroboratedDf = {
            type: textDf.type,
            description: `${textDf.description} (Visual: ${visDf.description})`,
            locationOnObject: visDf.locationOnObject || textDf.locationOnObject || null,
            confidence: 0.96, // Elevated confidence when corroborated across text AND camera
            source: "corroborated",
          };
          break;
        }
      }
    }

    if (corroborated && corroboratedDf) {
      reconciledDistinctive.push(corroboratedDf);
    } else {
      reconciledDistinctive.push(textDf);
    }
  }

  // Add visual distinctive features that were not already corroborated
  if (visionResult) {
    for (const visDf of visionResult.synthesizedDistinctive) {
      const alreadyPresent = reconciledDistinctive.some(
        (rd) => featuresMatch(rd, visDf) || rd.source === "corroborated"
      );
      if (!alreadyPresent) {
        reconciledDistinctive.push(visDf);
      }
    }
  }

  // 6. Build Metadata structure
  const metadata: OwnerFingerprintMetadata = {
    extractionStatus: status,
    extractionTimestamp: new Date().toISOString(),
    genericAttributes: consolidatedGeneric,
    distinctiveFeatures: reconciledDistinctive,
    ownerClaims: textResult.ownerClaims,
    visualObservations: visionResult?.observations || [],
    overallImageQuality: visionResult?.overallQuality || null,
    confidenceScores: {
      category: consolidatedGeneric.category ? 0.94 : 0.4,
      brand: consolidatedGeneric.brand ? 0.9 : 0.3,
      model: consolidatedGeneric.model ? 0.88 : 0.4,
      distinctive: reconciledDistinctive.length > 0 ? 0.9 : 0.0,
      imageQuality: visionResult?.overallQuality?.quality ?? 0,
    },
    extractionNotes: [...warnings, ...(visionResult?.notes || [])],
  };

  // Distinctive features as simple string array for database column
  const distinctiveFeatureDescriptions = reconciledDistinctive.map(
    (df) => `${df.type.toUpperCase()}: ${df.description}`
  );

  // 7. Persist to item_fingerprints table
  let savedFingerprint: ItemFingerprint | null = null;
  try {
    savedFingerprint = await createItemFingerprint(
      {
        itemId: input.itemId,
        category: consolidatedGeneric.category,
        subcategory: consolidatedGeneric.subcategory,
        brand: consolidatedGeneric.brand,
        model: consolidatedGeneric.model,
        color: consolidatedGeneric.primaryColor,
        material: consolidatedGeneric.material,
        visibleText: visionResult?.visibleText || [],
        logos: visionResult?.logos || (consolidatedGeneric.brand ? [consolidatedGeneric.brand] : []),
        accessories: visionResult?.accessories || [],
        distinctiveFeatures: distinctiveFeatureDescriptions,
        condition: visionResult?.condition || "good",
        ownerDescription: input.description,
        normalizedDescription: cleanDescriptionText(
          `${consolidatedGeneric.primaryColor} ${consolidatedGeneric.brand} ${consolidatedGeneric.model}. ${input.description}`
        ),
        metadata: metadata as unknown as Record<string, unknown>,
        imageReference: imagesToAnalyze.length > 0 ? imagesToAnalyze[0].id : null,
      },
      input.actorUserId,
      true // system extraction level
    );
  } catch (saveErr: unknown) {
    warnings.push(`Fingerprint DB save failed: ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`);
    status = "extraction_partial";
  }

  return {
    status,
    fingerprint: savedFingerprint,
    quality: visionResult?.overallQuality || null,
    metadata,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Checks if two distinctive features likely refer to the same physical evidence.
 */
function featuresMatch(a: DistinctiveFeature, b: DistinctiveFeature): boolean {
  if (a.type === b.type) {
    const aDesc = a.description.toLowerCase();
    const bDesc = b.description.toLowerCase();
    if (aDesc.includes(bDesc) || bDesc.includes(aDesc)) return true;

    // Check shared key nouns
    const aWords = aDesc.split(/\s+/).filter((w) => w.length >= 4);
    const bWords = bDesc.split(/\s+/).filter((w) => w.length >= 4);
    const overlap = aWords.filter((w) => bWords.includes(w));
    if (overlap.length >= 2) return true;
  }
  return false;
}
