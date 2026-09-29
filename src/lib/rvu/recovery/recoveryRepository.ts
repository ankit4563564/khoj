/**
 * KHOJ — Phase 8: Recovery Repository
 * Persistent storage operations for handovers and recovery event audit logs.
 */

import { randomUUID } from "node:crypto";
import { id, now, one, all, run, transaction } from "@/lib/rvu/db";
import type { RecoveryCase, RecoveryEvent, RecoveryState, HandoverActorRole } from "./recoveryTypes";
import { RECOVERY_CONFIG } from "./recoveryConfig";

interface RawHandoverRow {
  reportId: string;
  ownerId: string;
  finderId: string;
  candidateMatchId: string | null;
  state: string;
  ownerConfirmed: number | boolean;
  finderConfirmed: number | boolean;
  point: string;
  proposedLocation: string;
  proposedDate: string;
  proposedTimeWindow: string;
  proposedBy: string;
  ownerConfirmedAt: string | null;
  finderConfirmedAt: string | null;
  returnedAt: string | null;
  finderActionToken: string;
  tokenExpiresAt: string | null;
  issueReason: string;
  cancellationReason: string;
  createdAt: string;
  updatedAt: string;
  workflowVersion: string;
}

function parseHandoverRow(row: RawHandoverRow): RecoveryCase {
  return {
    reportId: row.reportId,
    ownerId: row.ownerId,
    finderId: row.finderId,
    candidateMatchId: row.candidateMatchId,
    state: (row.state || "RECOVERY_PENDING") as RecoveryState,
    ownerConfirmed: Boolean(row.ownerConfirmed),
    finderConfirmed: Boolean(row.finderConfirmed),
    point: row.point || row.proposedLocation || RECOVERY_CONFIG.DEFAULT_LOCATION,
    proposedLocation: row.proposedLocation || row.point || RECOVERY_CONFIG.DEFAULT_LOCATION,
    proposedDate: row.proposedDate || "",
    proposedTimeWindow: row.proposedTimeWindow || "",
    proposedBy: (row.proposedBy || "owner") as "owner" | "finder",
    ownerConfirmedAt: row.ownerConfirmedAt,
    finderConfirmedAt: row.finderConfirmedAt,
    returnedAt: row.returnedAt,
    finderActionToken: row.finderActionToken || "",
    tokenExpiresAt: row.tokenExpiresAt,
    issueReason: row.issueReason || undefined,
    cancellationReason: row.cancellationReason || undefined,
    createdAt: row.createdAt || row.updatedAt || now(),
    updatedAt: row.updatedAt || now(),
    workflowVersion: row.workflowVersion || RECOVERY_CONFIG.WORKFLOW_VERSION,
  };
}

/**
 * Creates or initializes a new RecoveryCase for a verified candidate.
 */
export async function createRecoveryCase(
  reportId: string,
  ownerId: string,
  finderId: string,
  candidateMatchId?: string | null,
  initialLocation = RECOVERY_CONFIG.DEFAULT_LOCATION
): Promise<RecoveryCase> {
  const timestamp = now();
  const token = `fat-${randomUUID().replaceAll("-", "")}`;
  const tokenExpiry = new Date(Date.now() + RECOVERY_CONFIG.ACTION_TOKEN_EXPIRY_MS).toISOString();

  transaction(() => {
    run(
      `INSERT INTO handovers (
        reportId, ownerId, finderId, candidateMatchId, state,
        ownerConfirmed, finderConfirmed, point, proposedLocation,
        proposedDate, proposedTimeWindow, proposedBy,
        finderActionToken, tokenExpiresAt, createdAt, updatedAt, workflowVersion
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(reportId) DO UPDATE SET
        ownerId=excluded.ownerId,
        candidateMatchId=COALESCE(excluded.candidateMatchId, handovers.candidateMatchId),
        updatedAt=excluded.updatedAt`,
      reportId,
      ownerId,
      finderId,
      candidateMatchId || null,
      "RECOVERY_PENDING",
      0,
      0,
      initialLocation,
      initialLocation,
      "",
      "",
      "owner",
      token,
      tokenExpiry,
      timestamp,
      timestamp,
      RECOVERY_CONFIG.WORKFLOW_VERSION
    );
  });

  const row = one<RawHandoverRow>("SELECT * FROM handovers WHERE reportId=?", reportId);
  if (!row) throw new Error("Failed to create recovery case record.");
  return parseHandoverRow(row);
}

/**
 * Retrieves a recovery case by found report ID.
 */
export async function getRecoveryCaseByReportId(reportId: string): Promise<RecoveryCase | null> {
  const row = one<RawHandoverRow>("SELECT * FROM handovers WHERE reportId=?", reportId);
  return row ? parseHandoverRow(row) : null;
}

/**
 * Retrieves a recovery case by candidate match ID.
 */
export async function getRecoveryCaseByCandidateId(candidateMatchId: string): Promise<RecoveryCase | null> {
  const row = one<RawHandoverRow>("SELECT * FROM handovers WHERE candidateMatchId=?", candidateMatchId);
  return row ? parseHandoverRow(row) : null;
}

/**
 * Retrieves a recovery case by unguessable finder action token.
 */
export async function getRecoveryCaseByActionToken(token: string): Promise<RecoveryCase | null> {
  if (!token || typeof token !== "string" || token.trim().length < 10) return null;
  const row = one<RawHandoverRow>("SELECT * FROM handovers WHERE finderActionToken=?", token.trim());
  return row ? parseHandoverRow(row) : null;
}

/**
 * Updates a recovery case and timestamps the transition.
 */
export async function updateRecoveryCase(
  reportId: string,
  updates: Partial<RecoveryCase>
): Promise<RecoveryCase> {
  const timestamp = now();

  transaction(() => {
    run(
      `UPDATE handovers SET
        state=COALESCE(?, state),
        point=COALESCE(?, point),
        proposedLocation=COALESCE(?, proposedLocation),
        proposedDate=COALESCE(?, proposedDate),
        proposedTimeWindow=COALESCE(?, proposedTimeWindow),
        proposedBy=COALESCE(?, proposedBy),
        ownerConfirmed=COALESCE(?, ownerConfirmed),
        finderConfirmed=COALESCE(?, finderConfirmed),
        ownerConfirmedAt=COALESCE(?, ownerConfirmedAt),
        finderConfirmedAt=COALESCE(?, finderConfirmedAt),
        returnedAt=COALESCE(?, returnedAt),
        issueReason=COALESCE(?, issueReason),
        cancellationReason=COALESCE(?, cancellationReason),
        updatedAt=?
      WHERE reportId=?`,
      updates.state ?? null,
      updates.point ?? updates.proposedLocation ?? null,
      updates.proposedLocation ?? updates.point ?? null,
      updates.proposedDate ?? null,
      updates.proposedTimeWindow ?? null,
      updates.proposedBy ?? null,
      updates.ownerConfirmed !== undefined ? (updates.ownerConfirmed ? 1 : 0) : null,
      updates.finderConfirmed !== undefined ? (updates.finderConfirmed ? 1 : 0) : null,
      updates.ownerConfirmedAt ?? null,
      updates.finderConfirmedAt ?? null,
      updates.returnedAt ?? null,
      updates.issueReason ?? null,
      updates.cancellationReason ?? null,
      timestamp,
      reportId
    );
  });

  const row = one<RawHandoverRow>("SELECT * FROM handovers WHERE reportId=?", reportId);
  if (!row) throw new Error(`Recovery case #${reportId} not found.`);
  return parseHandoverRow(row);
}

/**
 * Records an immutable audit log entry in recovery_events.
 */
export async function recordRecoveryEvent(
  reportId: string,
  candidateMatchId: string | null | undefined,
  actorId: string,
  actorRole: HandoverActorRole,
  eventType: string,
  fromState: RecoveryState,
  toState: RecoveryState,
  metadata: Record<string, unknown> = {}
): Promise<RecoveryEvent> {
  const eventId = `revt-${id("").slice(0, 16)}`;
  const timestamp = now();

  transaction(() => {
    run(
      `INSERT INTO recovery_events (
        id, reportId, candidateMatchId, actorId, actorRole,
        eventType, fromState, toState, metadata, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      eventId,
      reportId,
      candidateMatchId || null,
      actorId,
      actorRole,
      eventType,
      fromState,
      toState,
      JSON.stringify(metadata),
      timestamp
    );
  });

  return {
    id: eventId,
    reportId,
    candidateMatchId: candidateMatchId || null,
    actorId,
    actorRole,
    eventType,
    fromState,
    toState,
    metadata,
    createdAt: timestamp,
  };
}

/**
 * Lists recovery events for a given report.
 */
export async function listRecoveryEvents(reportId: string): Promise<RecoveryEvent[]> {
  const rows = all<any>(
    "SELECT * FROM recovery_events WHERE reportId=? ORDER BY createdAt ASC",
    reportId
  );
  return rows.map((r) => ({
    id: r.id,
    reportId: r.reportId,
    candidateMatchId: r.candidateMatchId,
    actorId: r.actorId,
    actorRole: r.actorRole as HandoverActorRole,
    eventType: r.eventType,
    fromState: r.fromState as RecoveryState,
    toState: r.toState as RecoveryState,
    metadata: JSON.parse(r.metadata || "{}"),
    createdAt: r.createdAt,
  }));
}
