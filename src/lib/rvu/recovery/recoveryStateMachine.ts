/**
 * KHOJ — Phase 8: Recovery State Machine
 * Centralized, deterministic validation of recovery and handover state transitions.
 * 
 * CORE ARCHITECTURAL INVARIANT:
 * RETURNED occurs ONLY when BOTH owner_confirmed AND finder_confirmed are true.
 * Reward/payment is completely absent from this state machine.
 */

import { HttpError } from "@/lib/rvu/auth";
import type { HandoverActorRole, RecoveryState } from "./recoveryTypes";

// Valid forward and lateral transitions
const VALID_TRANSITIONS: Record<RecoveryState, RecoveryState[]> = {
  VERIFICATION_REQUIRED: ["VERIFIED", "MANUAL_REVIEW", "CANCELLED"],
  VERIFIED: ["RECOVERY_PENDING", "MANUAL_REVIEW", "CANCELLED"],
  RECOVERY_PENDING: ["HANDOVER_PROPOSED", "HANDOVER_ACCEPTED", "CANCELLED", "MANUAL_REVIEW"],
  HANDOVER_PROPOSED: [
    "HANDOVER_ACCEPTED",
    "HANDOVER_PROPOSED", // Counter-proposal
    "CANCELLED",
    "EXPIRED",
    "MANUAL_REVIEW",
  ],
  HANDOVER_ACCEPTED: [
    "HANDOVER_IN_PROGRESS",
    "OWNER_CONFIRMED",
    "FINDER_CONFIRMED",
    "CANCELLED",
    "EXPIRED",
    "MANUAL_REVIEW",
  ],
  HANDOVER_IN_PROGRESS: [
    "OWNER_CONFIRMED",
    "FINDER_CONFIRMED",
    "CANCELLED",
    "EXPIRED",
    "MANUAL_REVIEW",
  ],
  OWNER_CONFIRMED: [
    "OWNER_CONFIRMED", // Idempotent
    "RETURNED",
    "CANCELLED",
    "MANUAL_REVIEW",
  ],
  FINDER_CONFIRMED: [
    "FINDER_CONFIRMED", // Idempotent
    "RETURNED",
    "CANCELLED",
    "MANUAL_REVIEW",
  ],
  RETURNED: [
    "RETURNED", // Idempotent terminal
  ],
  CANCELLED: [
    "RECOVERY_PENDING", // Restartable by authorized actor
    "HANDOVER_PROPOSED", // Propose fresh handover schedule
    "MANUAL_REVIEW",
  ],
  EXPIRED: [
    "RECOVERY_PENDING", // Restartable
    "HANDOVER_PROPOSED", // Propose fresh handover schedule
    "MANUAL_REVIEW",
  ],
  MANUAL_REVIEW: [
    "RECOVERY_PENDING",
    "HANDOVER_ACCEPTED",
    "RETURNED", // Authorized staff resolution
    "CANCELLED",
  ],
};

/**
 * Validates whether a state transition is permitted for the given actor role.
 */
export function assertValidTransition(
  fromState: RecoveryState,
  toState: RecoveryState,
  actorRole: HandoverActorRole
): void {
  // Staff can override transitions when resolving disputes
  if (actorRole === "staff") {
    return;
  }

  // Idempotent state transitions are always allowed
  if (fromState === toState) {
    return;
  }

  const allowed = VALID_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new HttpError(
      400,
      `Invalid recovery transition from '${fromState}' to '${toState}'.`
    );
  }

  // Prevent normal users from altering a RETURNED case
  if (fromState === "RETURNED" && toState !== "RETURNED") {
    throw new HttpError(409, "This item has already been marked as returned and cannot be altered.");
  }
}

/**
 * Calculates the resulting recovery state upon confirmation.
 * Returns RETURNED only when both confirmations are true.
 */
export function computeDualConfirmationState(
  ownerConfirmed: boolean,
  finderConfirmed: boolean,
  currentState: RecoveryState
): RecoveryState {
  if (ownerConfirmed && finderConfirmed) {
    return "RETURNED";
  }
  if (ownerConfirmed && !finderConfirmed) {
    return "OWNER_CONFIRMED";
  }
  if (!ownerConfirmed && finderConfirmed) {
    return "FINDER_CONFIRMED";
  }
  return currentState;
}
