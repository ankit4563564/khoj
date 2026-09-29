/**
 * KHOJ — Phase 9: Reward State Machine
 * Centralizes valid transitions for the optional post-return gratitude flow.
 */

import { HttpError } from "@/lib/rvu/auth";
import type { RewardActorRole, RewardState } from "./rewardTypes";

export const VALID_REWARD_TRANSITIONS: Record<RewardState, RewardState[]> = {
  NOT_OFFERED: ["SKIPPED", "WAITING_FOR_UPI", "CANCELLED"],
  SKIPPED: [
    "SKIPPED", // Idempotent
  ],
  WAITING_FOR_UPI: [
    "UPI_PROVIDED",
    "SKIPPED",
    "CANCELLED",
    "EXPIRED",
    "MANUAL_REVIEW",
  ],
  UPI_PROVIDED: [
    "PAYMENT_INITIATED",
    "PAYMENT_SELF_REPORTED",
    "CANCELLED",
    "EXPIRED",
    "MANUAL_REVIEW",
  ],
  PAYMENT_INITIATED: [
    "PAYMENT_SELF_REPORTED",
    "CANCELLED",
    "EXPIRED",
    "MANUAL_REVIEW",
  ],
  PAYMENT_SELF_REPORTED: [
    "PAYMENT_SELF_REPORTED", // Idempotent
    "COMPLETED",
    "CANCELLED",
    "MANUAL_REVIEW",
  ],
  COMPLETED: [
    "COMPLETED", // Terminal idempotent
  ],
  CANCELLED: [
    "MANUAL_REVIEW",
  ],
  EXPIRED: [
    "MANUAL_REVIEW",
  ],
  MANUAL_REVIEW: [
    "COMPLETED", // Staff resolution
    "CANCELLED", // Staff resolution
    "UPI_PROVIDED",
    "PAYMENT_SELF_REPORTED",
  ],
};

/**
 * Validates whether a reward state transition is permitted for the given actor role.
 */
export function assertValidRewardTransition(
  fromState: RewardState,
  toState: RewardState,
  actorRole: RewardActorRole
): void {
  // Staff can override transitions when resolving disputes
  if (actorRole === "staff") {
    return;
  }

  // Idempotent state transitions are always allowed
  if (fromState === toState) {
    return;
  }

  // Prevent ordinary users from altering a COMPLETED reward
  if (fromState === "COMPLETED" && toState !== "COMPLETED") {
    throw new HttpError(409, "This thank-you payment has already been completed and cannot be altered.");
  }

  // Prevent ordinary users from altering a SKIPPED reward
  if (fromState === "SKIPPED" && toState !== "SKIPPED") {
    throw new HttpError(409, "This thank-you was skipped and cannot be altered.");
  }

  const allowed = VALID_REWARD_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new HttpError(
      400,
      `Invalid reward transition from '${fromState}' to '${toState}'.`
    );
  }
}

/**
 * Calculates the resulting reward state upon dual confirmation.
 * Returns COMPLETED only when both owner payment report AND finder confirmation exist.
 */
export function computeRewardDualConfirmationState(
  ownerReported: boolean,
  finderConfirmed: boolean,
  currentState: RewardState
): RewardState {
  if (ownerReported && finderConfirmed) {
    return "COMPLETED";
  }
  if (ownerReported && !finderConfirmed) {
    return "PAYMENT_SELF_REPORTED";
  }
  return currentState;
}
