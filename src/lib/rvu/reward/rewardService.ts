/**
 * KHOJ — Phase 9: Reward Service
 * Coordinates the optional ₹20 thank-you reward post-return flow.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * - Handover state MUST be RETURNED with dual confirmation.
 * - The reward is completely OPTIONAL.
 * - KHOJ NEVER processes, holds, or escrows money.
 * - Direct owner-to-finder payment through UPI.
 * - Dual confirmation for reward: owner reports payment, finder confirms receipt.
 */

import { one, run, notify, now } from "@/lib/rvu/db";
import { HttpError } from "@/lib/rvu/auth";
import { getRecoveryCaseByReportId } from "@/lib/rvu/recovery/recoveryRepository";
import { resolveActorRole } from "@/lib/rvu/recovery/recoveryService";
import type {
  ClientRewardView,
  RewardRecord,
  RewardState,
} from "./rewardTypes";
import { REWARD_CONFIG } from "./rewardConfig";
import {
  assertValidRewardTransition,
  computeRewardDualConfirmationState,
} from "./rewardStateMachine";
import {
  createRewardRecord,
  getRewardByReportId,
  recordRewardEvent,
  updateRewardRecord,
} from "./rewardRepository";

/**
 * Validates a UPI ID string for length, character set, and structural sanity.
 */
export function validateUpiId(rawUpi: string): string {
  const trimmed = (rawUpi || "").trim();
  if (!trimmed) {
    throw new HttpError(400, "UPI ID is required.");
  }
  if (trimmed.length > 64 || trimmed.length < 5) {
    throw new HttpError(400, "UPI ID must be between 5 and 64 characters.");
  }
  // Prevent SQL injection, scripts, or whitespace in UPI ID
  if (/[\s;'"<>\\]/.test(trimmed)) {
    throw new HttpError(400, "UPI ID contains invalid characters.");
  }
  if (!REWARD_CONFIG.UPI_REGEX.test(trimmed)) {
    throw new HttpError(400, "Invalid UPI ID format. Expected format: username@bank or username@upi.");
  }
  return trimmed;
}

/**
 * Constructs a standardized, safe UPI deep-link intent for mobile UPI apps.
 */
export function buildUpiPaymentUri(upiId: string): string {
  const safeUpi = validateUpiId(upiId);
  const pa = encodeURIComponent(safeUpi);
  const pn = encodeURIComponent("Finder");
  const am = REWARD_CONFIG.THANK_YOU_AMOUNT_INR;
  const cu = "INR";
  const tn = encodeURIComponent("KHOJ Thank You");

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}`;
}

/**
 * Ensures a reward record exists for an eligible RETURNED recovery case.
 * Enforces server-side eligibility: handover state MUST be RETURNED with dual confirmation.
 */
export async function getOrCreateReward(
  reportId: string,
  requestingUserId?: string,
  actionToken?: string
): Promise<RewardRecord> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) {
    throw new HttpError(404, "Recovery case not found.");
  }

  // Server-Side Entry Condition Check:
  // Reward flow can begin ONLY when handover state = RETURNED,
  // owner_confirmed = true, and finder_confirmed = true.
  if (
    recovery.state !== "RETURNED" ||
    !recovery.ownerConfirmed ||
    !recovery.finderConfirmed
  ) {
    throw new HttpError(
      400,
      `Reward flow is available only after the item is confirmed RETURNED by both parties. Current state: ${recovery.state}.`
    );
  }

  const { role } = await resolveActorRole(recovery, requestingUserId, actionToken);

  let reward = await getRewardByReportId(reportId);
  if (!reward) {
    reward = await createRewardRecord({
      reportId,
      recoveryCaseId: recovery.candidateMatchId || reportId,
      ownerId: recovery.ownerId,
      finderReference: recovery.finderId,
      amountInr: REWARD_CONFIG.THANK_YOU_AMOUNT_INR,
      state: "NOT_OFFERED",
      finderUpiId: "",
      workflowVersion: "v1",
    });

    await recordRewardEvent({
      rewardId: reward.id,
      reportId,
      actorId: requestingUserId || recovery.finderId,
      actorRole: role,
      eventType: "REWARD_RECORD_INITIALIZED",
      fromState: "NOT_OFFERED",
      toState: "NOT_OFFERED",
      metadata: { amountInr: REWARD_CONFIG.THANK_YOU_AMOUNT_INR },
    });
  }

  return reward;
}

/**
 * Owner makes the optional decision to THANK with ₹20 or SKIP.
 */
export async function chooseRewardDecision(
  reportId: string,
  decision: "THANK" | "SKIP",
  actorUserId: string,
  clientSuppliedAmount?: number
): Promise<RewardRecord> {
  if (!actorUserId) {
    throw new HttpError(401, "Authentication required.");
  }

  // Ignore or reject forged client amounts; amount is strictly server-controlled
  if (clientSuppliedAmount !== undefined && clientSuppliedAmount !== REWARD_CONFIG.THANK_YOU_AMOUNT_INR) {
    console.warn(`Client attempted to pass tampered reward amount: ${clientSuppliedAmount}. Enforcing ₹20.`);
  }

  const reward = await getOrCreateReward(reportId, actorUserId);
  if (actorUserId !== reward.ownerId) {
    throw new HttpError(403, "Only the verified item owner can offer or skip the optional reward.");
  }

  const targetState: RewardState = decision === "SKIP" ? "SKIPPED" : "WAITING_FOR_UPI";
  assertValidRewardTransition(reward.state, targetState, "owner");

  const updated = await updateRewardRecord(reportId, {
    state: targetState,
    amountInr: REWARD_CONFIG.THANK_YOU_AMOUNT_INR,
  });

  // Sync legacy handovers table
  await run(
    'UPDATE handovers SET "rewardStatus" = ? WHERE "reportId" = ?',
    decision === "SKIP" ? "skipped" : "offered",
    reportId
  );

  await recordRewardEvent({
    rewardId: reward.id,
    reportId,
    actorId: actorUserId,
    actorRole: "owner",
    eventType: decision === "SKIP" ? "REWARD_SKIPPED" : "REWARD_OFFERED",
    fromState: reward.state,
    toState: targetState,
    metadata: { decision, amountInr: REWARD_CONFIG.THANK_YOU_AMOUNT_INR },
  });

  if (decision === "THANK") {
    await notify(
      reward.finderReference,
      "The owner chose to send a ₹20 thank-you. Please provide your UPI ID.",
      `/finder/cases/${reportId}`
    );
  } else {
    // Notify finder neutrally without social pressure or guilt
    await notify(
      reward.finderReference,
      "Item return confirmed. Thank you for helping return this item.",
      `/status`
    );
  }

  return updated;
}

/**
 * Finder securely submits their UPI ID to receive the optional ₹20.
 */
export async function provideFinderUpi(
  reportId: string,
  rawUpiId: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RewardRecord> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = await resolveActorRole(recovery, actorUserId, actionToken);
  if (role !== "finder" && role !== "staff") {
    throw new HttpError(403, "Only the finder or authorized staff can provide a UPI address.");
  }

  const reward = await getOrCreateReward(reportId, actorUserId, actionToken);
  assertValidRewardTransition(reward.state, "UPI_PROVIDED", role);

  const cleanUpi = validateUpiId(rawUpiId);

  const updated = await updateRewardRecord(reportId, {
    state: "UPI_PROVIDED",
    finderUpiId: cleanUpi,
  });

  // Sync legacy handovers table
  await run('UPDATE handovers SET "finderUpi" = ? WHERE "reportId" = ?', cleanUpi, reportId);

  await recordRewardEvent({
    rewardId: reward.id,
    reportId,
    actorId: actorUserId || recovery.finderId,
    actorRole: role,
    eventType: "UPI_PROVIDED",
    fromState: reward.state,
    toState: "UPI_PROVIDED",
    metadata: { upiSuffix: cleanUpi.slice(cleanUpi.indexOf("@")) },
  });

  await notify(
    reward.ownerId,
    "Your finder shared their UPI ID for the ₹20 thank-you.",
    `/dashboard`
  );

  return updated;
}

/**
 * Owner indicates intent to open UPI app.
 */
export async function markPaymentInitiated(
  reportId: string,
  actorUserId: string
): Promise<RewardRecord> {
  if (!actorUserId) throw new HttpError(401, "Authentication required.");

  const reward = await getRewardByReportId(reportId);
  if (!reward) throw new HttpError(404, "Reward record not found.");

  if (actorUserId !== reward.ownerId) {
    throw new HttpError(403, "Only the owner can initiate payment.");
  }

  if (reward.state === "UPI_PROVIDED") {
    assertValidRewardTransition(reward.state, "PAYMENT_INITIATED", "owner");
    const updated = await updateRewardRecord(reportId, { state: "PAYMENT_INITIATED" });

    await recordRewardEvent({
      rewardId: reward.id,
      reportId,
      actorId: actorUserId,
      actorRole: "owner",
      eventType: "PAYMENT_LINK_OPENED",
      fromState: reward.state,
      toState: "PAYMENT_INITIATED",
    });

    return updated;
  }

  return reward;
}

/**
 * Owner reports that they have sent ₹20 via their UPI app.
 * Idempotent.
 */
export async function reportOwnerPayment(
  reportId: string,
  actorUserId: string
): Promise<RewardRecord> {
  if (!actorUserId) throw new HttpError(401, "Authentication required.");

  const reward = await getRewardByReportId(reportId);
  if (!reward) throw new HttpError(404, "Reward record not found.");

  if (actorUserId !== reward.ownerId) {
    throw new HttpError(403, "Only the owner can report sending payment.");
  }

  // Idempotent: if already reported, return current record
  if (reward.ownerPaymentReportedAt && reward.state === "PAYMENT_SELF_REPORTED") {
    return reward;
  }

  assertValidRewardTransition(reward.state, "PAYMENT_SELF_REPORTED", "owner");

  const ts = now();
  const nextState = computeRewardDualConfirmationState(
    true,
    Boolean(reward.finderPaymentConfirmedAt),
    reward.state
  );

  const updated = await updateRewardRecord(reportId, {
    state: nextState,
    ownerPaymentReportedAt: reward.ownerPaymentReportedAt || ts,
    completedAt: nextState === "COMPLETED" ? (reward.completedAt || ts) : null,
  });

  // Sync legacy handovers table
  await run('UPDATE handovers SET "rewardStatus" = \'sent_unverified\' WHERE "reportId" = ?', reportId);

  await recordRewardEvent({
    rewardId: reward.id,
    reportId,
    actorId: actorUserId,
    actorRole: "owner",
    eventType: "OWNER_REPORTED_PAYMENT",
    fromState: reward.state,
    toState: nextState,
    metadata: { timestamp: ts },
  });

  await notify(
    reward.finderReference,
    "The owner reports sending the ₹20 thank-you. Please confirm once received.",
    `/finder/cases/${reportId}`
  );

  return updated;
}

/**
 * Finder confirms that they physically received the ₹20 in their bank account.
 * Both owner reporting AND finder confirmation are required for COMPLETED.
 * Idempotent.
 */
export async function confirmFinderPayment(
  reportId: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RewardRecord> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = await resolveActorRole(recovery, actorUserId, actionToken);
  if (role !== "finder" && role !== "staff") {
    throw new HttpError(403, "Only the finder or staff can confirm receiving payment.");
  }

  const reward = await getRewardByReportId(reportId);
  if (!reward) throw new HttpError(404, "Reward record not found.");

  if (!reward.ownerPaymentReportedAt) {
    const ts = now();
    const updated = await updateRewardRecord(reportId, {
      finderPaymentConfirmedAt: reward.finderPaymentConfirmedAt || ts,
    });
    return updated;
  }

  // Idempotent: if already completed, return existing
  if (reward.state === "COMPLETED") {
    return reward;
  }

  assertValidRewardTransition(reward.state, "COMPLETED", role);

  const ts = now();
  const updated = await updateRewardRecord(reportId, {
    state: "COMPLETED",
    finderPaymentConfirmedAt: reward.finderPaymentConfirmedAt || ts,
    completedAt: reward.completedAt || ts,
  });

  await recordRewardEvent({
    rewardId: reward.id,
    reportId,
    actorId: actorUserId || recovery.finderId,
    actorRole: role,
    eventType: "FINDER_CONFIRMED_PAYMENT",
    fromState: reward.state,
    toState: "COMPLETED",
    metadata: { timestamp: ts },
  });

  await notify(
    reward.ownerId,
    "Thank-you payment confirmed by finder. Thank you for your generosity!",
    `/status`
  );
  await notify(
    reward.finderReference,
    "Thank-you payment confirmed. Thank you for helping return this item.",
    `/status`
  );

  return updated;
}

/**
 * Reports a dispute or payment issue (e.g. payment not received, wrong amount).
 * Routes to MANUAL_REVIEW.
 */
export async function reportRewardDispute(
  reportId: string,
  disputeReason: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RewardRecord> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = await resolveActorRole(recovery, actorUserId, actionToken);
  const reward = await getRewardByReportId(reportId);
  if (!reward) throw new HttpError(404, "Reward record not found.");

  assertValidRewardTransition(reward.state, "MANUAL_REVIEW", role);

  const cleanReason = (disputeReason || "").trim().slice(0, 500);
  const updated = await updateRewardRecord(reportId, {
    state: "MANUAL_REVIEW",
    disputeReason: cleanReason,
  });

  await recordRewardEvent({
    rewardId: reward.id,
    reportId,
    actorId: actorUserId || recovery.finderId,
    actorRole: role,
    eventType: "REWARD_DISPUTED",
    fromState: reward.state,
    toState: "MANUAL_REVIEW",
    metadata: { reason: cleanReason },
  });

  return updated;
}

/**
 * Cancels an optional reward before completion.
 */
export async function cancelReward(
  reportId: string,
  reason: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RewardRecord> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = await resolveActorRole(recovery, actorUserId, actionToken);
  const reward = await getRewardByReportId(reportId);
  if (!reward) throw new HttpError(404, "Reward record not found.");

  assertValidRewardTransition(reward.state, "CANCELLED", role);

  const cleanReason = (reason || "").trim().slice(0, 500);
  const updated = await updateRewardRecord(reportId, {
    state: "CANCELLED",
    cancellationReason: cleanReason,
  });

  await recordRewardEvent({
    rewardId: reward.id,
    reportId,
    actorId: actorUserId || recovery.finderId,
    actorRole: role,
    eventType: "REWARD_CANCELLED",
    fromState: reward.state,
    toState: "CANCELLED",
    metadata: { reason: cleanReason },
  });

  return updated;
}

/**
 * Checks for reward expiration if waiting for UPI or payment has lapsed.
 * Note: Core recovery remains RETURNED; only reward state expires.
 */
export async function checkRewardExpiration(reportId: string): Promise<RewardRecord> {
  const reward = await getRewardByReportId(reportId);
  if (!reward) throw new HttpError(404, "Reward record not found.");

  if (reward.state === "WAITING_FOR_UPI" || reward.state === "UPI_PROVIDED") {
    const ageMs = Date.now() - new Date(reward.updatedAt).getTime();
    const timeoutMs = REWARD_CONFIG.WAITING_FOR_UPI_TIMEOUT_HOURS * 3600 * 1000;

    if (ageMs > timeoutMs) {
      const updated = await updateRewardRecord(reportId, { state: "EXPIRED" });
      await recordRewardEvent({
        rewardId: reward.id,
        reportId,
        actorId: "system",
        actorRole: "system",
        eventType: "REWARD_EXPIRED",
        fromState: reward.state,
        toState: "EXPIRED",
      });
      return updated;
    }
  }

  return reward;
}

/**
 * Authorized staff resolves a disputed or stuck reward case.
 */
export async function adminResolveReward(
  reportId: string,
  staffUserId: string,
  resolution: "COMPLETED" | "CANCELLED",
  note?: string
): Promise<RewardRecord> {
  if (!staffUserId) throw new HttpError(401, "Staff authentication required.");

  const staff = await one<{ id: string; role: string }>("SELECT id, role FROM users WHERE id=?", staffUserId);
  if (staff?.role !== "staff") {
    throw new HttpError(403, "Staff privileges required to resolve reward disputes.");
  }

  const reward = await getRewardByReportId(reportId);
  if (!reward) throw new HttpError(404, "Reward record not found.");

  assertValidRewardTransition(reward.state, resolution, "staff");

  const ts = now();
  const updated = await updateRewardRecord(reportId, {
    state: resolution,
    completedAt: resolution === "COMPLETED" ? ts : reward.completedAt,
    cancellationReason: resolution === "CANCELLED" ? (note || "Admin cancelled") : reward.cancellationReason,
  });

  await recordRewardEvent({
    rewardId: reward.id,
    reportId,
    actorId: staffUserId,
    actorRole: "staff",
    eventType: "STAFF_RESOLVED",
    fromState: reward.state,
    toState: resolution,
    metadata: { note: note || "" },
  });

  return updated;
}

/**
 * Returns a privacy-safe view of the reward state for the client UI.
 * Enforces strict privacy invariants:
 * - Finder UPI ID is exposed ONLY to the verified owner AFTER the item is RETURNED and finder provided UPI.
 * - Public requests or third-party accounts NEVER see UPI details or reward amounts.
 */
export async function getClientRewardView(
  reportId: string,
  requestingUserId?: string,
  actionToken?: string
): Promise<ClientRewardView> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const isEligible = recovery.state === "RETURNED" && recovery.ownerConfirmed && recovery.finderConfirmed;
  const reward = await getRewardByReportId(reportId);

  let isOwner = false;
  let isFinder = false;

  if (requestingUserId) {
    if (requestingUserId === recovery.ownerId) isOwner = true;
    if (requestingUserId === recovery.finderId) isFinder = true;
  }
  if (actionToken && recovery.finderActionToken && actionToken === recovery.finderActionToken) {
    isFinder = true;
  }

  const currentState = reward ? reward.state : "NOT_OFFERED";

  // UPI is visible to owner ONLY when finder provided it and item is RETURNED
  const canSeeUpi = isOwner && Boolean(reward?.finderUpiId) && isEligible;
  const exposedUpi = canSeeUpi && reward ? reward.finderUpiId : null;
  const upiUri = exposedUpi ? buildUpiPaymentUri(exposedUpi) : null;

  return {
    id: reward?.id || "",
    reportId,
    amountInr: REWARD_CONFIG.THANK_YOU_AMOUNT_INR,
    state: currentState,
    isEligibleForReward: isEligible,
    isOwner,
    isFinder,
    finderUpiId: exposedUpi,
    upiPaymentUri: upiUri,
    ownerPaymentReported: Boolean(reward?.ownerPaymentReportedAt),
    finderPaymentConfirmed: Boolean(reward?.finderPaymentConfirmedAt),
    disclaimer: REWARD_CONFIG.DISCLAIMER_TEXT,
  };
}
