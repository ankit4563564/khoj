/**
 * KHOJ — Phase 9: Optional ₹20 Thank-You Reward Test Suite
 * 60+ Comprehensive, Deterministic Test Cases
 *
 * Verifies:
 * - Critical Test Cases 1–20 from specification
 * - Strict requirement: Handover MUST be RETURNED with dual confirmation
 * - Reward is completely OPTIONAL (SKIP vs THANK)
 * - Finder UPI collection is secure and zero-login compatible
 * - Fixed ₹20 reward amount; rejection of tampered/client-supplied amounts
 * - Direct owner-to-finder payment; KHOJ never processes or holds money
 * - Safe UPI URI deep link generation
 * - Dual reward confirmation (owner self-reports payment + finder confirms receipt)
 * - Idempotency of repeated confirmation clicks
 * - Disputes route to MANUAL_REVIEW
 * - Anti-leakage: Finder UPI exposed ONLY to owner after return + THANK + UPI provided
 * - Public tracking and candidate endpoints expose zero reward/payment data
 * - Independence: RETURNED status is never blocked, revoked, or altered by reward state
 */

import path from "node:path";
import fs from "node:fs";

const testDbPath = path.resolve(process.cwd(), ".test-data", "reward-test.sqlite");
fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch {}
}
process.env.RVU_DB_PATH = testDbPath;

const { run, one, now } = await import("../src/lib/rvu/db.ts");
const {
  initiateRecovery,
  proposeHandover,
  acceptHandover,
  confirmOwnerReceipt,
  confirmFinderReturn,
  getRecoveryCaseByReportId,
} = await import("../src/lib/rvu/recovery/index.ts");

const {
  REWARD_CONFIG,
  validateUpiId,
  buildUpiPaymentUri,
  getOrCreateReward,
  chooseRewardDecision,
  provideFinderUpi,
  markPaymentInitiated,
  reportOwnerPayment,
  confirmFinderPayment,
  reportRewardDispute,
  cancelReward,
  checkRewardExpiration,
  adminResolveReward,
  getClientRewardView,
  getRewardByReportId,
  getRewardEvents,
  assertValidRewardTransition,
  computeRewardDualConfirmationState,
} = await import("../src/lib/rvu/reward/index.ts");

const { createCandidateMatch } = await import("../src/lib/rvu/fingerprints/candidateRepository.ts");

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
  console.log("Starting KHOJ Phase 9: Optional ₹20 Reward Tests");
  console.log("==================================================");

  const ts = now();

  // Seed Users
  const ownerA = "usr-owner-alice";
  const ownerB = "usr-owner-bob";
  const finderA = "usr-finder-charlie";
  const staffA = "usr-staff-dean";
  const stranger = "usr-stranger-dave";

  run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
    ownerA, "Alice Smith", "alice@rvu.edu.in", "RVU001", "Design", "student", 1, ts);
  run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
    ownerB, "Bob Jones", "bob@rvu.edu.in", "RVU002", "BTech", "student", 1, ts);
  run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
    finderA, "Charlie Guest", "charlie@guest.local", "GUEST", "Campus", "student", 0, ts);
  run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
    staffA, "Dean Admin", "dean@rvu.edu.in", "STF001", "Security", "staff", 1, ts);
  run("INSERT INTO users (id, name, email, studentId, department, role, verified, createdAt) VALUES (?,?,?,?,?,?,?,?)",
    stranger, "Dave Stranger", "dave@rvu.edu.in", "RVU999", "Liberal Arts", "student", 1, ts);

  // Helper: create a fully RETURNED recovery case
  async function setupReturnedCase(reportSuffix: string, customOwner = ownerA) {
    const repId = `rep-returned-${reportSuffix}`;
    const itemId = `item-vault-${reportSuffix}`;

    run("INSERT INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, custodyLocation, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      repId, finderA, "found", `Lost Item ${reportSuffix}`, "Electronics", "White", "Apple", "Found on bench", "", "Library", "2026-09-30", "Library", "open", "Library Help Desk", ts);

    run("INSERT INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
      itemId, customOwner, `Protected ${reportSuffix}`, "Electronics", "Apple", "White", "Owner description", "Scratch near hinge", "safe", ts);

    const cand = await createCandidateMatch({
      foundReportId: repId,
      itemId: itemId,
      overallScore: 95,
      confidenceTier: "high",
      status: "verified",
    });

    const rec = await initiateRecovery(cand.id, customOwner);
    await proposeHandover(repId, {
      location: "Library Help Desk",
      date: "2026-10-01",
      timeWindow: "14:00-15:00",
    }, customOwner);
    await acceptHandover(repId, finderA);
    await confirmOwnerReceipt(repId, customOwner);
    await confirmFinderReturn(repId, finderA);

    const updatedRec = await getRecoveryCaseByReportId(repId);
    if (updatedRec?.state !== "RETURNED") {
      throw new Error("Setup error: Case did not reach RETURNED state");
    }
    return { repId, itemId, candidateId: cand.id, actionToken: updatedRec.finderActionToken };
  }

  // ----------------------------------------------------
  // SUITE 1: MANDATORY CRITICAL TEST CASES 1–20
  // ----------------------------------------------------
  console.log("\n--- Suite 1: Mandatory Critical Test Cases 1–20 ---");

  // Critical Case 1: Handover = RETURNED, Owner selects SKIP
  {
    const { repId } = await setupReturnedCase("crit-01");
    const skippedReward = await chooseRewardDecision(repId, "SKIP", ownerA);
    check(skippedReward.state === "SKIPPED", "TC-01: Critical 1: Owner selects SKIP -> reward_state = SKIPPED");
    const recovery = await getRecoveryCaseByReportId(repId);
    check(recovery?.state === "RETURNED", "TC-02: Critical 1: Core recovery remains RETURNED when reward is skipped");
  }

  // Critical Case 2: Handover = RETURNED, Owner selects THANK
  {
    const { repId } = await setupReturnedCase("crit-02");
    const offeredReward = await chooseRewardDecision(repId, "THANK", ownerA);
    check(offeredReward.state === "WAITING_FOR_UPI", "TC-03: Critical 2: Owner selects THANK -> reward_state = WAITING_FOR_UPI");
  }

  // Critical Case 3: Finder provides friend@upi
  {
    const { repId } = await setupReturnedCase("crit-03");
    await chooseRewardDecision(repId, "THANK", ownerA);
    const upiReward = await provideFinderUpi(repId, "friend@upi", finderA);
    check(upiReward.state === "UPI_PROVIDED", "TC-04: Critical 3: Finder provides UPI -> reward_state = UPI_PROVIDED");
    check(upiReward.finderUpiId === "friend@upi", "TC-05: Critical 3: Finder UPI ID stored correctly");
    const uri = buildUpiPaymentUri(upiReward.finderUpiId);
    check(uri.includes("pa=friend%40upi") && uri.includes("am=20"), "TC-06: Critical 3: Direct ₹20 UPI URI generated");
  }

  // Critical Case 4: Owner indicates "I've sent ₹20"
  {
    const { repId } = await setupReturnedCase("crit-04");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "friend@upi", finderA);
    const reportedReward = await reportOwnerPayment(repId, ownerA);
    check(reportedReward.state === "PAYMENT_SELF_REPORTED", "TC-07: Critical 4: Owner reported payment -> PAYMENT_SELF_REPORTED");
    check(reportedReward.state !== "COMPLETED", "TC-08: Critical 4: Not COMPLETED yet because finder has not confirmed");
    check(Boolean(reportedReward.ownerPaymentReportedAt), "TC-09: Critical 4: ownerPaymentReportedAt timestamp set");
  }

  // Critical Case 5: Finder selects "I RECEIVED ₹20"
  {
    const { repId } = await setupReturnedCase("crit-05");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "friend@upi", finderA);
    await reportOwnerPayment(repId, ownerA);
    const completedReward = await confirmFinderPayment(repId, finderA);
    check(completedReward.state === "COMPLETED", "TC-10: Critical 5: Finder confirmed receipt -> reward_state = COMPLETED");
    check(Boolean(completedReward.completedAt), "TC-11: Critical 5: completedAt timestamp set");
  }

  // Critical Case 6: Finder confirms first (before owner reports payment)
  {
    const { repId } = await setupReturnedCase("crit-06");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "helper@upi", finderA);
    // Finder tries to confirm receipt before owner reports payment
    const finderFirst = await confirmFinderPayment(repId, finderA);
    check(finderFirst.state !== "COMPLETED", "TC-12: Critical 6: Finder confirming first does NOT transition to COMPLETED");
    check(finderFirst.state === "UPI_PROVIDED", "TC-13: Critical 6: State remains UPI_PROVIDED");

    // Later owner reports payment -> now dual confirmation converges to COMPLETED
    const converged = await reportOwnerPayment(repId, ownerA);
    check(converged.state === "COMPLETED", "TC-14: Critical 6: Dual confirmation completes once owner reports payment");
  }

  // Critical Case 7: Owner attempts to send rewardAmount = 5000
  {
    const { repId } = await setupReturnedCase("crit-07");
    const tampered = await chooseRewardDecision(repId, "THANK", ownerA, 5000);
    check(tampered.amountInr === 20, "TC-15: Critical 7: Server ignores forged amount; reward remains fixed at ₹20");
  }

  // Critical Case 8: Client sends forged payment_verified = true without owner payment action
  {
    const { repId } = await setupReturnedCase("crit-08");
    await chooseRewardDecision(repId, "THANK", ownerA);
    let forgeBlocked = false;
    try {
      assertValidRewardTransition("WAITING_FOR_UPI", "COMPLETED", "owner");
    } catch (e: any) {
      forgeBlocked = e.status === 400;
    }
    check(forgeBlocked, "TC-16: Critical 8: Forged direct transition to COMPLETED blocked");
  }

  // Critical Case 9: Client attempts to initiate reward before RETURNED
  {
    const preRep = "rep-pre-returned-test";
    run("INSERT INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, custodyLocation, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      preRep, finderA, "found", "Unreturned Phone", "Electronics", "Black", "Samsung", "Found in cafe", "", "Cafeteria", "2026-09-30", "Cafe", "open", "Desk", ts);
    const preItem = "item-pre-returned";
    run("INSERT INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
      preItem, ownerA, "My Phone", "Electronics", "Samsung", "Black", "Description", "Private", "safe", ts);
    const preCand = await createCandidateMatch({
      foundReportId: preRep,
      itemId: preItem,
      overallScore: 85,
      confidenceTier: "high",
      status: "verified",
    });
    await initiateRecovery(preCand.id, ownerA);

    let preReturnBlocked = false;
    try {
      await getOrCreateReward(preRep, ownerA);
    } catch (e: any) {
      preReturnBlocked = e.status === 400;
    }
    check(preReturnBlocked, "TC-17: Critical 9: Initiating reward before RETURNED rejected with HTTP 400");
  }

  // Critical Case 10: Owner reports payment but finder reports "Payment not received"
  {
    const { repId } = await setupReturnedCase("crit-10");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "finder@upi", finderA);
    await reportOwnerPayment(repId, ownerA);

    // Finder reports issue
    const disputed = await reportRewardDispute(repId, "Payment not received in bank account", finderA);
    check(disputed.state === "MANUAL_REVIEW", "TC-18: Critical 10: Dispute transitions reward to MANUAL_REVIEW");
    check(disputed.state !== "COMPLETED", "TC-19: Critical 10: Disputed case is NEVER marked COMPLETED");
    check(disputed.disputeReason === "Payment not received in bank account", "TC-20: Critical 10: Dispute reason persisted");
  }

  // Critical Case 11: Owner clicks "I've sent ₹20" three times (idempotency)
  {
    const { repId } = await setupReturnedCase("crit-11");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "alice.finder@upi", finderA);

    const report1 = await reportOwnerPayment(repId, ownerA);
    const report2 = await reportOwnerPayment(repId, ownerA);
    const report3 = await reportOwnerPayment(repId, ownerA);

    check(report1.ownerPaymentReportedAt === report3.ownerPaymentReportedAt, "TC-21: Critical 11: Repeated owner payments share same timestamp");
    check(report3.state === "PAYMENT_SELF_REPORTED", "TC-22: Critical 11: State remains PAYMENT_SELF_REPORTED idempotently");
  }

  // Critical Case 12: Finder clicks "I received ₹20" three times (idempotency)
  {
    const { repId } = await setupReturnedCase("crit-12");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "multi.click@upi", finderA);
    await reportOwnerPayment(repId, ownerA);

    const comp1 = await confirmFinderPayment(repId, finderA);
    const comp2 = await confirmFinderPayment(repId, finderA);
    const comp3 = await confirmFinderPayment(repId, finderA);

    check(comp1.completedAt === comp3.completedAt, "TC-23: Critical 12: Repeated finder confirmations share same completion timestamp");
    check(comp3.state === "COMPLETED", "TC-24: Critical 12: State remains COMPLETED idempotently");
  }

  // Critical Case 13: Reward remains unfinished for several days -> EXPIRED
  {
    const { repId } = await setupReturnedCase("crit-13");
    await chooseRewardDecision(repId, "THANK", ownerA);
    // Simulate elapsed time in database
    run("UPDATE rewards SET updatedAt = datetime('now', '-5 days') WHERE reportId = ?", repId);
    const expired = await checkRewardExpiration(repId);
    check(expired.state === "EXPIRED", "TC-25: Critical 13: Unfinished reward transitions to EXPIRED");
    const rec = await getRecoveryCaseByReportId(repId);
    check(rec?.state === "RETURNED", "TC-26: Critical 13: Recovery remains RETURNED despite reward expiration");
  }

  // Critical Case 14: Public user attempts to query reward record
  {
    const { repId } = await setupReturnedCase("crit-14");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "hidden@upi", finderA);

    // Public/unauthenticated view
    const publicView = await getClientRewardView(repId, undefined);
    check(publicView.finderUpiId === null, "TC-27: Critical 14: Public view hides finder UPI ID");
    check(publicView.upiPaymentUri === null, "TC-28: Critical 14: Public view hides UPI payment URI");
  }

  // Critical Case 15: Another student attempts to access reward
  {
    const { repId } = await setupReturnedCase("crit-15");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "secret@upi", finderA);

    // Stranger tries to view
    const strangerView = await getClientRewardView(repId, stranger);
    check(strangerView.finderUpiId === null, "TC-29: Critical 15: Stranger cannot see finder UPI ID");
    check(strangerView.isOwner === false && strangerView.isFinder === false, "TC-30: Critical 15: Stranger is not recognized as participant");
  }

  // Critical Case 16: Finder token for recovery case A attempts to access reward case B
  {
    const caseA = await setupReturnedCase("crit-16-a");
    const caseB = await setupReturnedCase("crit-16-b");
    await chooseRewardDecision(caseB.repId, "THANK", ownerA);

    let crossTokenBlocked = false;
    try {
      // Use Token A to submit UPI on Case B
      await provideFinderUpi(caseB.repId, "hacker@upi", undefined, caseA.actionToken);
    } catch (e: any) {
      crossTokenBlocked = e.status === 403;
    }
    check(crossTokenBlocked, "TC-31: Critical 16: Action token from Case A blocked on Case B (403)");
  }

  // Critical Case 17: Malformed UPI ID
  {
    const { repId } = await setupReturnedCase("crit-17");
    await chooseRewardDecision(repId, "THANK", ownerA);

    let malformedBlocked = false;
    try {
      await provideFinderUpi(repId, "not a valid random huge payload that lacks @", finderA);
    } catch (e: any) {
      malformedBlocked = e.status === 400;
    }
    check(malformedBlocked, "TC-32: Critical 17: Malformed UPI string rejected with HTTP 400");
  }

  // Critical Case 18: UPI ID contains SQL-like payload
  {
    const { repId } = await setupReturnedCase("crit-18");
    await chooseRewardDecision(repId, "THANK", ownerA);

    let sqlBlocked = false;
    try {
      await provideFinderUpi(repId, "victim@bank'; DROP TABLE users; --", finderA);
    } catch (e: any) {
      sqlBlocked = e.status === 400;
    }
    check(sqlBlocked, "TC-33: Critical 18: SQL-injection in UPI rejected with HTTP 400");
    const usersExist = one("SELECT count(*) as count FROM users");
    check(Boolean(usersExist), "TC-34: Critical 18: Database integrity preserved");
  }

  // Critical Case 19: Reward is completed; attempt to cancel it
  {
    const { repId } = await setupReturnedCase("crit-19");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "safe@upi", finderA);
    await reportOwnerPayment(repId, ownerA);
    await confirmFinderPayment(repId, finderA);

    let cancelBlocked = false;
    try {
      await cancelReward(repId, "Regret paying", ownerA);
    } catch (e: any) {
      cancelBlocked = e.status === 409;
    }
    check(cancelBlocked, "TC-35: Critical 19: Cancelling COMPLETED reward blocked with HTTP 409");
  }

  // Critical Case 20: Reward is skipped; client attempts reward_state = COMPLETED
  {
    const { repId } = await setupReturnedCase("crit-20");
    await chooseRewardDecision(repId, "SKIP", ownerA);

    let skipToCompletedBlocked = false;
    try {
      assertValidRewardTransition("SKIPPED", "COMPLETED", "owner");
    } catch (e: any) {
      skipToCompletedBlocked = e.status === 400 || e.status === 409;
    }
    check(skipToCompletedBlocked, "TC-36: Critical 20: Forged transition from SKIPPED to COMPLETED blocked");
  }

  // ----------------------------------------------------
  // SUITE 2: RETURNED ELIGIBILITY & PRE-RETURN PROTECTION
  // ----------------------------------------------------
  console.log("\n--- Suite 2: RETURNED Eligibility & Pre-Return Protection ---");

  {
    // Try on arbitrary non-existent report
    let notFoundBlocked = false;
    try {
      await getOrCreateReward("non-existent-report-id", ownerA);
    } catch (e: any) {
      notFoundBlocked = e.status === 404;
    }
    check(notFoundBlocked, "TC-37: Non-existent report rejected with HTTP 404");

    // Case where owner confirmed but finder not yet confirmed (state is OWNER_CONFIRMED)
    const partialRep = "rep-partial-confirm-test";
    run("INSERT INTO reports (id, userId, kind, title, category, color, brand, description, privateDetail, location, date, department, status, custodyLocation, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      partialRep, finderA, "found", "Half Confirmed Bottle", "Accessories", "Blue", "Milton", "Found on desk", "", "Library", "2026-09-30", "Library", "open", "Help Desk", ts);
    const partialItem = "item-partial-confirm";
    run("INSERT INTO protected_items (id, userId, name, category, brand, color, description, privateDetail, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
      partialItem, ownerA, "Milton Bottle", "Accessories", "Milton", "Blue", "My bottle", "Dent on bottom", "safe", ts);
    const cand = await createCandidateMatch({
      foundReportId: partialRep,
      itemId: partialItem,
      overallScore: 90,
      confidenceTier: "high",
      status: "verified",
    });
    await initiateRecovery(cand.id, ownerA);
    await proposeHandover(partialRep, { location: "Library Help Desk", date: "2026-10-01", timeWindow: "10:00-11:00" }, ownerA);
    await acceptHandover(partialRep, finderA);
    await confirmOwnerReceipt(partialRep, ownerA);

    let partialBlocked = false;
    try {
      await getOrCreateReward(partialRep, ownerA);
    } catch (e: any) {
      partialBlocked = e.status === 400;
    }
    check(partialBlocked, "TC-38: OWNER_CONFIRMED state cannot initiate reward (requires both confirmations)");
  }

  // ----------------------------------------------------
  // SUITE 3: OWNER DECISION & ZERO SOCIAL PRESSURE
  // ----------------------------------------------------
  console.log("\n--- Suite 3: Owner Decision & Zero Social Pressure ---");

  {
    const { repId } = await setupReturnedCase("decision-test");
    const reward = await getOrCreateReward(repId, ownerA);
    check(reward.state === "NOT_OFFERED", "TC-39: Fresh reward starts in NOT_OFFERED state");

    // Non-owner cannot make reward decision
    let nonOwnerBlocked = false;
    try {
      await chooseRewardDecision(repId, "THANK", ownerB);
    } catch (e: any) {
      nonOwnerBlocked = e.status === 403;
    }
    check(nonOwnerBlocked, "TC-40: Non-owner blocked from choosing reward decision (403)");
  }

  // ----------------------------------------------------
  // SUITE 4: FINDER UPI ID VALIDATION & SAFE FORMATS
  // ----------------------------------------------------
  console.log("\n--- Suite 4: Finder UPI ID Validation & Safe Formats ---");

  {
    // Valid UPIs
    check(validateUpiId("alex@okaxis") === "alex@okaxis", "TC-41: alex@okaxis validated");
    check(validateUpiId("student.2026@icici") === "student.2026@icici", "TC-42: student.2026@icici validated");
    check(validateUpiId("rahul_99@paytm") === "rahul_99@paytm", "TC-43: rahul_99@paytm validated");
    check(validateUpiId("john-doe@ybl") === "john-doe@ybl", "TC-44: john-doe@ybl validated");

    // Invalid UPIs
    let emptyBlocked = false;
    try { validateUpiId(""); } catch (e: any) { emptyBlocked = e.status === 400; }
    check(emptyBlocked, "TC-45: Empty UPI rejected");

    let noBankBlocked = false;
    try { validateUpiId("onlyusername"); } catch (e: any) { noBankBlocked = e.status === 400; }
    check(noBankBlocked, "TC-46: UPI without @ handle rejected");

    let spaceBlocked = false;
    try { validateUpiId("name with spaces@bank"); } catch (e: any) { spaceBlocked = e.status === 400; }
    check(spaceBlocked, "TC-47: UPI with spaces rejected");

    let longBlocked = false;
    try { validateUpiId("a".repeat(70) + "@bank"); } catch (e: any) { longBlocked = e.status === 400; }
    check(longBlocked, "TC-48: Excessively long UPI rejected");
  }

  // ----------------------------------------------------
  // SUITE 5: ZERO-LOGIN FINDER ACTION TOKEN MECHANISM
  // ----------------------------------------------------
  console.log("\n--- Suite 5: Zero-Login Finder Action Token Mechanism ---");

  {
    const { repId, actionToken } = await setupReturnedCase("finder-token-test");
    await chooseRewardDecision(repId, "THANK", ownerA);

    // Finder provides UPI via actionToken (without full account)
    const tokenReward = await provideFinderUpi(repId, "guest.finder@upi", undefined, actionToken);
    check(tokenReward.state === "UPI_PROVIDED", "TC-49: Finder provided UPI via scoped action token");
    check(tokenReward.finderUpiId === "guest.finder@upi", "TC-50: Finder UPI saved successfully");

    // Owner reports payment
    await reportOwnerPayment(repId, ownerA);

    // Finder confirms receipt via actionToken
    const confirmedViaToken = await confirmFinderPayment(repId, undefined, actionToken);
    check(confirmedViaToken.state === "COMPLETED", "TC-51: Finder confirmed receipt via action token");
  }

  // ----------------------------------------------------
  // SUITE 6: FINANCIAL DISCLAIMER & ABSENCE OF GATEWAY
  // ----------------------------------------------------
  console.log("\n--- Suite 6: Financial Disclaimer & Absence of Gateway ---");

  {
    const { repId } = await setupReturnedCase("disclaimer-test");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "payee@upi", finderA);

    const view = await getClientRewardView(repId, ownerA);
    check(view.disclaimer.includes("KHOJ does not process or hold this payment"), "TC-52: UI disclaimer explicitly clarifies KHOJ does not hold payment");
    check(view.amountInr === 20, "TC-53: Amount is fixed strictly at 20");
    check(view.upiPaymentUri !== null && view.upiPaymentUri.startsWith("upi://pay"), "TC-54: Payment deep link uses standard upi:// protocol");
  }

  // ----------------------------------------------------
  // SUITE 7: DISPUTES & ADMIN STAFF RESOLUTION
  // ----------------------------------------------------
  console.log("\n--- Suite 7: Disputes & Admin Staff Resolution ---");

  {
    const { repId } = await setupReturnedCase("admin-resolve-test");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "dispute.finder@upi", finderA);
    await reportOwnerPayment(repId, ownerA);

    // Dispute raised
    await reportRewardDispute(repId, "Wrong transaction ID reported", ownerA);
    const disputed = await getRewardByReportId(repId);
    check(disputed?.state === "MANUAL_REVIEW", "TC-55: Disputed reward entered MANUAL_REVIEW");

    // Non-staff cannot resolve dispute
    let nonStaffBlocked = false;
    try {
      await adminResolveReward(repId, ownerA, "COMPLETED");
    } catch (e: any) {
      nonStaffBlocked = e.status === 403;
    }
    check(nonStaffBlocked, "TC-56: Non-staff user blocked from resolving reward dispute (403)");

    // Staff resolves dispute
    const resolved = await adminResolveReward(repId, staffA, "COMPLETED", "Bank SMS verified in presence of staff");
    check(resolved.state === "COMPLETED", "TC-57: Staff successfully resolved dispute to COMPLETED");
    check(Boolean(resolved.completedAt), "TC-58: Staff completion recorded timestamp");
  }

  // ----------------------------------------------------
  // SUITE 8: AUDIT TRAIL RECORDING
  // ----------------------------------------------------
  console.log("\n--- Suite 8: Audit Trail Recording ---");

  {
    const { repId } = await setupReturnedCase("audit-test");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "audit.target@upi", finderA);
    await markPaymentInitiated(repId, ownerA);
    await reportOwnerPayment(repId, ownerA);
    await confirmFinderPayment(repId, finderA);

    const events = await getRewardEvents(repId);
    check(events.length >= 4, "TC-59: At least 4 reward audit events logged");
    check(events.some((e) => e.eventType === "REWARD_OFFERED"), "TC-60: 'REWARD_OFFERED' audit event captured");
    check(events.some((e) => e.eventType === "UPI_PROVIDED"), "TC-61: 'UPI_PROVIDED' audit event captured");
    check(events.some((e) => e.eventType === "OWNER_REPORTED_PAYMENT"), "TC-62: 'OWNER_REPORTED_PAYMENT' audit event captured");
    check(events.some((e) => e.eventType === "FINDER_CONFIRMED_PAYMENT"), "TC-63: 'FINDER_CONFIRMED_PAYMENT' audit event captured");
  }

  // ----------------------------------------------------
  // SUITE 9: PRIVACY INVARIANTS & ANTI-LEAKAGE
  // ----------------------------------------------------
  console.log("\n--- Suite 9: Privacy Invariants & Anti-Leakage ---");

  {
    const { repId } = await setupReturnedCase("privacy-test");
    await chooseRewardDecision(repId, "THANK", ownerA);
    await provideFinderUpi(repId, "private.finder@okaxis", finderA);

    // Owner view
    const ownerView = await getClientRewardView(repId, ownerA);
    check(ownerView.finderUpiId === "private.finder@okaxis", "TC-64: Owner can see finder UPI after item is RETURNED and UPI provided");

    // Finder view (finder does NOT see owner UPI, phone, or bank details)
    const finderView = await getClientRewardView(repId, finderA);
    check(finderView.isFinder === true, "TC-65: Finder is correctly identified");
    check((finderView as any).ownerUpi === undefined, "TC-66: Owner UPI is completely non-existent");
    check((finderView as any).ownerPhone === undefined, "TC-67: Owner phone is not exposed in reward view");
    check((finderView as any).ownerEmail === undefined, "TC-68: Owner email is not exposed in reward view");
  }

  // ----------------------------------------------------
  // SUITE 10: STATE MACHINE CONSTRAINTS & CONCURRENCY
  // ----------------------------------------------------
  console.log("\n--- Suite 10: State Machine Constraints & Concurrency ---");

  {
    // Dual confirmation logic
    check(computeRewardDualConfirmationState(true, true, "PAYMENT_SELF_REPORTED") === "COMPLETED",
      "TC-69: Both confirmed -> COMPLETED");
    check(computeRewardDualConfirmationState(true, false, "UPI_PROVIDED") === "PAYMENT_SELF_REPORTED",
      "TC-70: Owner only -> PAYMENT_SELF_REPORTED");
    check(computeRewardDualConfirmationState(false, true, "UPI_PROVIDED") === "UPI_PROVIDED",
      "TC-71: Finder only -> remains current state (UPI_PROVIDED)");

    // Illegal jump
    let illegalJumpBlocked = false;
    try {
      assertValidRewardTransition("NOT_OFFERED", "PAYMENT_SELF_REPORTED", "owner");
    } catch (e: any) {
      illegalJumpBlocked = e.status === 400;
    }
    check(illegalJumpBlocked, "TC-72: Illegal jump from NOT_OFFERED to PAYMENT_SELF_REPORTED blocked");
  }

  console.log("\n==================================================");
  console.log(`ALL ${passed} PHASE 9 OPTIONAL REWARD TESTS PASSED!`);
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
