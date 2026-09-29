/**
 * KHOJ — Phase 9: Optional ₹20 Thank-You Reward Types
 * Strict typing for the optional post-return gratitude flow.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * - Verification proves ownership.
 * - Handover proves return.
 * - Reward is completely OPTIONAL and strictly post-return.
 * - KHOJ NEVER processes, holds, guarantees, or escrows money.
 */

export type RewardState =
  | 'NOT_OFFERED'
  | 'SKIPPED'
  | 'WAITING_FOR_UPI'
  | 'UPI_PROVIDED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SELF_REPORTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'MANUAL_REVIEW';

export type RewardActorRole = 'owner' | 'finder' | 'staff' | 'system';

export interface RewardRecord {
  id: string;
  reportId: string;
  recoveryCaseId?: string | null;
  ownerId: string;
  finderReference: string;
  amountInr: number; // Always 20
  state: RewardState;
  finderUpiId: string;
  ownerPaymentReportedAt?: string | null;
  finderPaymentConfirmedAt?: string | null;
  completedAt?: string | null;
  cancellationReason?: string;
  disputeReason?: string;
  createdAt: string;
  updatedAt: string;
  workflowVersion: string;
}

export interface RewardEvent {
  id: string;
  rewardId: string;
  reportId: string;
  actorId: string;
  actorRole: RewardActorRole;
  eventType: string;
  fromState: RewardState;
  toState: RewardState;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Privacy-safe view returned to the client.
 * Strictly shields UPI ID from public access, candidate pages, and unrelated accounts.
 * Finder UPI is exposed ONLY to the verified owner after item is RETURNED and finder provided UPI.
 */
export interface ClientRewardView {
  id: string;
  reportId: string;
  amountInr: number;
  state: RewardState;
  isEligibleForReward: boolean;
  isOwner: boolean;
  isFinder: boolean;
  finderUpiId: string | null;
  upiPaymentUri: string | null;
  ownerPaymentReported: boolean;
  finderPaymentConfirmed: boolean;
  disclaimer: string;
}
