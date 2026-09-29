/**
 * KHOJ — Verification Evidence Repository
 * Secure storage and evaluation of blind ownership verification challenges.
 */

import { id, now, one, all, run, transaction } from "@/lib/rvu/db";
import type { VerificationEvidence, ProtectedItem, CandidateScoreCard } from "@/lib/rvu/types";
import {
  validateVerificationEvidenceInput,
  validateVerificationResult,
  validateId,
  ValidationError,
} from "./validation";
import { AuthorizationError } from "./itemFingerprintRepository";

interface RawVerificationEvidenceRow {
  id: string;
  candidateMatchId: string;
  itemId: string;
  question: string;
  ownerAnswer: string;
  expectedEvidence: string;
  result: string;
  evidenceSource: string;
  createdAt: string;
}

function parseRow(row: RawVerificationEvidenceRow): VerificationEvidence {
  return {
    id: row.id,
    candidateMatchId: row.candidateMatchId,
    itemId: row.itemId,
    question: row.question,
    ownerAnswer: row.ownerAnswer,
    expectedEvidence: row.expectedEvidence,
    result: row.result as VerificationEvidence["result"],
    evidenceSource: row.evidenceSource,
    createdAt: row.createdAt,
  };
}

/**
 * Creates a VerificationEvidence record for a candidate match.
 */
export async function createVerificationEvidence(
  input: Partial<VerificationEvidence>,
  requestingUserId?: string,
  isStaffOrSystem = false
): Promise<VerificationEvidence> {
  const validated = validateVerificationEvidenceInput(input);

  // Validate candidate match and item existence
  const candidate = one<{ id: string; itemId: string }>(
    "SELECT id, itemId FROM candidate_matches WHERE id=?",
    validated.candidateMatchId
  );
  if (!candidate) {
    throw new ValidationError(`Candidate match #${validated.candidateMatchId} does not exist.`);
  }

  // Validate item ownership
  const item = one<ProtectedItem>("SELECT userId FROM protected_items WHERE id=?", validated.itemId);
  if (!item) {
    throw new ValidationError(`Item #${validated.itemId} does not exist.`);
  }

  if (!isStaffOrSystem && requestingUserId && item.userId !== requestingUserId) {
    throw new AuthorizationError("You cannot submit verification evidence for an item you do not own.");
  }

  const evidenceId = input.id ? validateId(input.id, "id") : `evid-${id("").slice(0, 16)}`;
  const timestamp = now();

  transaction(() => {
    run(
      `INSERT INTO verification_evidence (
        id, candidateMatchId, itemId, question, ownerAnswer,
        expectedEvidence, result, evidenceSource, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,?)`,
      evidenceId,
      validated.candidateMatchId,
      validated.itemId,
      validated.question,
      validated.ownerAnswer,
      validated.expectedEvidence,
      validated.result,
      validated.evidenceSource,
      timestamp
    );
  });

  const saved = one<RawVerificationEvidenceRow>(
    "SELECT * FROM verification_evidence WHERE id=?",
    evidenceId
  );

  if (!saved) {
    throw new Error("Failed to retrieve saved verification evidence.");
  }

  return parseRow(saved);
}

/**
 * Retrieves all verification evidence entries for a candidate match.
 * Restricted to the item owner or staff.
 */
export async function getEvidenceByCandidateId(
  candidateMatchId: string,
  requestingUserId?: string,
  isStaffOrSystem = false
): Promise<VerificationEvidence[]> {
  const safeCandidateId = validateId(candidateMatchId, "candidateMatchId");

  const candidate = one<{ id: string; itemId: string }>(
    "SELECT id, itemId FROM candidate_matches WHERE id=?",
    safeCandidateId
  );
  if (!candidate) return [];

  if (!isStaffOrSystem) {
    if (!requestingUserId) {
      throw new AuthorizationError("Authentication required.");
    }
    const item = one<ProtectedItem>("SELECT userId FROM protected_items WHERE id=?", candidate.itemId);
    if (!item || item.userId !== requestingUserId) {
      throw new AuthorizationError("You do not have permission to view verification evidence for this item.");
    }
  }

  const rows = all<RawVerificationEvidenceRow>(
    "SELECT * FROM verification_evidence WHERE candidateMatchId=? ORDER BY createdAt DESC",
    safeCandidateId
  );

  return rows.map(parseRow);
}

/**
 * Updates the verification result (e.g. 'pending' -> 'passed' | 'failed').
 */
export async function updateEvidenceResult(
  idStr: string,
  result: VerificationEvidence["result"],
  isStaffOrSystem = false
): Promise<VerificationEvidence> {
  if (!isStaffOrSystem) {
    throw new AuthorizationError("Only verified staff or backend verification services can update challenge results.");
  }

  const safeId = validateId(idStr, "evidence ID");
  const validatedResult = validateVerificationResult(result);

  run("UPDATE verification_evidence SET result=? WHERE id=?", validatedResult, safeId);

  const updated = one<RawVerificationEvidenceRow>(
    "SELECT * FROM verification_evidence WHERE id=?",
    safeId
  );
  if (!updated) {
    throw new ValidationError(`Verification evidence #${safeId} not found.`);
  }

  return parseRow(updated);
}
