/**
 * KHOJ — Phase 8: Recovery Service
 * Coordinates the full custody & safe handover lifecycle between verified owner and finder.
 * 
 * CORE ARCHITECTURAL INVARIANT:
 * RETURNED occurs ONLY when BOTH owner_confirmed AND finder_confirmed are true.
 * Zero reward or payment gating.
 */

import { one, run, notify, now, transaction } from "@/lib/rvu/db";
import { HttpError } from "@/lib/rvu/auth";
import type { CandidateScoreCard, ProtectedItem, Report } from "@/lib/rvu/types";
import { getCandidateMatchById } from "@/lib/rvu/fingerprints/candidateRepository";
import type {
  ClientRecoveryView,
  HandoverActorRole,
  HandoverProposal,
  RecoveryCase,
  RecoveryState,
} from "./recoveryTypes";
import { RECOVERY_CONFIG } from "./recoveryConfig";
import { assertValidTransition, computeDualConfirmationState } from "./recoveryStateMachine";
import {
  createRecoveryCase,
  getRecoveryCaseByActionToken,
  getRecoveryCaseByReportId,
  recordRecoveryEvent,
  updateRecoveryCase,
} from "./recoveryRepository";

/**
 * Validates that a requested handover location belongs to approved campus safe points.
 */
export function validateCampusLocation(location: string): string {
  const trimmed = (location || "").trim();
  const match = RECOVERY_CONFIG.APPROVED_CAMPUS_LOCATIONS.find(
    (loc) => loc.toLowerCase() === trimmed.toLowerCase()
  );
  if (!match) {
    throw new HttpError(
      400,
      `Location must be an approved campus safe point. Options: ${RECOVERY_CONFIG.APPROVED_CAMPUS_LOCATIONS.join(", ")}`
    );
  }
  return match;
}

/**
 * Validates that an actor is authorized to interact with a recovery case.
 */
export function resolveActorRole(
  recovery: RecoveryCase,
  actorUserId?: string,
  actionToken?: string
): { role: HandoverActorRole; verified: boolean } {
  if (actorUserId) {
    // Check staff role
    const user = one<{ id: string; role: string }>("SELECT id, role FROM users WHERE id=?", actorUserId);
    if (user?.role === "staff") return { role: "staff", verified: true };

    if (actorUserId === recovery.ownerId) return { role: "owner", verified: true };
    if (actorUserId === recovery.finderId) return { role: "finder", verified: true };
  }

  // Token-based authorization for finders without full accounts
  if (actionToken && recovery.finderActionToken && actionToken === recovery.finderActionToken) {
    if (recovery.tokenExpiresAt && new Date().toISOString() > recovery.tokenExpiresAt) {
      throw new HttpError(401, "Finder action link has expired.");
    }
    return { role: "finder", verified: true };
  }

  throw new HttpError(403, "You are not authorized to view or act on this recovery case.");
}

/**
 * Starts a recovery case for an eligible verified candidate match.
 */
export async function initiateRecovery(
  candidateMatchId: string,
  requestingUserId: string
): Promise<RecoveryCase> {
  if (!requestingUserId) {
    throw new HttpError(401, "Authentication required.");
  }

  let candidate: CandidateScoreCard | null = null;
  try {
    candidate = await getCandidateMatchById(candidateMatchId, requestingUserId, false);
  } catch (err: any) {
    if (err?.name === "AuthorizationError" || err?.status === 403) {
      throw new HttpError(403, "You do not have permission to initiate recovery for this candidate.");
    }
    throw err;
  }
  if (!candidate) {
    throw new HttpError(404, "Candidate record not found or access denied.");
  }

  // Entry Condition: Candidate MUST be verified (Phase 7)
  if (candidate.status !== "verified") {
    throw new HttpError(
      400,
      `Recovery requires verified ownership. Current candidate status is '${candidate.status}'.`
    );
  }

  const item = one<ProtectedItem>("SELECT * FROM protected_items WHERE id=?", candidate.itemId);
  if (!item || item.userId !== requestingUserId) {
    throw new HttpError(403, "Only the verified item owner can initiate recovery.");
  }

  const found = one<Report>("SELECT * FROM reports WHERE id=?", candidate.foundReportId);
  if (!found || found.kind !== "found") {
    throw new HttpError(404, "Associated found report not found.");
  }

  // Check if case already exists
  const existing = await getRecoveryCaseByReportId(found.id);
  if (existing) {
    return existing;
  }

  // Create recovery case
  const recovery = await createRecoveryCase(
    found.id,
    item.userId,
    found.userId,
    candidate.id,
    found.custodyLocation || RECOVERY_CONFIG.DEFAULT_LOCATION
  );

  await recordRecoveryEvent(
    found.id,
    candidate.id,
    requestingUserId,
    "owner",
    "RECOVERY_STARTED",
    "VERIFIED",
    "RECOVERY_PENDING",
    { itemId: item.id }
  );

  // Notify Finder safely without leaking owner personal details
  notify(
    found.userId,
    `The owner of ${found.title} has been verified. Open your found receipt to arrange safe handover.`,
    `/finder/cases/${found.id}`
  );

  return recovery;
}

/**
 * Proposes a safe campus handover location, date, and time window.
 */
export async function proposeHandover(
  reportId: string,
  proposal: HandoverProposal,
  actorUserId?: string,
  actionToken?: string
): Promise<RecoveryCase> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, actorUserId, actionToken);
  const location = validateCampusLocation(proposal.location);

  if (!proposal.date || !/^\d{4}-\d{2}-\d{2}$/.test(proposal.date)) {
    throw new HttpError(400, "Please provide a valid handover date (YYYY-MM-DD).");
  }

  if (!proposal.timeWindow || proposal.timeWindow.trim().length < 3) {
    throw new HttpError(400, "Please provide a preferred time window (e.g. 16:00-17:00).");
  }

  assertValidTransition(recovery.state, "HANDOVER_PROPOSED", role);

  const updated = await updateRecoveryCase(reportId, {
    state: "HANDOVER_PROPOSED",
    proposedLocation: location,
    proposedDate: proposal.date,
    proposedTimeWindow: proposal.timeWindow.trim(),
    proposedBy: role as "owner" | "finder",
    point: location,
  });

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    actorUserId || "finder-token",
    role,
    "HANDOVER_PROPOSED",
    recovery.state,
    "HANDOVER_PROPOSED",
    { location, date: proposal.date, timeWindow: proposal.timeWindow, proposedBy: role }
  );

  // Notify other participant
  const targetUserId = role === "owner" ? recovery.finderId : recovery.ownerId;
  const targetLink = role === "owner" ? `/finder/cases/${reportId}` : "/status";
  notify(
    targetUserId,
    `Handover proposed at ${location} on ${proposal.date} (${proposal.timeWindow}).`,
    targetLink
  );

  return updated;
}

/**
 * Accepts an active handover proposal.
 */
export async function acceptHandover(
  reportId: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RecoveryCase> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, actorUserId, actionToken);

  // Must not accept own proposal
  if (role !== "staff" && recovery.proposedBy === role) {
    throw new HttpError(400, "You cannot accept your own proposal; waiting for the other party.");
  }

  assertValidTransition(recovery.state, "HANDOVER_ACCEPTED", role);

  const updated = await updateRecoveryCase(reportId, {
    state: "HANDOVER_ACCEPTED",
    point: recovery.proposedLocation,
  });

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    actorUserId || "finder-token",
    role,
    "HANDOVER_ACCEPTED",
    recovery.state,
    "HANDOVER_ACCEPTED",
    { location: recovery.proposedLocation, date: recovery.proposedDate }
  );

  // Notify both sides of the confirmed handover appointment
  notify(
    recovery.ownerId,
    `Handover confirmed at ${recovery.proposedLocation} on ${recovery.proposedDate} (${recovery.proposedTimeWindow}).`,
    "/status"
  );
  notify(
    recovery.finderId,
    `Handover confirmed at ${recovery.proposedLocation} on ${recovery.proposedDate} (${recovery.proposedTimeWindow}).`,
    `/finder/cases/${reportId}`
  );

  return updated;
}

/**
 * Counters a proposed handover with a revised location or time.
 */
export async function counterProposeHandover(
  reportId: string,
  counterProposal: HandoverProposal,
  actorUserId?: string,
  actionToken?: string
): Promise<RecoveryCase> {
  return proposeHandover(reportId, counterProposal, actorUserId, actionToken);
}

/**
 * Marks that physical handover is underway.
 */
export async function startHandoverProgress(
  reportId: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RecoveryCase> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, actorUserId, actionToken);
  assertValidTransition(recovery.state, "HANDOVER_IN_PROGRESS", role);

  const updated = await updateRecoveryCase(reportId, {
    state: "HANDOVER_IN_PROGRESS",
  });

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    actorUserId || "finder-token",
    role,
    "HANDOVER_STARTED",
    recovery.state,
    "HANDOVER_IN_PROGRESS"
  );

  return updated;
}

/**
 * Owner confirms physical receipt of their item.
 */
export async function confirmOwnerReceipt(
  reportId: string,
  requestingUserId: string
): Promise<RecoveryCase> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, requestingUserId);
  if (role !== "owner" && role !== "staff") {
    throw new HttpError(403, "Only the verified item owner can confirm receipt.");
  }

  // Idempotent check
  if (recovery.ownerConfirmed && recovery.state === "RETURNED") {
    return recovery;
  }

  const nextState = computeDualConfirmationState(true, recovery.finderConfirmed, recovery.state);
  assertValidTransition(recovery.state, nextState, role);

  const timestamp = now();
  const returnedAt = nextState === "RETURNED" ? timestamp : null;

  let updated: RecoveryCase;
  transaction(() => {
    run(
      `UPDATE handovers SET
        ownerConfirmed=1,
        ownerConfirmedAt=?,
        state=?,
        returnedAt=COALESCE(?, returnedAt),
        updatedAt=?
      WHERE reportId=?`,
      timestamp,
      nextState,
      returnedAt,
      timestamp,
      reportId
    );

    if (nextState === "RETURNED") {
      run("UPDATE reports SET status='returned' WHERE id=?", reportId);
      // Sync candidate_matches status if linked
      if (recovery.candidateMatchId) {
        run("UPDATE candidate_matches SET status='verified', updatedAt=? WHERE id=?", timestamp, recovery.candidateMatchId);
      }
    }
  });

  updated = (await getRecoveryCaseByReportId(reportId))!;

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    requestingUserId,
    role,
    "OWNER_CONFIRMED",
    recovery.state,
    nextState,
    { returned: nextState === "RETURNED" }
  );

  if (nextState === "RETURNED") {
    notify(recovery.ownerId, "Item returned successfully! Welcome back.", "/status");
    notify(recovery.finderId, "Item return confirmed by owner. Thank you for helping!", `/finder/cases/${reportId}`);
  } else {
    notify(recovery.finderId, "The owner confirmed receiving the item. Please confirm return.", `/finder/cases/${reportId}`);
  }

  return updated;
}

/**
 * Finder confirms physical return of the item.
 */
export async function confirmFinderReturn(
  reportId: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RecoveryCase> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, actorUserId, actionToken);
  if (role !== "finder" && role !== "staff") {
    throw new HttpError(403, "Only the item finder can confirm return.");
  }

  // Idempotent check
  if (recovery.finderConfirmed && recovery.state === "RETURNED") {
    return recovery;
  }

  const nextState = computeDualConfirmationState(recovery.ownerConfirmed, true, recovery.state);
  assertValidTransition(recovery.state, nextState, role);

  const timestamp = now();
  const returnedAt = nextState === "RETURNED" ? timestamp : null;

  transaction(() => {
    run(
      `UPDATE handovers SET
        finderConfirmed=1,
        finderConfirmedAt=?,
        state=?,
        returnedAt=COALESCE(?, returnedAt),
        updatedAt=?
      WHERE reportId=?`,
      timestamp,
      nextState,
      returnedAt,
      timestamp,
      reportId
    );

    if (nextState === "RETURNED") {
      run("UPDATE reports SET status='returned' WHERE id=?", reportId);
      if (recovery.candidateMatchId) {
        run("UPDATE candidate_matches SET status='verified', updatedAt=? WHERE id=?", timestamp, recovery.candidateMatchId);
      }
    }
  });

  const updated = (await getRecoveryCaseByReportId(reportId))!;

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    actorUserId || "finder-token",
    role,
    "FINDER_CONFIRMED",
    recovery.state,
    nextState,
    { returned: nextState === "RETURNED" }
  );

  if (nextState === "RETURNED") {
    notify(recovery.ownerId, "Item returned successfully! Welcome back.", "/status");
    notify(recovery.finderId, "Item return confirmed. Thank you for your kindness!", `/finder/cases/${reportId}`);
  } else {
    notify(recovery.ownerId, "The finder confirmed handing over your item. Please confirm receipt.", "/status");
  }

  return updated;
}

/**
 * Reports a dispute, issue, or wrong-item complaint, routing to MANUAL_REVIEW.
 */
export async function reportHandoverIssue(
  reportId: string,
  reason: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RecoveryCase> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, actorUserId, actionToken);
  const issue = (reason || "").trim() || "Handover issue reported";

  assertValidTransition(recovery.state, "MANUAL_REVIEW", role);

  const updated = await updateRecoveryCase(reportId, {
    state: "MANUAL_REVIEW",
    issueReason: issue,
  });

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    actorUserId || "finder-token",
    role,
    "MANUAL_REVIEW_QUEUED",
    recovery.state,
    "MANUAL_REVIEW",
    { issueReason: issue, reportedBy: role }
  );

  return updated;
}

/**
 * Cancels a handover proposal or scheduled handover before completion.
 */
export async function cancelHandover(
  reportId: string,
  reason: string,
  actorUserId?: string,
  actionToken?: string
): Promise<RecoveryCase> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, actorUserId, actionToken);
  if (recovery.state === "RETURNED") {
    throw new HttpError(409, "A completed return cannot be cancelled.");
  }

  assertValidTransition(recovery.state, "CANCELLED", role);

  const updated = await updateRecoveryCase(reportId, {
    state: "CANCELLED",
    cancellationReason: reason.trim(),
  });

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    actorUserId || "finder-token",
    role,
    "CANCELLED",
    recovery.state,
    "CANCELLED",
    { reason, cancelledBy: role }
  );

  return updated;
}

/**
 * Staff manual intervention and dispute resolution.
 */
export async function adminResolveRecovery(
  reportId: string,
  targetState: RecoveryState,
  staffUserId: string,
  note = ""
): Promise<RecoveryCase> {
  const staff = one<{ id: string; role: string }>("SELECT id, role FROM users WHERE id=?", staffUserId);
  if (!staff || staff.role !== "staff") {
    throw new HttpError(403, "Only university staff can resolve recovery cases.");
  }

  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const timestamp = now();
  const isReturned = targetState === "RETURNED";

  const updated = await updateRecoveryCase(reportId, {
    state: targetState,
    ownerConfirmed: isReturned ? true : recovery.ownerConfirmed,
    finderConfirmed: isReturned ? true : recovery.finderConfirmed,
    returnedAt: isReturned ? timestamp : recovery.returnedAt,
  });

  await recordRecoveryEvent(
    reportId,
    recovery.candidateMatchId,
    staffUserId,
    "staff",
    "STAFF_INTERVENTION",
    recovery.state,
    targetState,
    { staffNote: note, resolvedTo: targetState }
  );

  return updated;
}

/**
 * Formats a privacy-safe recovery status view for the claimant or finder.
 */
export async function getRecoveryStatusForClient(
  reportId: string,
  actorUserId?: string,
  actionToken?: string
): Promise<ClientRecoveryView> {
  const recovery = await getRecoveryCaseByReportId(reportId);
  if (!recovery) throw new HttpError(404, "Recovery case not found.");

  const { role } = resolveActorRole(recovery, actorUserId, actionToken);
  const found = one<Report>("SELECT title, custodyLocation FROM reports WHERE id=?", reportId);

  const isOwner = role === "owner";
  const isFinder = role === "finder";

  return {
    reportId: recovery.reportId,
    itemTitle: found?.title || "Item",
    state: recovery.state,
    location: recovery.proposedLocation || found?.custodyLocation || RECOVERY_CONFIG.DEFAULT_LOCATION,
    date: recovery.proposedDate,
    timeWindow: recovery.proposedTimeWindow,
    isOwner,
    isFinder,
    ownerConfirmed: recovery.ownerConfirmed,
    finderConfirmed: recovery.finderConfirmed,
    returnedAt: recovery.returnedAt,
    proposedBy: recovery.proposedBy,
    canConfirm:
      (isOwner && !recovery.ownerConfirmed && ["HANDOVER_ACCEPTED", "HANDOVER_IN_PROGRESS", "FINDER_CONFIRMED"].includes(recovery.state)) ||
      (isFinder && !recovery.finderConfirmed && ["HANDOVER_ACCEPTED", "HANDOVER_IN_PROGRESS", "OWNER_CONFIRMED"].includes(recovery.state)),
    canPropose: ["RECOVERY_PENDING", "HANDOVER_PROPOSED", "CANCELLED", "EXPIRED"].includes(recovery.state),
    canAccept: recovery.state === "HANDOVER_PROPOSED" && recovery.proposedBy !== role,
    canCancel: recovery.state !== "RETURNED",
    issueReported: Boolean(recovery.issueReason),
    message:
      recovery.state === "RETURNED"
        ? "Item successfully returned! Thank you."
        : recovery.state === "HANDOVER_ACCEPTED"
        ? `Handover scheduled at ${recovery.proposedLocation} on ${recovery.proposedDate} (${recovery.proposedTimeWindow}).`
        : recovery.state === "HANDOVER_PROPOSED"
        ? `Handover proposed by ${recovery.proposedBy}. Waiting for acceptance.`
        : "Recovery in progress. Please arrange a safe handover.",
  };
}
