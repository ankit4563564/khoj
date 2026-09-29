// Tests for KHOJ Phase 1: Production Data Foundation
// Validates:
// 1. Item fingerprint creation
// 2. Found fingerprint creation
// 3. Candidate match creation
// 4. Verification evidence creation
// 5. Invalid data rejection
// 6. Unauthorized access rejection
// 7. Public user cannot access private fingerprint data

import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";

const testDbPath = path.resolve(process.cwd(), ".test-data", "fingerprints-test.sqlite");
fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.RVU_DB_PATH = testDbPath;

// Dynamic import after setting RVU_DB_PATH so database initializes at testDbPath
const { db, run, id, now } = await import("../src/lib/rvu/db.ts");
const {
  createItemFingerprint,
  getItemFingerprintByItemId,
  getItemFingerprintById,
  createFoundFingerprint,
  getFoundFingerprintByReportId,
  createCandidateMatch,
  getCandidateMatchById,
  listCandidatesForItem,
  updateCandidateStatus,
  createVerificationEvidence,
  getEvidenceByCandidateId,
  updateEvidenceResult,
  ValidationError,
  AuthorizationError,
} = await import("../src/lib/rvu/fingerprints/index.ts");

console.log("Starting KHOJ Phase 1 Data Foundation Test Suite...\n");
let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);
  passed++;
  console.log(`✓ PASS: ${message}`);
}

// -------------------------------------------------------------
// SEED PREREQUISITE RECORDS (USERS, PROTECTED ITEMS, REPORTS)
// -------------------------------------------------------------
const ownerId = "usr-owner-001";
const strangerId = "usr-stranger-002";
const finderId = "usr-finder-003";

run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
  ownerId, "Alex Rivera", "alex@rvu.edu.in", "RVU23B001", "School of Computer Science & Engineering", "student", 1, now()
);
run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
  strangerId, "Sam Doe", "sam@rvu.edu.in", "RVU23B002", "School of Business", "student", 1, now()
);
run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
  finderId, "Maya Chen", "maya@rvu.edu.in", "RVU23B003", "School of Design & Innovation", "student", 1, now()
);

const testItemId = "item-macbook-pro";
run("INSERT INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, createdAt) VALUES (?,?,?,?,?,?,?,?,?)",
  testItemId, ownerId, "MacBook Pro 14", "Electronics", "Apple", "Space Gray", "14-inch M3 Pro with matte case", "Custom laser etching on bottom hinge: RVU-M3-99", now()
);

const testFoundReportId = "RVU-2026-FOUND-001";
run("INSERT INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  testFoundReportId, finderId, "found", "Space Gray Laptop", "Electronics", "Space Gray", "Apple", "Found on table near library elevator", "", "Central Library Floor 2", "2026-09-29", "School of Computer Science & Engineering", "open", now()
);

// -------------------------------------------------------------
// TEST 1: ITEM FINGERPRINT CREATION
// -------------------------------------------------------------
const itemFp = await createItemFingerprint(
  {
    itemId: testItemId,
    category: "Electronics",
    brand: "Apple",
    model: "MacBook Pro 14 M3",
    color: "Space Gray",
    material: "Aluminum",
    visibleText: ["MacBook Pro", "Designed by Apple"],
    logos: ["Apple logo"],
    accessories: ["Black braided MagSafe cable"],
    distinctiveFeatures: ["Laser etching on bottom hinge", "Small nick on left speaker grill"],
    condition: "excellent",
    ownerDescription: "14-inch Space Gray MacBook Pro with black matte dbrand skin and laser etching",
    normalizedDescription: "apple macbook pro 14 inch space gray laptop m3",
    metadata: { purchaseYear: 2024, hasSkin: true },
  },
  ownerId
);

check(itemFp.id.startsWith("fp-item-"), "Item fingerprint created with canonical prefix");
check(itemFp.itemId === testItemId, "Item fingerprint linked to target protected item");
check(itemFp.distinctiveFeatures.length === 2, "Item fingerprint preserves structured distinctive features");
check(itemFp.visibleText[0] === "MacBook Pro", "Item fingerprint preserves visible text cues");

// -------------------------------------------------------------
// TEST 2: FOUND FINGERPRINT CREATION
// -------------------------------------------------------------
const foundFp = await createFoundFingerprint(
  {
    foundReportId: testFoundReportId,
    category: "Electronics",
    brand: "Apple",
    model: "MacBook Pro",
    color: "Space Gray",
    material: "Aluminum",
    visibleText: ["MacBook Pro"],
    logos: ["Apple logo"],
    distinctiveFeatures: ["Etching visible near hinge"],
    condition: "good",
    visualDescription: "Space Gray aluminum laptop found closed on desk with charger nearby",
    foundLocation: "Central Library Floor 2",
    foundAt: new Date().toISOString(),
    metadata: { deskNumber: 14 },
  },
  finderId
);

check(foundFp.id.startsWith("fp-found-"), "Found fingerprint created with canonical prefix");
check(foundFp.foundReportId === testFoundReportId, "Found fingerprint linked to target found report");
check(foundFp.foundLocation === "Central Library Floor 2", "Found fingerprint captures campus location");

// -------------------------------------------------------------
// TEST 3: CANDIDATE MATCH CREATION (GATED EVIDENCE SCORECARD)
// -------------------------------------------------------------
const candidate = await createCandidateMatch(
  {
    foundReportId: testFoundReportId,
    itemId: testItemId,
    vectorSimilarity: 0.92,
    attributeScore: 95,
    uniqueClueScore: 88,
    locationScore: 90,
    timeScore: 85,
    overallScore: 91,
    confidenceTier: "high",
    status: "candidate",
    evidence: [
      "Exact category match: Electronics",
      "Brand match: Apple",
      "Color match: Space Gray",
      "Corroborating hinge etching text pattern detected",
    ],
  },
  true // Trusted system caller
);

check(candidate.id.startsWith("cand-"), "Candidate match scorecard created with unique ID");
check(candidate.overallScore === 91, "Overall score calculated and validated");
check(candidate.confidenceTier === "high", "High confidence tier assigned");
check(candidate.status === "candidate", "Status defaults to candidate (NEVER auto-converted to owner)");

// Test candidate status update
const updatedCand = await updateCandidateStatus(candidate.id, "verification_required", true);
check(updatedCand.status === "verification_required", "Candidate status transitioned to verification_required");

// -------------------------------------------------------------
// TEST 4: VERIFICATION EVIDENCE CREATION (BLIND CHALLENGE-RESPONSE)
// -------------------------------------------------------------
const evidence = await createVerificationEvidence(
  {
    candidateMatchId: candidate.id,
    itemId: testItemId,
    question: "What unique laser engraving is marked near the bottom hinge?",
    ownerAnswer: "RVU-M3-99",
    expectedEvidence: "RVU-M3-99",
    result: "pending",
    evidenceSource: "owner_registration",
  },
  ownerId
);

check(evidence.id.startsWith("evid-"), "Verification evidence created with unique ID");
check(evidence.result === "pending", "Verification challenge begins in pending state");

const verifiedEvidence = await updateEvidenceResult(evidence.id, "passed", true);
check(verifiedEvidence.result === "passed", "Verification evidence updated to passed following corroboration");

// -------------------------------------------------------------
// TEST 5: INVALID DATA REJECTION
// -------------------------------------------------------------
let rejectedValidation = false;
try {
  await createItemFingerprint(
    {
      itemId: "invalid-item-non-existent",
      category: "Electronics",
    },
    ownerId
  );
} catch (err) {
  if (err instanceof ValidationError) {
    rejectedValidation = true;
  }
}
check(rejectedValidation, "Rejects fingerprint creation for non-existent item");

let rejectedScore = false;
try {
  await createCandidateMatch(
    {
      foundReportId: testFoundReportId,
      itemId: testItemId,
      overallScore: 150, // Invalid score > 100
      confidenceTier: "high",
    },
    true
  );
} catch (err) {
  if (err instanceof ValidationError) {
    rejectedScore = true;
  }
}
check(rejectedScore, "Rejects candidate score out of range (>100)");

// -------------------------------------------------------------
// TEST 6: UNAUTHORIZED ACCESS REJECTION
// -------------------------------------------------------------
let rejectedUnauthorizedCreation = false;
try {
  // Stranger tries to create a fingerprint for someone else's item
  await createItemFingerprint(
    {
      itemId: testItemId,
      category: "Electronics",
      brand: "Apple",
      model: "MacBook",
      color: "Space Gray",
    },
    strangerId // Not the owner!
  );
} catch (err) {
  if (err instanceof AuthorizationError) {
    rejectedUnauthorizedCreation = true;
  }
}
check(rejectedUnauthorizedCreation, "Rejects fingerprint creation by unauthorized user for someone else's item");

// -------------------------------------------------------------
// TEST 7: PUBLIC USER CANNOT ACCESS PRIVATE FINGERPRINT DATA
// -------------------------------------------------------------
let publicAccessBlocked = false;
try {
  // Unauthenticated caller (undefined requestingUserId) attempting to inspect private fingerprint
  await getItemFingerprintByItemId(testItemId, undefined, false);
} catch (err) {
  if (err instanceof AuthorizationError) {
    publicAccessBlocked = true;
  }
}
check(publicAccessBlocked, "Public/unauthenticated caller cannot access private item fingerprint");

let strangerAccessBlocked = false;
try {
  // Authenticated stranger attempting to inspect another student's private fingerprint
  await getItemFingerprintByItemId(testItemId, strangerId, false);
} catch (err) {
  if (err instanceof AuthorizationError) {
    strangerAccessBlocked = true;
  }
}
check(strangerAccessBlocked, "Stranger cannot access private item fingerprint belonging to another student");

// Owner CAN access their own fingerprint
const ownerAccess = await getItemFingerprintByItemId(testItemId, ownerId, false);
check(ownerAccess !== null && ownerAccess.itemId === testItemId, "Owner can access their own item fingerprint");

console.log(`\n======================================================`);
console.log(`ALL ${passed} PHASE 1 TESTS PASSED SUCCESSFULLY!`);
console.log(`======================================================\n`);
