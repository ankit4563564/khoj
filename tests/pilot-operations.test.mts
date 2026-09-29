/**
 * KHOJ — Phase 11: Real RVU Controlled Pilot Operations Test Suite
 * Tests ground truth recording, incident triage, AI outage fallback,
 * and user feedback protocols.
 */

import { run, one, all } from "../src/lib/rvu/db.ts";
import {
  recordPilotGroundTruth,
  getPilotGroundTruthByReportId,
  listPilotGroundTruth,
  recordPilotIncident,
  resolvePilotIncident,
  listPilotIncidents,
  computeRealPilotMetrics,
  generateSimulatedVsRealComparison,
} from "../src/lib/rvu/pilot/pilotService.ts";
import { manualFallbackFilter } from "../src/lib/rvu/observability/adminOpsService.ts";
import { submitRecoveryFeedback, listFeedbackSummary } from "../src/lib/rvu/observability/feedbackService.ts";

function now(): string {
  return new Date().toISOString();
}

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

async function runPilotOperationsTests() {
  console.log("\n==================================================");
  console.log("Starting KHOJ Phase 11: Pilot Operations Test Suite");
  console.log("==================================================");

  const ts = now();
  const testStudent = "usr-p-t-student";
  const testStaff = "usr-p-t-staff";
  const testReport = "rep-p-t-001";
  const testItem = "item-p-t-001";

  // Seed baseline test records
  run("INSERT OR REPLACE INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?, ?, ?, ?, ?, 'student', 1, ?)",
    testStudent, "Test Pilot Student", "pilot.student@rvu.edu.in", "RVUPILOT01", "BTech", ts);
  run("INSERT OR REPLACE INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?, ?, ?, ?, ?, 'staff', 1, ?)",
    testStaff, "Test Pilot Staff", "pilot.staff@rvu.edu.in", "RVUSTAFF01", "Welfare", ts);

  run("INSERT OR REPLACE INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, createdAt) VALUES (?, ?, 'found', 'Pilot Found Test Item', 'Electronics', 'White', 'Apple', 'AirPods test', 'hinge scratch', 'Library', '2026-10-01', 'BTech', 'returned', ?)",
    testReport, testStaff, ts);
  run("INSERT OR REPLACE INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, status, createdAt) VALUES (?, ?, 'Pilot Protected Item', 'Electronics', 'Apple', 'White', 'AirPods test', 'hinge scratch', 'safe', ?)",
    testItem, testStudent, ts);
  run("INSERT OR REPLACE INTO handovers (reportId, ownerId, finderId, point, state, returnedAt, createdAt) VALUES (?, ?, ?, 'Library Help Desk', 'RETURNED', ?, ?)",
    testReport, testStudent, testStaff, ts, ts);

  // ----------------------------------------------------
  // SUITE 1: GROUND TRUTH RECORDING & INDEPENDENCE
  // ----------------------------------------------------
  console.log("\n--- Suite 1: Ground Truth Recording & Independence ---");

  const gt = await recordPilotGroundTruth({
    reportId: testReport,
    trueOwnerId: testStudent,
    trueItemId: testItem,
    hasRealMatch: true,
    candidateRank: 1,
    verificationResult: "passed",
    handoverResult: "completed",
    returnedResult: "RETURNED",
    caseClassification: "RETURNED",
    failureStage: "NONE",
    notes: "Verified independently with physical clue.",
  });

  check(gt.reportId === testReport, "TC-01: Ground truth record created with matching report ID");
  check(gt.hasRealMatch === true, "TC-02: Ground truth captures true real-world match existence");
  check(gt.returnedResult === "RETURNED", "TC-03: Final recovery result recorded as RETURNED");

  const retrievedGt = await getPilotGroundTruthByReportId(testReport);
  check(retrievedGt !== null && retrievedGt.trueItemId === testItem, "TC-04: Ground truth successfully retrieved from database");

  const allGt = await listPilotGroundTruth();
  check(allGt.length >= 1, "TC-05: Ground truth listing retrieves recorded cases");

  // ----------------------------------------------------
  // SUITE 2: INCIDENT MANAGEMENT & TRIAGE
  // ----------------------------------------------------
  console.log("\n--- Suite 2: Incident Management & Triage ---");

  const incident = await recordPilotIncident({
    reportId: testReport,
    incidentType: "disputed_ownership",
    severity: "medium",
    reportedBy: testStaff,
    details: "Student claimed item was theirs but could not identify the sticker color.",
  });

  check(incident.incidentType === "disputed_ownership", "TC-06: Incident ticket created with valid type");
  check(incident.status === "open", "TC-07: Fresh incident ticket starts in 'open' status");

  const resolved = await resolvePilotIncident(
    incident.id,
    testStaff,
    "Student checked and confirmed they lost their bag in a different building. Dismissed amicably."
  );

  check(resolved.status === "resolved", "TC-08: Authorized staff successfully resolves incident");
  check(resolved.resolvedBy === testStaff, "TC-09: Incident resolution records resolving staff user ID");

  const incidentsList = await listPilotIncidents();
  check(incidentsList.some((i) => i.id === incident.id), "TC-10: Incident list contains recorded incident");

  // ----------------------------------------------------
  // SUITE 3: AI OUTAGE MANUAL FALLBACK & RESILIENCE
  // ----------------------------------------------------
  console.log("\n--- Suite 3: AI Outage Manual Fallback & Resilience ---");

  // When AI or embedding APIs are completely offline, staff must still be able to search by structured attributes
  const categoryResults = await manualFallbackFilter({ category: "Electronics" });
  check(categoryResults.length >= 1, "TC-11: Manual fallback filters by category during AI outage");

  const brandResults = await manualFallbackFilter({ brand: "Apple" });
  check(brandResults.length >= 1, "TC-12: Manual fallback filters by brand during AI outage");

  const locationResults = await manualFallbackFilter({ location: "Library" });
  check(locationResults.length >= 1, "TC-13: Manual fallback filters by campus location during AI outage");

  // ----------------------------------------------------
  // SUITE 4: REAL USABILITY FEEDBACK & PRIVACY
  // ----------------------------------------------------
  console.log("\n--- Suite 4: Real Usability Feedback & Privacy ---");

  const ownerFb = await submitRecoveryFeedback(
    testReport,
    testStudent,
    "owner",
    "yes",
    "Handover at library help desk was very easy."
  );

  check(ownerFb.easyRating === "yes", "TC-14: Owner feedback submitted successfully");
  check(ownerFb.confusionNote.includes("library"), "TC-15: Usability feedback preserves constructive comments");

  const fbSummary = await listFeedbackSummary();
  check(fbSummary.totalFeedback >= 1, "TC-16: Feedback summary computes feedback totals");
  check(typeof fbSummary.easyYesPct === "number", "TC-17: Feedback summary calculates satisfaction percentage");

  // ----------------------------------------------------
  // SUITE 5: REAL METRICS ENGINE & COMPARISON TABLE
  // ----------------------------------------------------
  console.log("\n--- Suite 5: Real Metrics Engine & Comparison Table ---");

  const realMetrics = await computeRealPilotMetrics({
    totalParticipants: 50,
    totalItemsRegistered: 180,
    totalLostReports: 40,
  });

  check(realMetrics.totalParticipants === 50, "TC-18: Total participants matches 50 real students");
  check(realMetrics.totalItemsRegistered === 180, "TC-19: Total belongings count matches 180 items");
  check(typeof realMetrics.successfulRecoveryRate === "number", "TC-20: Successful recovery rate calculated");
  check(realMetrics.falsePositiveRate === 0, "TC-21: False positive candidate rate is strictly 0%");

  const comparisonRows = generateSimulatedVsRealComparison(realMetrics);
  check(comparisonRows.length >= 8, "TC-22: Comparison table contains all 8 required evaluation metrics");
  check(comparisonRows.some((r) => r.metric === "Recall@5"), "TC-23: Comparison table includes Recall@5");
  check(comparisonRows.some((r) => r.metric === "Successful Recovery Rate"), "TC-24: Comparison table includes Successful Recovery Rate");

  console.log("\n==================================================");
  console.log(`ALL ${passed} PHASE 11 PILOT OPERATIONS TESTS PASSED!`);
  console.log("==================================================\n");
}

runPilotOperationsTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
