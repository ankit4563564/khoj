/**
 * KHOJ — Item Fingerprint Repository
 * Secure server-side persistence and retrieval of owner-side item fingerprints.
 *
 * CRITICAL SECURITY PRINCIPLE:
 * Private item descriptions and clues must NEVER be returned to unauthorized users or finders.
 */

import { id, now, one, run, transaction } from "@/lib/rvu/db";
import type { ItemFingerprint, ProtectedItem } from "@/lib/rvu/types";
import { validateItemFingerprintInput, validateId, ValidationError } from "./validation";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized access to private fingerprint record.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

interface RawItemFingerprintRow {
  id: string;
  itemId: string;
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
  ownerDescription: string;
  normalizedDescription: string;
  metadata: string;
  imageReference: string | null;
  textEmbeddingReference: string | null;
  imageEmbeddingReference: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseRow(row: RawItemFingerprintRow): ItemFingerprint {
  return {
    id: row.id,
    itemId: row.itemId,
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
    ownerDescription: row.ownerDescription,
    normalizedDescription: row.normalizedDescription,
    metadata: JSON.parse(row.metadata || "{}"),
    imageReference: row.imageReference,
    textEmbeddingReference: row.textEmbeddingReference,
    imageEmbeddingReference: row.imageEmbeddingReference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Creates or updates an ItemFingerprint.
 * Validates ownership against protected_items.
 */
export async function createItemFingerprint(
  input: Partial<ItemFingerprint>,
  actorUserId?: string,
  isStaffOrSystem = false
): Promise<ItemFingerprint> {
  const validated = validateItemFingerprintInput(input);

  // Security Check: Verify item existence and ownership
  const protectedItem = one<ProtectedItem>(
    "SELECT * FROM protected_items WHERE id=?",
    validated.itemId
  );

  if (!protectedItem) {
    throw new ValidationError(`Associated protected item #${validated.itemId} does not exist.`);
  }

  if (!isStaffOrSystem && actorUserId && protectedItem.userId !== actorUserId) {
    throw new AuthorizationError("You cannot create a fingerprint for an item you do not own.");
  }

  const fingerprintId = input.id ? validateId(input.id, "id") : `fp-item-${id("").slice(0, 16)}`;
  const timestamp = now();

  transaction(() => {
    // Upsert fingerprint
    run(
      `INSERT INTO item_fingerprints (
        id, itemId, category, subcategory, brand, model, color, material,
        visibleText, logos, accessories, distinctiveFeatures, condition,
        ownerDescription, normalizedDescription, metadata, imageReference,
        textEmbeddingReference, imageEmbeddingReference, createdAt, updatedAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(itemId) DO UPDATE SET
        category=excluded.category,
        subcategory=excluded.subcategory,
        brand=excluded.brand,
        model=excluded.model,
        color=excluded.color,
        material=excluded.material,
        visibleText=excluded.visibleText,
        logos=excluded.logos,
        accessories=excluded.accessories,
        distinctiveFeatures=excluded.distinctiveFeatures,
        condition=excluded.condition,
        ownerDescription=excluded.ownerDescription,
        normalizedDescription=excluded.normalizedDescription,
        metadata=excluded.metadata,
        imageReference=excluded.imageReference,
        textEmbeddingReference=excluded.textEmbeddingReference,
        imageEmbeddingReference=excluded.imageEmbeddingReference,
        updatedAt=excluded.updatedAt`,
      fingerprintId,
      validated.itemId,
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
      validated.ownerDescription,
      validated.normalizedDescription,
      JSON.stringify(validated.metadata),
      validated.imageReference ?? null,
      validated.textEmbeddingReference ?? null,
      validated.imageEmbeddingReference ?? null,
      timestamp,
      timestamp
    );
  });

  const saved = one<RawItemFingerprintRow>(
    "SELECT * FROM item_fingerprints WHERE itemId=?",
    validated.itemId
  );

  if (!saved) {
    throw new Error("Failed to retrieve saved item fingerprint.");
  }

  return parseRow(saved);
}

/**
 * Retrieves an ItemFingerprint by associated item ID.
 * Enforces ownership: only the owner or staff can read.
 */
export async function getItemFingerprintByItemId(
  itemId: string,
  requestingUserId?: string,
  isStaffOrSystem = false
): Promise<ItemFingerprint | null> {
  const safeItemId = validateId(itemId, "itemId");

  // Ownership verification
  if (!isStaffOrSystem) {
    if (!requestingUserId) {
      throw new AuthorizationError("Authentication required to inspect private item fingerprint.");
    }
    const item = one<ProtectedItem>("SELECT userId FROM protected_items WHERE id=?", safeItemId);
    if (!item || item.userId !== requestingUserId) {
      throw new AuthorizationError("You do not have permission to view this item's fingerprint.");
    }
  }

  const row = one<RawItemFingerprintRow>(
    "SELECT * FROM item_fingerprints WHERE itemId=?",
    safeItemId
  );

  return row ? parseRow(row) : null;
}

/**
 * Retrieves an ItemFingerprint by fingerprint primary key.
 */
export async function getItemFingerprintById(
  idStr: string,
  requestingUserId?: string,
  isStaffOrSystem = false
): Promise<ItemFingerprint | null> {
  const safeId = validateId(idStr, "fingerprint ID");
  const row = one<RawItemFingerprintRow>(
    "SELECT * FROM item_fingerprints WHERE id=?",
    safeId
  );
  if (!row) return null;

  if (!isStaffOrSystem) {
    if (!requestingUserId) {
      throw new AuthorizationError("Authentication required to inspect private item fingerprint.");
    }
    const item = one<ProtectedItem>("SELECT userId FROM protected_items WHERE id=?", row.itemId);
    if (!item || item.userId !== requestingUserId) {
      throw new AuthorizationError("You do not have permission to view this item's fingerprint.");
    }
  }

  return parseRow(row);
}
