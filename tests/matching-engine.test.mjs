/**
 * KHOJ — Phase 4: Baseline Matching Engine Test Suite
 * Minimum 30 Deterministic Test Cases
 *
 * Covers:
 * A. Exact same physical item
 * B. Same model, different physical item
 * C. Same brand/category/color, different item
 * D. Distinctive sticker match (Spider-Man / Superman)
 * E. Distinctive scratch match (AirPods hinge)
 * F. Conflicting brand (Apple vs Samsung)
 * G. Conflicting color (Blue vs Red)
 * H. Missing distinctive evidence (unseen feature is missing, not conflict)
 * I. Multiple ambiguous candidates (identical item safety & ambiguity margin)
 * J. No plausible candidate (incompatible category)
 *
 * Plus 4 Mandatory Prompt Test Scenarios:
 * 1. Two owners of White AirPods Pro (Owner A with scratch near hinge, Owner B plain)
 * 2. Wildcraft backpack with Red Superman sticker (Owner A matches, Owner B has football sticker)
 * 3. Two owners with plain Black backpack (Found plain black backpack -> AMBIGUOUS / MANUAL REVIEW)
 * 4. Blue water bottle vs Red water bottle (Hard color conflict)
 *
 * Plus:
 * - Generic attributes alone never produce high confidence
 * - Contextual time/location scoring
 * - Pre-loss vault registration boost
 * - Database persistence to candidate_matches
 * - Privacy protection (no leaked personal identifiers)
 */

import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";

const testDbPath = path.resolve(process.cwd(), ".test-data", "matching-test.sqlite");
fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.RVU_DB_PATH = testDbPath;

// Dynamic imports after setting RVU_DB_PATH
const { run, now } = await import("../src/lib/rvu/db.ts");
const {
  compareGenericAttributes,
  areCategoriesCompatible,
  compareDistinctiveFeatures,
  compareContext,
  generateCandidateScorecard,
  matchFoundItem,
} = await import("../src/lib/rvu/matching/index.ts");
const {
  getCandidateMatchById,
  listCandidatesForItem,
  createItemFingerprint,
  createFoundFingerprint,
} = await import("../src/lib/rvu/fingerprints/index.ts");

console.log("==================================================");
console.log("Starting KHOJ Phase 4: Baseline Matching Engine Tests");
console.log("==================================================\n");

let passed = 0;

function check(condition, message) {
  assert.ok(condition, message);
  passed++;
  console.log(`✓ PASS: ${message}`);
}

// -------------------------------------------------------------
// SEED PREREQUISITE USERS
// -------------------------------------------------------------
const ownerAId = "usr-owner-a";
const ownerBId = "usr-owner-b";
const finderId = "usr-finder-ph4";

run(
  "INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
  ownerAId, "Aarav Patel", "aarav@rvu.edu.in", "RVU23CS101", "School of Computer Science", "student", 1, now()
);
run(
  "INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
  ownerBId, "Bhavna Rao", "bhavna@rvu.edu.in", "RVU23DS202", "School of Design", "student", 1, now()
);
run(
  "INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
  finderId, "Chetan Kumar", "chetan@rvu.edu.in", "RVU23EC303", "School of Engineering", "student", 1, now()
);

// =============================================================
// SUITE 1: CATEGORY COMPATIBILITY (5 Tests)
// =============================================================
console.log("--- Suite 1: Category Compatibility ---");

check(areCategoriesCompatible("Electronics", "Electronics"), "TC-01: Same category is compatible");
check(areCategoriesCompatible("Bags", "Accessories"), "TC-02: Bags and Accessories are cross-compatible");
check(areCategoriesCompatible("Accessories", "Other"), "TC-03: Accessories and Other are cross-compatible");
check(!areCategoriesCompatible("Electronics", "ID cards"), "TC-04: Electronics vs ID cards is incompatible");
check(!areCategoriesCompatible("Bags", "ID cards"), "TC-05: Bags vs ID cards is incompatible");

// =============================================================
// SUITE 2: GENERIC ATTRIBUTE COMPARISON & CONFLICTS (5 Tests)
// =============================================================
console.log("\n--- Suite 2: Generic Attribute Comparison ---");

// Brand conflict
const brandConflict = compareGenericAttributes(
  { category: "Electronics", brand: "Apple", color: "White" },
  { category: "Electronics", brand: "Samsung", color: "White" }
);
check(brandConflict.conflicts.some((c) => c.includes("Brand conflict")), "TC-06: Brand conflict correctly flagged (Apple vs Samsung)");
check(brandConflict.score <= 0.35, "TC-07: Score heavily penalized on brand conflict");

// Color conflict (Mandatory Prompt Test 4: Blue bottle vs Red bottle)
const colorConflict = compareGenericAttributes(
  { category: "Accessories", brand: "Milton", color: "Blue" },
  { category: "Accessories", brand: "Milton", color: "Red" }
);
check(colorConflict.conflicts.some((c) => c.includes("Color conflict")), "TC-08: Color conflict correctly flagged (Blue vs Red)");
check(colorConflict.score <= 0.45, "TC-09: Color conflict caps generic compatibility score");

// Space gray vs Gray compatibility
const colorCompatible = compareGenericAttributes(
  { category: "Electronics", brand: "Apple", color: "Space Gray" },
  { category: "Electronics", brand: "Apple", color: "Gray" }
);
check(colorCompatible.conflicts.length === 0, "TC-10: Space Gray and Gray are recognized as compatible");

// =============================================================
// SUITE 3: DISTINCTIVE FEATURE COMPARISON & ABSENCE (5 Tests)
// =============================================================
console.log("\n--- Suite 3: Distinctive Feature Comparison ---");

// Spider-Man sticker match
const stickerMatch = compareDistinctiveFeatures(
  ["STICKER: Spider-Man sticker near bottom"],
  ["STICKER: Spider-Man sticker (Lower body)"]
);
check(stickerMatch.score >= 0.85, "TC-11: Spider-Man sticker matched across wording variants");
check(stickerMatch.matchedFeatures.length === 1, "TC-12: Exactly one distinctive feature matched");

// Distinctive conflict (Superman vs Football sticker)
const stickerConflict = compareDistinctiveFeatures(
  ["STICKER: Red Superman sticker on front pocket"],
  ["STICKER: Blue football sticker on front pocket"]
);
check(stickerConflict.conflicts.length >= 1, "TC-13: Mutually exclusive stickers flagged as conflict");
check(stickerConflict.score <= 0.25, "TC-14: Score penalized on distinctive sticker conflict");

// Absence of evidence is NOT conflict (scratch on back unobserved)
const unseenFeature = compareDistinctiveFeatures(
  ["SCRATCH: Deep scratch on back casing"],
  [] // Found photo only shows front
);
check(unseenFeature.conflicts.length === 0, "TC-15: Unobserved mark is NOT treated as a conflict");
check(unseenFeature.missingEvidence.length >= 1, "TC-16: Unobserved mark correctly cataloged in missingEvidence");

// =============================================================
// SUITE 4: CONTEXTUAL EVIDENCE (4 Tests)
// =============================================================
console.log("\n--- Suite 4: Contextual Evidence ---");

const exactContext = compareContext({
  ownerLocation: "Library 2nd Floor",
  foundLocation: "Library",
  ownerLostDate: "2026-09-28",
  foundDate: "2026-09-28",
  itemCreatedAt: "2026-09-01T10:00:00.000Z",
  foundCreatedAt: "2026-09-28T14:00:00.000Z",
});
check(exactContext.locationScore >= 0.85, "TC-17: Location proximity match recognized");
check(exactContext.timeScore === 1.0, "TC-18: Same-day loss and discovery awarded full timeScore");
check(exactContext.registrationTimingScore === 1.0, "TC-19: Pre-loss vault registration awarded full score");

// Temporal impossibility (found before lost)
const impossibleTiming = compareContext({
  ownerLostDate: "2026-09-29",
  foundDate: "2026-09-20", // Found 9 days before owner claims it was lost
});
check(impossibleTiming.conflicts.some((c) => c.includes("Temporal conflict")), "TC-20: Found-before-lost flagged as temporal conflict");

// =============================================================
// SUITE 5: FOUR MANDATORY PROMPT TEST SCENARIOS (8 Tests)
// =============================================================
console.log("\n--- Suite 5: Mandatory Prompt Test Scenarios ---");

// SCENARIO 1: Two owners with White AirPods Pro
// Owner A has scratch near hinge. Owner B has no known distinctive features.
// Found item has scratch near hinge.
console.log("Scenario 1: Two owners of White AirPods Pro");
const ownerAFp = {
  id: "fp-item-airpods-a",
  itemId: "item-airpods-a",
  category: "Electronics",
  subcategory: "Audio & Earbuds",
  brand: "Apple",
  model: "AirPods Pro",
  color: "White",
  distinctiveFeatures: ["SCRATCH: small black scratch near left hinge"],
  visibleText: [],
  createdAt: "2026-09-01T00:00:00.000Z",
};

const ownerBFp = {
  id: "fp-item-airpods-b",
  itemId: "item-airpods-b",
  category: "Electronics",
  subcategory: "Audio & Earbuds",
  brand: "Apple",
  model: "AirPods Pro",
  color: "White",
  distinctiveFeatures: [], // Generic white airpods
  visibleText: [],
  createdAt: "2026-09-05T00:00:00.000Z",
};

const foundAirPodsFp = {
  id: "fp-found-airpods",
  foundReportId: "rep-found-airpods",
  category: "Electronics",
  subcategory: "Audio & Earbuds",
  brand: "Apple",
  model: "AirPods Pro",
  color: "White",
  distinctiveFeatures: ["SCRATCH: visible dark scratch near left hinge"],
  visibleText: [],
  foundLocation: "Library",
  foundAt: "2026-09-28T10:00:00.000Z",
  createdAt: "2026-09-28T10:00:00.000Z",
};

const scorecardA = generateCandidateScorecard({
  ownerFingerprint: ownerAFp,
  foundFingerprint: foundAirPodsFp,
});

const scorecardB = generateCandidateScorecard({
  ownerFingerprint: ownerBFp,
  foundFingerprint: foundAirPodsFp,
});

check(scorecardA.candidateScore > scorecardB.candidateScore, "TC-21: Owner A (with scratch) scores higher than Owner B (plain)");
check(scorecardA.candidateState === "HIGH_CONFIDENCE_CANDIDATE", "TC-22: Owner A is a HIGH_CONFIDENCE_CANDIDATE");
check(scorecardA.candidateStatus === "verification_required", "TC-23: Owner A status is verification_required, NEVER auto-verified");
check(scorecardB.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-24: Owner B with only generic traits requires manual review");

// SCENARIO 2: Black Wildcraft backpack with Red Superman sticker
// Owner A has Red Superman sticker. Owner B has Blue football sticker.
console.log("\nScenario 2: Backpack with Red Superman sticker");
const backpackOwnerA = {
  id: "fp-bp-a",
  itemId: "item-bp-a",
  category: "Bags",
  subcategory: "Backpacks",
  brand: "Wildcraft",
  model: "Campus Backpack",
  color: "Black",
  distinctiveFeatures: ["STICKER: Red Superman sticker on front pocket"],
  visibleText: [],
  createdAt: "2026-09-01T00:00:00.000Z",
};

const backpackOwnerB = {
  id: "fp-bp-b",
  itemId: "item-bp-b",
  category: "Bags",
  subcategory: "Backpacks",
  brand: "Wildcraft",
  model: "Campus Backpack",
  color: "Black",
  distinctiveFeatures: ["STICKER: Blue football sticker on front pocket"],
  visibleText: [],
  createdAt: "2026-09-01T00:00:00.000Z",
};

const foundBackpackFp = {
  id: "fp-found-bp",
  foundReportId: "rep-found-bp",
  category: "Bags",
  subcategory: "Backpacks",
  brand: "Wildcraft",
  model: "Campus Backpack",
  color: "Black",
  distinctiveFeatures: ["STICKER: Red Superman sticker near front pocket"],
  visibleText: [],
  foundLocation: "Cafeteria",
  foundAt: "2026-09-28T12:00:00.000Z",
  createdAt: "2026-09-28T12:00:00.000Z",
};

const scBackpackA = generateCandidateScorecard({
  ownerFingerprint: backpackOwnerA,
  foundFingerprint: foundBackpackFp,
});
const scBackpackB = generateCandidateScorecard({
  ownerFingerprint: backpackOwnerB,
  foundFingerprint: foundBackpackFp,
});

check(scBackpackA.candidateScore >= 0.85, "TC-25: Owner A receives strong score on matching Superman sticker");
check(scBackpackB.candidateScore <= 0.45, "TC-26: Owner B receives low score due to football vs Superman conflict");

// SCENARIO 3: Identical items safety (Two owners with plain black backpack)
console.log("\nScenario 3: Plain identical black backpacks");
const plainOwner1 = {
  id: "fp-p1",
  itemId: "item-p1",
  category: "Bags",
  brand: "Wildcraft",
  model: "Backpack",
  color: "Black",
  distinctiveFeatures: [],
  visibleText: [],
  createdAt: "2026-09-01T00:00:00.000Z",
};
const plainOwner2 = {
  id: "fp-p2",
  itemId: "item-p2",
  category: "Bags",
  brand: "Wildcraft",
  model: "Backpack",
  color: "Black",
  distinctiveFeatures: [],
  visibleText: [],
  createdAt: "2026-09-02T00:00:00.000Z",
};
const foundPlainBp = {
  id: "fp-found-plain",
  foundReportId: "rep-found-plain",
  category: "Bags",
  brand: "Wildcraft",
  model: "Backpack",
  color: "Black",
  distinctiveFeatures: [],
  visibleText: [],
  foundLocation: "Sports Ground",
  foundAt: "2026-09-28T12:00:00.000Z",
  createdAt: "2026-09-28T12:00:00.000Z",
};

const scPlain1 = generateCandidateScorecard({
  ownerFingerprint: plainOwner1,
  foundFingerprint: foundPlainBp,
});
const scPlain2 = generateCandidateScorecard({
  ownerFingerprint: plainOwner2,
  foundFingerprint: foundPlainBp,
});

check(scPlain1.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-27: Plain identical backpack 1 gated at REQUIRES_MANUAL_REVIEW");
check(scPlain2.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-28: Plain identical backpack 2 gated at REQUIRES_MANUAL_REVIEW");

// =============================================================
// SUITE 6: SAFETY CAPS & AMBIGUITY RESOLUTION (6 Tests)
// =============================================================
console.log("\n--- Suite 6: Safety Caps & Ambiguity Engine ---");

// Generic attributes must NEVER dominate rule check
check(
  scPlain1.candidateScore < 0.75,
  "TC-29: Generic attributes alone are capped below 0.75 without distinctive features"
);

// End-to-end multi-candidate matching with ambiguity detection
// Seed two lost items for Owner A and Owner B
run(
  "INSERT INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, imageId, createdAt, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  "item-ambig-1", ownerAId, "Black Bag", "Bags", "Wildcraft", "Black", "Black backpack", "", null, now(), "lost"
);
await createItemFingerprint({
  id: "fp-ambig-1",
  itemId: "item-ambig-1",
  category: "Bags",
  brand: "Wildcraft",
  model: "Backpack",
  color: "Black",
  distinctiveFeatures: [],
  ownerDescription: "Black backpack",
  normalizedDescription: "black backpack",
}, ownerAId, true);

run(
  "INSERT INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, imageId, createdAt, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  "item-ambig-2", ownerBId, "Black Bag 2", "Bags", "Wildcraft", "Black", "Black backpack 2", "", null, now(), "lost"
);
await createItemFingerprint({
  id: "fp-ambig-2",
  itemId: "item-ambig-2",
  category: "Bags",
  brand: "Wildcraft",
  model: "Backpack",
  color: "Black",
  distinctiveFeatures: [],
  ownerDescription: "Black backpack 2",
  normalizedDescription: "black backpack 2",
}, ownerBId, true);

// Seed found report
const foundAmbigRepId = "rep-found-ambig-test";
run(
  "INSERT INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, imageId, createdAt, custodyLocation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  foundAmbigRepId, finderId, "found", "Wildcraft Backpack", "Bags", "Black", "Wildcraft", "Found black bag", "", "Cafeteria", "2026-09-29", "Other", "open", null, now(), ""
);
await createFoundFingerprint({
  id: "fp-found-ambig",
  foundReportId: foundAmbigRepId,
  category: "Bags",
  brand: "Wildcraft",
  model: "Backpack",
  color: "Black",
  distinctiveFeatures: [],
  visualDescription: "Found plain black wildcraft bag",
  foundLocation: "Cafeteria",
  foundAt: new Date().toISOString(),
}, finderId, true);

// Run candidate matching engine
const matchResult = await matchFoundItem(foundAmbigRepId);

check(matchResult.isAmbiguous === true, "TC-30: Ambiguity correctly flagged when candidates are within 0.08 margin");
check(matchResult.candidates.length >= 2, "TC-31: Both candidates preserved without picking one arbitrarily");
check(matchResult.topCandidate?.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-32: Top candidate state forced to REQUIRES_MANUAL_REVIEW due to ambiguity");

// Verify candidates were persisted to candidate_matches table
const savedMatches = await listCandidatesForItem("item-ambig-1", ownerAId);
check(savedMatches.length >= 1, "TC-33: Candidate scorecard persisted to database");
check(savedMatches[0].foundReportId === foundAmbigRepId, "TC-34: Candidate match links correct found report");

// =============================================================
// SUITE 7: PRIVACY ENFORCEMENT (3 Tests)
// =============================================================
console.log("\n--- Suite 7: Privacy Enforcement ---");

const scorecardToCheck = matchResult.candidates[0];
check(!("ownerEmail" in scorecardToCheck), "TC-35: Owner email not exposed in candidate scorecard");
check(!("studentId" in scorecardToCheck), "TC-36: Student ID / USN not exposed in candidate scorecard");
check(!("finderPhone" in scorecardToCheck), "TC-37: Finder contact not exposed in candidate scorecard");

console.log("\n==================================================");
console.log(`ALL ${passed} PHASE 4 MATCHING ENGINE TESTS PASSED!`);
console.log("==================================================\n");
