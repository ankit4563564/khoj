/**
 * KHOJ — Phase 8: Custody & Handover Workflow Types
 * Strict typing for the recovery state machine, campus handover arrangements, dual-confirmation, and audit logs.
 */

export type RecoveryState =
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'RECOVERY_PENDING'
  | 'HANDOVER_PROPOSED'
  | 'HANDOVER_ACCEPTED'
  | 'HANDOVER_IN_PROGRESS'
  | 'OWNER_CONFIRMED'
  | 'FINDER_CONFIRMED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'MANUAL_REVIEW';

export type HandoverActorRole = 'owner' | 'finder' | 'staff' | 'system';

export interface HandoverProposal {
  location: string;
  date: string;
  timeWindow: string;
  note?: string;
}

export interface RecoveryCase {
  reportId: string;
  ownerId: string;
  finderId: string;
  candidateMatchId?: string | null;
  state: RecoveryState;
  ownerConfirmed: boolean;
  finderConfirmed: boolean;
  point: string;
  proposedLocation: string;
  proposedDate: string;
  proposedTimeWindow: string;
  proposedBy: 'owner' | 'finder';
  ownerConfirmedAt?: string | null;
  finderConfirmedAt?: string | null;
  returnedAt?: string | null;
  finderActionToken: string;
  tokenExpiresAt?: string | null;
  issueReason?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  workflowVersion: string;
}

/**
 * Privacy-safe view returned to the client.
 * Strictly avoids leaking owner or finder personal contacts, email, phone, or private clues.
 */
export interface ClientRecoveryView {
  reportId: string;
  itemTitle: string;
  state: RecoveryState;
  location: string;
  date: string;
  timeWindow: string;
  isOwner: boolean;
  isFinder: boolean;
  ownerConfirmed: boolean;
  finderConfirmed: boolean;
  returnedAt?: string | null;
  proposedBy: 'owner' | 'finder';
  canConfirm: boolean;
  canPropose: boolean;
  canAccept: boolean;
  canCancel: boolean;
  issueReported: boolean;
  message: string;
}

/**
 * Immutable audit trail event for recovery transitions.
 */
export interface RecoveryEvent {
  id: string;
  reportId: string;
  candidateMatchId?: string | null;
  actorId: string;
  actorRole: HandoverActorRole;
  eventType: string;
  fromState: RecoveryState;
  toState: RecoveryState;
  metadata: Record<string, unknown>;
  createdAt: string;
}
