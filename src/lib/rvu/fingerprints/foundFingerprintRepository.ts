/**
 * KHOJ — Found Fingerprint Repository
 * Secure server-side persistence and retrieval of found-item fingerprints.
 */

import { id, now, one, run, transaction } from "@/lib/rvu/db";
import type { FoundFingerprint, Report } from "@/lib/rvu/types";
import { validateFoundFingerprintInput, validateId, ValidationError } from "./validation";
import { AuthorizationError } from "./itemFingerprintRepository";

interface RawFoundFingerprintRow {
  id: string;
  foundReportId: string;
  category: string;
  subcategory: string | null;
  brand: string;
  model: string;
  color: string;
  material: string | null;
  visibleText: string;
  logos: string;
  accessories: string;
  distinctiveFeatures: string;
  condition: string;
  visualDescription: string;
  foundLocation: string;
  foundAt: string;
  imageReference: string | null;
  imageEmbeddingReference: string | null;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

function parseRow(row: RawFoundFingerprintRow): FoundFingerprint {
  return {
    id: row.id,
    foundReportId: row.foundReportId,
    category: row.category,
    subcategory: row.subcategory,
    brand: row.brand,
    model: row.model,
    color: row.color,
    material: row.material,
    visibleText: JSON.parse(row.visibleText || "[]"),
    logos: JSON.parse(row.logos || "[]"),
    accessories: JSON.parse(row.accessories || "[]"),
    distinctiveFeatures: JSON.parse(row.distinctiveFeatures || "[]"),
    condition: row.condition,
    visualDescription: row.visualDescription,
    foundLocation: row.foundLocation,
    foundAt: row.foundAt,
    imageReference: row.imageReference,
    imageEmbeddingReference: row.imageEmbeddingReference,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Creates or updates a FoundFingerprint.
 * Validates against existing found reports.
 */
export async function createFoundFingerprint(
  input: Partial<FoundFingerprint>,
  actorUserId?: string,
  isStaffOrSystem = false
): Promise<FoundFingerprint> {
  const validated = validateFoundFingerprintInput(input);

  // Verify associated report exists and is a 'found' report
  const report = await one<Report>("SELECT * FROM reports WHERE id=?", validated.foundReportId);
  if (!report) {
    throw new ValidationError(`Associated report #${validated.foundReportId} does not exist.`);
  }
  if (report.kind !== "found") {
    throw new ValidationError(`Report #${validated.foundReportId} is not a found item report.`);
  }

  // If not staff/system and actor is provided, ensure actor is the finder who reported it
  if (!isStaffOrSystem && actorUserId && report.userId !== actorUserId) {
    throw new AuthorizationError("You cannot modify the fingerprint of a report you did not file.");
  }

  const fingerprintId = input.id ? validateId(input.id, "id") : `fp-found-${id("").slice(0, 16)}`;
  const timestamp = now();

  await transaction(async () => {
    await run(
      `INSERT INTO found_fingerprints (
        id, "foundReportId", category, subcategory, brand, model, color, material,
        "visibleText", logos, accessories, "distinctiveFeatures", condition,
        "visualDescription", "foundLocation", "foundAt", "imageReference",
        "imageEmbeddingReference", metadata, "createdAt", "updatedAt"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT("foundReportId") DO UPDATE SET
        category=excluded.category,
        subcategory=excluded.subcategory,
        brand=excluded.brand,
        model=excluded.model,
        color=excluded.color,
        material=excluded.material,
        "visibleText"=excluded."visibleText",
        logos=excluded.logos,
        accessories=excluded.accessories,
        "distinctiveFeatures"=excluded."distinctiveFeatures",
        condition=excluded.condition,
        "visualDescription"=excluded."visualDescription",
        "foundLocation"=excluded."foundLocation",
        "foundAt"=excluded."foundAt",
        "imageReference"=excluded."imageReference",
        "imageEmbeddingReference"=excluded."imageEmbeddingReference",
        metadata=excluded.metadata,
        "updatedAt"=excluded."updatedAt"`,
      fingerprintId,
      validated.foundReportId,
      validated.category,
      validated.subcategory ?? null,
      validated.brand,
      validated.model,
      validated.color,
      validated.material ?? null,
      JSON.stringify(validated.visibleText),
      JSON.stringify(validated.logos),
      JSON.stringify(validated.accessories),
      JSON.stringify(validated.distinctiveFeatures),
      validated.condition,
      validated.visualDescription,
      validated.foundLocation,
      validated.foundAt,
      validated.imageReference ?? null,
      validated.imageEmbeddingReference ?? null,
      JSON.stringify(validated.metadata),
      timestamp,
      timestamp
    );
  });

  const saved = await one<RawFoundFingerprintRow>(
    'SELECT * FROM found_fingerprints WHERE "foundReportId"=?',
    validated.foundReportId
  );

  if (!saved) {
    throw new Error("Failed to retrieve saved found fingerprint.");
  }

  return parseRow(saved);
}

/**
 * Retrieves a FoundFingerprint by report ID.
 */
export async function getFoundFingerprintByReportId(
  foundReportId: string,
  requestingUserId?: string,
  isStaffOrSystem = false
): Promise<FoundFingerprint | null> {
  const safeReportId = validateId(foundReportId, "foundReportId");
  const row = await one<RawFoundFingerprintRow>(
    'SELECT * FROM found_fingerprints WHERE "foundReportId"=?',
    safeReportId
  );
  return row ? parseRow(row) : null;
}

/**
 * Retrieves a FoundFingerprint by fingerprint primary key.
 */
export async function getFoundFingerprintById(
  idStr: string,
  requestingUserId?: string,
  isStaffOrSystem = false
): Promise<FoundFingerprint | null> {
  const safeId = validateId(idStr, "fingerprint ID");
  const row = await one<RawFoundFingerprintRow>(
    "SELECT * FROM found_fingerprints WHERE id=?",
    safeId
  );
  return row ? parseRow(row) : null;
}
