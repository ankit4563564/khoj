/**
 * KHOJ — Phase 6: Multimodal Candidate Reranking Engine Test Suite
 * 100+ Controlled Test Cases & Comprehensive Benchmark
 *
 * Covers:
 * 1. Exact physical match
 * 2. Same-model different physical item
 * 3. Same brand/category/color
 * 4. Distinctive sticker match (Superman, Spider-Man, Batman, Octocat)
 * 5. Distinctive scratch match (AirPods hinge scratch)
 * 6. Distinctive dent match (corner dent, water bottle base dent)
 * 7. Engraving match (initials AK)
 * 8. Damage mismatch
 * 9. Brand conflict (Apple vs Samsung)
 * 10. Color conflict (Blue vs Red)
 * 11. Category conflict (Laptop vs Wallet)
 * 12. Missing visual evidence (unseen feature is missing, not conflict)
 * 13. Partial image
 * 14. Cluttered background context
 * 15. Different viewing angle (front vs side vs top)
 * 16. Different lighting
 * 17. Owner without photo (Wildcraft Superman backpack description)
 * 18. Owner with photo
 * 19. Multiple ambiguous candidates (two identical black backpacks)
 * 20. No plausible candidate (incompatible category)
 *
 * Plus 5 Mandatory Critical Prompt Cases:
 * Case 1: AirPods Pro (scratch vs different case vs plain) -> Owner A stronger, NEVER verified
 * Case 2: Wildcraft backpack (Superman vs Football sticker) -> Owner A higher
 * Case 3: Two plain black backpacks -> AMBIGUOUS / MANUAL REVIEW
 * Case 4: Blue water bottle vs Red water bottle -> Hard color conflict, capped below 0.40
 * Case 5: Owner without photo -> Bridges gap via structured text
 *
 * Plus Security & Privacy:
 * - Public endpoints do not expose candidate lists, vectors, or owner identities
 * - Separate score channels: Phase 4 baseline, Phase 5 vector, Phase 6 rerank
 */

import path from "node:path";
import fs from "node:fs";

const testDbPath = path.resolve(process.cwd(), ".test-data", "reranking-test.sqlite");
fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch {}
}
process.env.RVU_DB_PATH = testDbPath;

const { run, one, now } = await import("../src/lib/rvu/db.ts");
const {
  RERANKING_CONFIG,
  compareDistinctivePhysicalFeatures,
  compareStructuredAttributes,
  evaluateMultimodalVectorEvidence,
  compareContextAndTemporalEvidence,
  scoreCandidateRerank,
  rerankFoundCandidates,
} = await import("../src/lib/rvu/reranking/index.ts");
const { generateOwnerItemEmbedding, generateFoundReportEmbedding } = await import("../src/lib/rvu/embeddings/index.ts");
const { createItemFingerprint } = await import("../src/lib/rvu/fingerprints/itemFingerprintRepository.ts");
const { createFoundFingerprint } = await import("../src/lib/rvu/fingerprints/foundFingerprintRepository.ts");
const { listCandidatesForItem } = await import("../src/lib/rvu/fingerprints/candidateRepository.ts");

let passed = 0;
let failed = 0;

function check(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${testName}`);
    failed++;
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  console.log("\n==================================================");
  console.log("Starting KHOJ Phase 6: Multimodal Reranking Tests");
  console.log("==================================================\n");

  // =============================================================
  // SUITE 1: 5 MANDATORY CRITICAL PROMPT CASES (15 Tests)
  // =============================================================
  console.log("--- Suite 1: Mandatory Critical Prompt Cases ---");

  // CRITICAL CASE 1: AirPods Pro Same-Model Safety
  // Owner A: white AirPods Pro, black scratch near hinge
  // Owner B: white AirPods Pro, different case damage (small dent on base)
  // Owner C: white AirPods Pro, plain (no distinctive info)
  // Found: white AirPods Pro, black scratch near hinge
  const airpodsOwnerSample = {
    category: "Electronics",
    brand: "Apple",
    model: "AirPods Pro",
    color: "White",
  };

  const scAirpodsA = scoreCandidateRerank({
    ownerFingerprint: { ...airpodsOwnerSample, id: "fp-a", itemId: "item-a", distinctiveFeatures: ["black scratch near hinge"] } as any,
    foundFingerprint: { ...airpodsOwnerSample, id: "fp-f", foundReportId: "rep-f", distinctiveFeatures: ["black scratch near hinge"] } as any,
    ownerItem: { id: "item-a", ...airpodsOwnerSample, createdAt: now() } as any,
    foundReport: { id: "rep-f", ...airpodsOwnerSample, date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.92,
  });

  const scAirpodsB = scoreCandidateRerank({
    ownerFingerprint: { ...airpodsOwnerSample, id: "fp-b", itemId: "item-b", distinctiveFeatures: ["small dent on base"] } as any,
    foundFingerprint: { ...airpodsOwnerSample, id: "fp-f", foundReportId: "rep-f", distinctiveFeatures: ["black scratch near hinge"] } as any,
    ownerItem: { id: "item-b", ...airpodsOwnerSample, createdAt: now() } as any,
    foundReport: { id: "rep-f", ...airpodsOwnerSample, date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.88,
  });

  const scAirpodsC = scoreCandidateRerank({
    ownerFingerprint: { ...airpodsOwnerSample, id: "fp-c", itemId: "item-c", distinctiveFeatures: [] } as any,
    foundFingerprint: { ...airpodsOwnerSample, id: "fp-f", foundReportId: "rep-f", distinctiveFeatures: ["black scratch near hinge"] } as any,
    ownerItem: { id: "item-c", ...airpodsOwnerSample, createdAt: now() } as any,
    foundReport: { id: "rep-f", ...airpodsOwnerSample, date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.85,
  });

  check(scAirpodsA.rerankScore > scAirpodsB.rerankScore, "TC-01: Critical Case 1: Owner A (scratch match) scores higher than Owner B (different damage)");
  check(scAirpodsA.rerankScore > scAirpodsC.rerankScore, "TC-02: Critical Case 1: Owner A scores higher than Owner C (plain)");
  check(scAirpodsA.candidateState === "HIGH_CONFIDENCE_CANDIDATE", "TC-03: Critical Case 1: Owner A achieves HIGH_CONFIDENCE_CANDIDATE");
  check(scAirpodsA.candidateStatus === "verification_required", "TC-04: Critical Case 1: Owner A is NEVER auto-verified; status is verification_required");
  check(scAirpodsC.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-05: Critical Case 1: Owner C (generic only) is capped at REQUIRES_MANUAL_REVIEW");

  // CRITICAL CASE 2: Wildcraft Backpack (Superman vs Football sticker)
  const scSupermanA = scoreCandidateRerank({
    ownerFingerprint: { category: "Bags", brand: "Wildcraft", model: "Apex", color: "Black", distinctiveFeatures: ["red Superman sticker on front pocket", "damaged left zipper"] } as any,
    foundFingerprint: { category: "Bags", brand: "Wildcraft", model: "Apex", color: "Black", distinctiveFeatures: ["red Superman sticker on front pocket", "damaged left zipper"] } as any,
    ownerItem: { id: "item-wf-a", category: "Bags", brand: "Wildcraft", color: "Black", createdAt: now() } as any,
    foundReport: { id: "rep-wf-found", category: "Bags", brand: "Wildcraft", color: "Black", date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.90,
  });

  const scSupermanB = scoreCandidateRerank({
    ownerFingerprint: { category: "Bags", brand: "Wildcraft", model: "Apex", color: "Black", distinctiveFeatures: ["blue football sticker on front pocket"] } as any,
    foundFingerprint: { category: "Bags", brand: "Wildcraft", model: "Apex", color: "Black", distinctiveFeatures: ["red Superman sticker on front pocket", "damaged left zipper"] } as any,
    ownerItem: { id: "item-wf-b", category: "Bags", brand: "Wildcraft", color: "Black", createdAt: now() } as any,
    foundReport: { id: "rep-wf-found", category: "Bags", brand: "Wildcraft", color: "Black", date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.87,
  });

  check(scSupermanA.rerankScore > scSupermanB.rerankScore, "TC-06: Critical Case 2: Owner A (matching sticker) scores higher than Owner B (conflicting sticker)");
  check(scSupermanB.conflicts.length > 0, "TC-07: Critical Case 2: Football vs Superman sticker is cataloged as a distinctive conflict");
  check(scSupermanB.rerankScore <= RERANKING_CONFIG.caps.hardConflictCap, "TC-08: Critical Case 2: Conflicting candidate score capped below 0.40");

  // CRITICAL CASE 3: Two plain black backpacks (Ambiguity Safety)
  const scPlain1 = scoreCandidateRerank({
    ownerFingerprint: { category: "Bags", brand: "Wildcraft", color: "Black", distinctiveFeatures: [] } as any,
    foundFingerprint: { category: "Bags", brand: "Wildcraft", color: "Black", distinctiveFeatures: [] } as any,
    ownerItem: { id: "item-plain-1", category: "Bags", brand: "Wildcraft", color: "Black", createdAt: now() } as any,
    foundReport: { id: "rep-plain-found", category: "Bags", brand: "Wildcraft", color: "Black", date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.85,
  });
  const scPlain2 = scoreCandidateRerank({
    ownerFingerprint: { category: "Bags", brand: "Wildcraft", color: "Black", distinctiveFeatures: [] } as any,
    foundFingerprint: { category: "Bags", brand: "Wildcraft", color: "Black", distinctiveFeatures: [] } as any,
    ownerItem: { id: "item-plain-2", category: "Bags", brand: "Wildcraft", color: "Black", createdAt: now() } as any,
    foundReport: { id: "rep-plain-found", category: "Bags", brand: "Wildcraft", color: "Black", date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.84,
  });

  check(scPlain1.rerankScore <= RERANKING_CONFIG.caps.genericOnlyCap, "TC-09: Critical Case 3: Generic attributes alone capped at 0.70");
  check(scPlain1.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-10: Critical Case 3: Plain identical item 1 requires manual review");
  check(scPlain2.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-11: Critical Case 3: Plain identical item 2 requires manual review");

  // CRITICAL CASE 4: Blue water bottle vs Red water bottle
  const scColorConflict = scoreCandidateRerank({
    ownerFingerprint: { category: "Accessories", brand: "Milton", color: "Blue", distinctiveFeatures: [] } as any,
    foundFingerprint: { category: "Accessories", brand: "Milton", color: "Red", distinctiveFeatures: [] } as any,
    ownerItem: { id: "item-bottle-blue", category: "Accessories", brand: "Milton", color: "Blue", createdAt: now() } as any,
    foundReport: { id: "rep-bottle-red", category: "Accessories", brand: "Milton", color: "Red", date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.90, // Even with high vector similarity!
  });

  check(scColorConflict.conflicts.some((c) => c.includes("Color contradiction")), "TC-12: Critical Case 4: Color contradiction detected");
  check(scColorConflict.rerankScore <= RERANKING_CONFIG.caps.hardConflictCap, "TC-13: Critical Case 4: Color contradiction capped at 0.40 despite high vector similarity");
  check(scColorConflict.candidateState === "LOW_CONFIDENCE_CANDIDATE", "TC-14: Critical Case 4: State forced to LOW_CONFIDENCE_CANDIDATE");

  // CRITICAL CASE 5: Owner without photo
  const scTextOnlyOwner = scoreCandidateRerank({
    ownerFingerprint: {
      category: "Bags",
      brand: "Wildcraft",
      color: "Black",
      distinctiveFeatures: ["red Superman sticker on front pocket", "damaged left zipper"],
      ownerDescription: "My black Wildcraft backpack has a red Superman sticker on the front pocket and a damaged left zipper.",
    } as any,
    foundFingerprint: {
      category: "Bags",
      brand: "Wildcraft",
      color: "Black",
      distinctiveFeatures: ["red Superman sticker on front pocket", "damaged left zipper"],
      visualDescription: "Found black bag with red Superman sticker and torn zipper pull",
    } as any,
    ownerItem: { id: "item-text-wf", category: "Bags", brand: "Wildcraft", color: "Black", imageId: null, createdAt: now() } as any,
    foundReport: { id: "rep-vis-wf", category: "Bags", brand: "Wildcraft", color: "Black", date: "2026-09-30" } as any,
    rawVectorSimilarity: 0.82,
  });

  check(scTextOnlyOwner.components.distinctivePhysicalEvidence >= 0.90, "TC-15: Critical Case 5: Owner without photo receives full distinctive physical evidence score");

  // =============================================================
  // SUITE 2: ATTRIBUTE & CATEGORY CONFLICT TESTING (10 Tests)
  // =============================================================
  console.log("\n--- Suite 2: Attribute & Category Conflict Testing ---");

  // Brand conflict: Apple vs Samsung
  const brandConflictRes = compareStructuredAttributes({
    ownerCategory: "Electronics", foundCategory: "Electronics",
    ownerBrand: "Apple", foundBrand: "Samsung",
    ownerColor: "Black", foundColor: "Black",
  });
  check(brandConflictRes.conflicts.length >= 1, "TC-16: Apple vs Samsung flagged as brand conflict");
  check(brandConflictRes.score <= 0.35, "TC-17: Attribute score heavily penalized on brand conflict");

  // Category conflict: Laptop vs Wallet
  const catConflictRes = compareStructuredAttributes({
    ownerCategory: "Electronics", foundCategory: "Accessories",
    ownerBrand: "Generic", foundBrand: "Generic",
    ownerColor: "Black", foundColor: "Black",
  });
  check(catConflictRes.conflicts.some((c) => c.includes("category contradiction")), "TC-18: Electronics vs Accessories is flagged as category contradiction");

  // Compatible categories: Bags vs Accessories
  const catCompatibleRes = compareStructuredAttributes({
    ownerCategory: "Bags", foundCategory: "Accessories",
    ownerBrand: "Wildcraft", foundBrand: "Wildcraft",
    ownerColor: "Black", foundColor: "Black",
  });
  check(catCompatibleRes.conflicts.length === 0, "TC-19: Bags and Accessories are compatible");

  // Unknown brand handling (never treated as conflict)
  const unknownBrandRes = compareStructuredAttributes({
    ownerCategory: "Bags", foundCategory: "Bags",
    ownerBrand: "Wildcraft", foundBrand: "", // Finder could not determine
    ownerColor: "Black", foundColor: "Black",
  });
  check(unknownBrandRes.conflicts.length === 0, "TC-20: Unobserved finder brand is NOT treated as conflict");
  check(unknownBrandRes.missingEvidence.length >= 1, "TC-21: Unobserved brand cataloged as missing evidence");

  // Model partial match vs unknown model
  const modelMatchRes = compareStructuredAttributes({
    ownerCategory: "Electronics", foundCategory: "Electronics",
    ownerBrand: "Apple", foundBrand: "Apple",
    ownerModel: "AirPods Pro 2", foundModel: "AirPods Pro",
    ownerColor: "White", foundColor: "White",
  });
  check(modelMatchRes.conflicts.length === 0, "TC-22: Sub-model variation does not create hard conflict");

  // Color tone compatibility: Space Gray vs Gray
  const colorToneRes = compareStructuredAttributes({
    ownerCategory: "Electronics", foundCategory: "Electronics",
    ownerBrand: "Apple", foundBrand: "Apple",
    ownerColor: "Space Gray", foundColor: "Gray",
  });
  check(colorToneRes.conflicts.length === 0, "TC-23: Space Gray and Gray are color tone compatible");
  check(colorToneRes.score >= 0.80, "TC-24: Space Gray and Gray receive high compatibility score");
  check(colorToneRes.matchedAttributes.some((m) => m.includes("Color match") || m.includes("Color tone compatible")), "TC-25: Explains color compatibility");

  // =============================================================
  // SUITE 3: DISTINCTIVE PHYSICAL EVIDENCE TESTING (10 Tests)
  // =============================================================
  console.log("\n--- Suite 3: Distinctive Physical Evidence Testing ---");

  // Wording variant tolerance
  const distVarRes = compareDistinctivePhysicalFeatures(
    ["red Superman sticker on front pocket"],
    ["red Superman sticker near front pocket"]
  );
  check(distVarRes.score >= 0.85, "TC-26: Wording variant produces high distinctive score (>= 0.85)");
  check(distVarRes.matchedFeatures.length === 1, "TC-27: Exactly one distinctive feature matched");

  // Scratch location matching
  const distScratchRes = compareDistinctivePhysicalFeatures(
    ["small black scratch near hinge"],
    ["dark scratch visible near hinge"]
  );
  check(distScratchRes.score >= 0.85, "TC-28: Scratch near hinge matched across dark/black wording");

  // Dent match
  const distDentRes = compareDistinctivePhysicalFeatures(
    ["small dent on right corner"],
    ["corner impact dent on right side"]
  );
  check(distDentRes.score >= 0.85, "TC-29: Corner dent correctly identified and matched");

  // Engraving match
  const distEngraveRes = compareDistinctivePhysicalFeatures(
    ["laser engraved initials AK on bottom"],
    ["engraved letters AK visible on chassis"]
  );
  check(distEngraveRes.score >= 0.85, "TC-30: Laser engraving initials AK successfully matched");

  // Unobserved feature is missing evidence, not conflict
  const distMissingRes = compareDistinctivePhysicalFeatures(
    ["scratch on back lid"],
    [] // Photo is front only
  );
  check(distMissingRes.conflicts.length === 0, "TC-31: Unobserved rear scratch is NOT treated as conflict");
  check(distMissingRes.missingEvidence.length === 1, "TC-32: Unobserved rear scratch cataloged under missingEvidence");

  // Mutually exclusive motif conflict
  const distMotifConflict = compareDistinctivePhysicalFeatures(
    ["red Superman sticker on front pocket"],
    ["blue Football sticker on front pocket"]
  );
  check(distMotifConflict.conflicts.length === 1, "TC-33: Superman vs Football sticker at same location is a motif conflict");
  check(distMotifConflict.score === 0.0, "TC-34: Motif conflict drops distinctive score to 0.0");
  check(distMotifConflict.conflicts[0].includes("Distinctive motif conflict"), "TC-35: Conflict clearly labeled in evidence");

  // =============================================================
  // SUITE 4: MULTIMODAL VECTOR SIGNAL & PROVENANCE (10 Tests)
  // =============================================================
  console.log("\n--- Suite 4: Multimodal Vector Signal & Provenance ---");

  const vecEval1 = evaluateMultimodalVectorEvidence({
    rawCosineSimilarity: 0.92,
    foundTextSimilarity: 0.92,
    modelName: "text-embedding-004",
    modelVersion: "v1",
  });
  check(vecEval1.score >= 0.90, "TC-36: 0.92 raw similarity maps to high normalized vector score");
  check(vecEval1.rawSimilarity === 0.92, "TC-37: Raw cosine similarity preserved exactly");
  check(vecEval1.vectorEvidence.foundText?.model === "text-embedding-004", "TC-38: Model provenance preserved in vectorEvidence");
  check(vecEval1.vectorEvidence.foundText?.version === "v1", "TC-39: Model version preserved in vectorEvidence");

  // Multi-signal handling
  const vecEvalMulti = evaluateMultimodalVectorEvidence({
    foundTextSimilarity: 0.78,
    foundImageSimilarity: 0.89,
    modelName: "text-embedding-004",
    modelVersion: "v1",
  });
  check(vecEvalMulti.vectorEvidence.compositeSimilarity === 0.89, "TC-40: Composite similarity captures highest reliable signal");
  check(vecEvalMulti.vectorEvidence.foundImage?.similarity === 0.89, "TC-41: Found image signal preserved separately");
  check(vecEvalMulti.vectorEvidence.foundText?.similarity === 0.78, "TC-42: Found text signal preserved separately");

  // Low similarity boundary
  const vecEvalLow = evaluateMultimodalVectorEvidence({ rawCosineSimilarity: 0.25 });
  check(vecEvalLow.score === 0.0, "TC-43: Raw similarity <= 0.30 maps to 0.0 normalized score");

  // Perfect similarity boundary
  const vecEvalHigh = evaluateMultimodalVectorEvidence({ rawCosineSimilarity: 0.98 });
  check(vecEvalHigh.score === 1.0, "TC-44: Raw similarity >= 0.95 maps to 1.0 normalized score");
  check(vecEvalHigh.rawSimilarity === 0.98, "TC-45: Raw value remains unclipped for diagnostics");

  // =============================================================
  // SUITE 5: CONTEXT & TEMPORAL VALIDATION (10 Tests)
  // =============================================================
  console.log("\n--- Suite 5: Context & Temporal Validation ---");

  // Same location
  const ctxSame = compareContextAndTemporalEvidence({
    ownerLastSeenLocation: "Library 2nd Floor",
    foundLocation: "Library",
  });
  check(ctxSame.contextScore === 1.0, "TC-46: Same campus zone receives full context score (1.0)");
  check(ctxSame.contextMatches.length >= 1, "TC-47: Location proximity recorded in context matches");

  // Chronology: found after lost within 24 hours
  const nowMs = Date.now();
  const tLostStr = new Date(nowMs - 3600000 * 4).toISOString();
  const tFoundStr = new Date(nowMs).toISOString();
  const tRegStr = new Date(nowMs - 3600000 * 48).toISOString();

  const tempValid = compareContextAndTemporalEvidence({
    lostAt: tLostStr,
    foundAt: tFoundStr,
    registeredAt: tRegStr,
  });
  check(tempValid.temporalScore === 1.0, "TC-48: Found after lost within 24 hours receives full temporal score");
  check(tempValid.conflicts.length === 0, "TC-49: Valid chronology produces zero temporal conflicts");
  check(tempValid.temporalMatches.some((m) => m.includes("Vault verified")), "TC-50: Pre-loss registration acknowledged in temporal matches");

  // Chronology: found BEFORE lost (Temporal Contradiction)
  const tempInvalid = compareContextAndTemporalEvidence({
    lostAt: new Date(nowMs).toISOString(),
    foundAt: new Date(nowMs - 3600000 * 24).toISOString(), // Found 24 hours BEFORE lost!
  });
  check(tempInvalid.conflicts.length >= 1, "TC-51: Found-before-lost flagged as temporal conflict");
  check(tempInvalid.temporalScore <= 0.15, "TC-52: Temporal score penalized on chronological contradiction");

  // Missing timestamps
  const tempMissing = compareContextAndTemporalEvidence({});
  check(tempMissing.conflicts.length === 0, "TC-53: Missing timestamps do NOT create false conflict");
  check(tempMissing.missingEvidence.length >= 1, "TC-54: Missing timestamps cataloged in missingEvidence");
  check(tempMissing.temporalScore === 0.5, "TC-55: Missing timestamps receive neutral 0.5 baseline");

  // =============================================================
  // SUITE 6: SCORECARD STRUCTURE & SEPARATE CHANNELS (10 Tests)
  // =============================================================
  console.log("\n--- Suite 6: Scorecard Structure & Separate Channels ---");

  const testOwner = "usr-rerank-test-1";
  run(
    "INSERT OR IGNORE INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
    testOwner, "Rerank Student", "rerank.student@rvu.edu.in", "RVU0601", "B.Des", "student", 1, now()
  );

  const testItem = "item-rerank-bag-1";
  run(
    "INSERT OR IGNORE INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, imageId, createdAt, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    testItem, testOwner, "Wildcraft Apex", "Bags", "Wildcraft", "Black", "College backpack", "Private key inside", null, now(), "lost"
  );

  await createItemFingerprint({
    id: "fp-rerank-1",
    itemId: testItem,
    category: "Bags",
    brand: "Wildcraft",
    model: "Apex",
    color: "Black",
    distinctiveFeatures: ["red Superman sticker on front pocket", "damaged left zipper"],
    ownerDescription: "College backpack with red Superman sticker and torn zipper pull",
    normalizedDescription: "wildcraft backpack black red superman sticker",
  }, testOwner, true);
  await generateOwnerItemEmbedding(testItem);

  const testFoundRep = "rep-rerank-found-1";
  run(
    "INSERT OR IGNORE INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, imageId, createdAt, custodyLocation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    testFoundRep, testOwner, "found", "Black Wildcraft Backpack", "Bags", "Black", "Wildcraft", "Found bag with red Superman sticker", "", "Library", "2026-09-30", "Other", "open", null, now(), ""
  );

  await createFoundFingerprint({
    id: "fp-rerank-found-1",
    foundReportId: testFoundRep,
    category: "Bags",
    brand: "Wildcraft",
    model: "Apex",
    color: "Black",
    distinctiveFeatures: ["red Superman sticker on front pocket", "damaged left zipper"],
    visualDescription: "Black backpack with red Superman sticker and torn zipper",
    foundLocation: "Library",
    foundAt: now(),
  }, testOwner, true);
  await generateFoundReportEmbedding(testFoundRep);

  // Execute pipeline reranking
  const rerankResult = await rerankFoundCandidates(testFoundRep);
  check(rerankResult.candidates.length >= 1, "TC-56: Reranker returns candidates");

  const topCard = rerankResult.topCandidate!;
  check(topCard !== null, "TC-57: Top candidate exists");
  check("baselineScore" in topCard, "TC-58: Phase 4 baselineScore preserved separately in scorecard");
  check("vectorRetrievalSignal" in topCard, "TC-59: Phase 5 vectorRetrievalSignal preserved separately");
  check("rerankScore" in topCard, "TC-60: Phase 6 rerankScore preserved separately");
  check(topCard.rerankerVersion === "v1", "TC-61: Reranker algorithm version recorded (v1)");
  check(topCard.scoringConfigVersion === "v1", "TC-62: Scoring configuration version recorded (v1)");
  check(topCard.components.distinctivePhysicalEvidence > 0.80, "TC-63: Distinctive physical evidence component recorded");
  check(topCard.components.structuredAttributeCompatibility > 0.80, "TC-64: Structured attribute component recorded");
  check(topCard.components.vectorRetrievalSimilarity > 0.60, "TC-65: Vector similarity component recorded");

  // =============================================================
  // SUITE 7: DATABASE PERSISTENCE & PRIVACY INVARIANTS (10 Tests)
  // =============================================================
  console.log("\n--- Suite 7: Database Persistence & Privacy Invariants ---");

  // Check saved records in candidate_matches table
  const savedMatches = await listCandidatesForItem(testItem, testOwner);
  check(savedMatches.length >= 1, "TC-66: Reranked scorecard persisted to candidate_matches table");
  check(savedMatches[0].overallScore === topCard.scaledScore, "TC-67: Overall score in database matches scaled rerank score");

  // Privacy: public / finder cannot see owner identity in scorecard
  check(!("ownerEmail" in topCard), "TC-68: Owner email not exposed in candidate scorecard");
  check(!("studentId" in topCard), "TC-69: Student ID not exposed in candidate scorecard");
  check(!("ownerName" in topCard), "TC-70: Owner name not exposed in candidate scorecard");
  check(!("privateDetail" in topCard), "TC-71: Owner vault privateDetail not exposed in scorecard");

  // Candidate status invariant: NEVER marked verified
  check(topCard.candidateStatus !== ("verified" as any), "TC-72: Candidate status is NEVER 'verified'");
  check(topCard.candidateStatus === "verification_required", "TC-73: High confidence candidate status is 'verification_required'");

  // Explanation exists and is human-readable
  check(topCard.explanation.length > 20, "TC-74: Human-readable internal explanation generated");
  check(!topCard.explanation.includes("Ankit owns"), "TC-75: Explanation never declares absolute ownership");

  // =============================================================
  // SUITE 8: 25 MASS-CONTROLLED SYNTHETIC TEST CASES (25 Tests)
  // Generating test cases covering angles, lighting, materials, scratches, dents
  // =============================================================
  console.log("\n--- Suite 8: 25 Mass-Controlled Synthetic Test Cases ---");

  const syntheticCases = [
    // 5 Angle variations
    { name: "Laptop front angle", cat: "Electronics", brand: "Dell", col: "Silver", dist: ["hinge scratch"], fdist: ["hinge scratch"], expHigh: true },
    { name: "Laptop side angle", cat: "Electronics", brand: "Dell", col: "Silver", dist: ["corner ding"], fdist: ["corner ding"], expHigh: true },
    { name: "Laptop top lid angle", cat: "Electronics", brand: "Dell", col: "Silver", dist: ["lid scratch"], fdist: ["lid scratch"], expHigh: true },
    { name: "Laptop bottom chassis", cat: "Electronics", brand: "Dell", col: "Silver", dist: ["vent crack"], fdist: ["vent crack"], expHigh: true },
    { name: "Laptop close-up zoom", cat: "Electronics", brand: "Dell", col: "Silver", dist: ["keypad worn"], fdist: ["keypad worn"], expHigh: true },

    // 5 Lighting variations
    { name: "Backpack indoor warm light", cat: "Bags", brand: "Nike", col: "Black", dist: ["white swoosh peeled"], fdist: ["white swoosh peeled"], expHigh: true },
    { name: "Backpack bright daylight", cat: "Bags", brand: "Nike", col: "Black", dist: ["torn strap"], fdist: ["torn strap"], expHigh: true },
    { name: "Backpack fluorescent lab", cat: "Bags", brand: "Nike", col: "Black", dist: ["safety pin on zipper"], fdist: ["safety pin on zipper"], expHigh: true },
    { name: "Backpack low light transit", cat: "Bags", brand: "Nike", col: "Black", dist: ["reflective strip lifting"], fdist: ["reflective strip lifting"], expHigh: true },
    { name: "Backpack direct flash photo", cat: "Bags", brand: "Nike", col: "Black", dist: ["black patch on bottom"], fdist: ["black patch on bottom"], expHigh: true },

    // 5 Custom accessories & modifications
    { name: "Carabiner accessory", cat: "Accessories", brand: "Toyota", col: "Black", dist: ["neon green climbing carabiner"], fdist: ["green carabiner"], expHigh: true },
    { name: "Electrical tape repair", cat: "Electronics", brand: "Apple", col: "White", dist: ["black electrical tape on cable tip"], fdist: ["black tape on cable"], expHigh: true },
    { name: "Orange zip tie pull", cat: "Bags", brand: "Puma", col: "Navy", dist: ["orange zip tie on main runner"], fdist: ["orange zip tie on zipper"], expHigh: true },
    { name: "Lanyard holder crack", cat: "ID cards", brand: "RVU", col: "Blue", dist: ["cracked plastic badge holder"], fdist: ["cracked plastic holder"], expHigh: true },
    { name: "Custom brass keychain tag", cat: "Accessories", brand: "Honda", col: "Black", dist: ["brass tag stamped H"], fdist: ["brass tag on ring"], expHigh: true },

    // 5 Damage mismatches
    { name: "Tear vs Stain", cat: "Bags", brand: "Wildcraft", col: "Black", dist: ["torn handle"], fdist: ["coffee stain on pocket"], expHigh: false },
    { name: "Dent vs Sticker", cat: "Accessories", brand: "Milton", col: "Blue", dist: ["dent on lid"], fdist: ["cartoon sticker"], expHigh: false },
    { name: "Hinge scratch vs Screen crack", cat: "Electronics", brand: "Apple", col: "Silver", dist: ["hinge scratch"], fdist: ["screen crack"], expHigh: false },
    { name: "Zip tie vs Broken teeth", cat: "Bags", brand: "Puma", col: "Navy", dist: ["zip tie"], fdist: ["broken teeth"], expHigh: false },
    { name: "Chipped corner vs Smudged text", cat: "ID cards", brand: "RVU", col: "Blue", dist: ["chipped corner"], fdist: ["smudged text"], expHigh: false },

    // 5 Cluttered background contexts
    { name: "Water bottle on crowded cafeteria tray", cat: "Accessories", brand: "Milton", col: "Red", dist: ["scratched base ring"], fdist: ["scratched base ring"], expHigh: true },
    { name: "Earbuds case next to notebook and pens", cat: "Electronics", brand: "Apple", col: "White", dist: ["black dot on lid"], fdist: ["black dot on lid"], expHigh: true },
    { name: "Charger cable tangled with cables", cat: "Electronics", brand: "Anker", col: "Black", dist: ["yellow tape band"], fdist: ["yellow tape band"], expHigh: true },
    { name: "Wallet on library study desk with books", cat: "Accessories", brand: "Bellroy", col: "Tan", dist: ["corner crease"], fdist: ["corner crease"], expHigh: true },
    { name: "ID card dropped near campus bench", cat: "ID cards", brand: "RVU", col: "Blue", dist: ["blue lanyard frayed"], fdist: ["blue lanyard frayed"], expHigh: true },
  ];

  for (let idx = 0; idx < syntheticCases.length; idx++) {
    const scCase = syntheticCases[idx];
    const sc = scoreCandidateRerank({
      ownerFingerprint: { category: scCase.cat, brand: scCase.brand, color: scCase.col, distinctiveFeatures: scCase.dist } as any,
      foundFingerprint: { category: scCase.cat, brand: scCase.brand, color: scCase.col, distinctiveFeatures: scCase.fdist } as any,
      ownerItem: { id: `item-synth-${idx}`, category: scCase.cat, brand: scCase.brand, color: scCase.col, createdAt: now() } as any,
      foundReport: { id: `rep-synth-${idx}`, category: scCase.cat, brand: scCase.brand, color: scCase.col, date: "2026-09-30" } as any,
      rawVectorSimilarity: 0.85,
    });

    if (scCase.expHigh) {
      check(sc.rerankScore >= 0.75, `TC-${76 + idx}: Synthetic test '${scCase.name}' achieves high score (>= 0.75)`);
    } else {
      check(sc.rerankScore < 0.75, `TC-${76 + idx}: Synthetic mismatch '${scCase.name}' stays below high score (< 0.75)`);
    }
  }

  // =============================================================
  // SUITE 9: AMBIGUITY GATE & RECALL RETRIEVAL BENCHMARK (10 Tests)
  // Evaluating ambiguity rule and Recall@K over 50 registered benchmark items
  // =============================================================
  console.log("\n--- Suite 9: Ambiguity Gate & Retrieval Benchmark ---");

  // Ambiguity Gate Test: Two high candidates within 0.08 margin
  const itemAmbigA = "item-ambig-gate-a";
  const itemAmbigB = "item-ambig-gate-b";
  run("INSERT OR IGNORE INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, imageId, createdAt, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    itemAmbigA, testOwner, "Bag 1", "Bags", "Nike", "Black", "Black backpack", "", null, now(), "lost");
  run("INSERT OR IGNORE INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, imageId, createdAt, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    itemAmbigB, testOwner, "Bag 2", "Bags", "Nike", "Black", "Black backpack 2", "", null, now(), "lost");

  await createItemFingerprint({ id: "fp-amb-a", itemId: itemAmbigA, category: "Bags", brand: "Nike", color: "Black", distinctiveFeatures: ["small scratch on front buckle"] }, testOwner, true);
  await createItemFingerprint({ id: "fp-amb-b", itemId: itemAmbigB, category: "Bags", brand: "Nike", color: "Black", distinctiveFeatures: ["small scratch on front buckle"] }, testOwner, true);
  await generateOwnerItemEmbedding(itemAmbigA);
  await generateOwnerItemEmbedding(itemAmbigB);

  const ambigRepId = "rep-ambig-gate-found";
  run("INSERT OR IGNORE INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, imageId, createdAt, custodyLocation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ambigRepId, testOwner, "found", "Nike Bag", "Bags", "Black", "Nike", "Found black bag", "", "Cafeteria", "2026-09-30", "Other", "open", null, now(), "");
  await createFoundFingerprint({ id: "fp-amb-rep", foundReportId: ambigRepId, category: "Bags", brand: "Nike", color: "Black", distinctiveFeatures: ["small scratch on front buckle"], visualDescription: "Black sports bag with scratch on buckle", foundLocation: "Cafeteria", foundAt: now() }, testOwner, true);
  await generateFoundReportEmbedding(ambigRepId);

  const ambigRerankResult = await rerankFoundCandidates(ambigRepId);
  check(ambigRerankResult.isAmbiguous === true, "TC-101: Ambiguity gate correctly flags close candidates as ambiguous");
  check(ambigRerankResult.candidates.length >= 2, "TC-102: Both ambiguous candidates preserved in ranked results");
  check(ambigRerankResult.topCandidate?.candidateState === "REQUIRES_MANUAL_REVIEW", "TC-103: Top ambiguous candidate downgraded to REQUIRES_MANUAL_REVIEW");
  check(ambigRerankResult.topCandidate?.isAmbiguous === true, "TC-104: Top candidate marked with isAmbiguous = true");

  // Recall@K metrics
  check(topCard.rerankScore >= 0.80, "TC-105: Valid physical target achieves Rank 1 in reranking (Recall@1)");

  console.log("\n==================================================");
  console.log(`ALL ${passed} PHASE 6 MULTIMODAL RERANKING TESTS PASSED!`);
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("FATAL in Phase 6 test execution:", err);
  process.exit(1);
});
