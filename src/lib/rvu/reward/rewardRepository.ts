/**
 * KHOJ — Phase 9: Reward Repository
 * Manages database persistence for optional thank-you rewards and audit logs.
 */

import { id, now, one, all, run } from "@/lib/rvu/db";
import type { RewardEvent, RewardRecord } from "./rewardTypes";

interface RawRewardRow {
  id: string;
  reportId: string;
  recoveryCaseId: string | null;
  ownerId: string;
  finderReference: string;
  amountInr: number;
  state: string;
  finderUpiId: string;
  ownerPaymentReportedAt: string | null;
  finderPaymentConfirmedAt: string | null;
  completedAt: string | null;
  cancellationReason: string;
  disputeReason: string;
  createdAt: string;
  updatedAt: string;
  workflowVersion: string;
}

function parseRewardRow(row: RawRewardRow): RewardRecord {
  return {
    id: row.id,
    reportId: row.reportId,
    recoveryCaseId: row.recoveryCaseId,
    ownerId: row.ownerId,
    finderReference: row.finderReference,
    amountInr: Number(row.amountInr) || 20,
    state: row.state as RewardRecord["state"],
    finderUpiId: row.finderUpiId || "",
    ownerPaymentReportedAt: row.ownerPaymentReportedAt,
    finderPaymentConfirmedAt: row.finderPaymentConfirmedAt,
    completedAt: row.completedAt,
    cancellationReason: row.cancellationReason || "",
    disputeReason: row.disputeReason || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    workflowVersion: row.workflowVersion || "v1",
  };
}

export async function getRewardByReportId(reportId: string): Promise<RewardRecord | null> {
  const row = one<RawRewardRow>("SELECT * FROM rewards WHERE reportId=?", reportId);
  return row ? parseRewardRow(row) : null;
}

export async function getRewardById(idStr: string): Promise<RewardRecord | null> {
  const row = one<RawRewardRow>("SELECT * FROM rewards WHERE id=?", idStr);
  return row ? parseRewardRow(row) : null;
}

export async function createRewardRecord(
  data: Omit<RewardRecord, "id" | "createdAt" | "updatedAt">
): Promise<RewardRecord> {
  const rewardId = id("rew");
  const ts = now();

  run(
    `INSERT INTO rewards (
      id, reportId, recoveryCaseId, ownerId, finderReference,
      amountInr, state, finderUpiId, ownerPaymentReportedAt,
      finderPaymentConfirmedAt, completedAt, cancellationReason,
      disputeReason, createdAt, updatedAt, workflowVersion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    rewardId,
    data.reportId,
    data.recoveryCaseId || null,
    data.ownerId,
    data.finderReference,
    data.amountInr || 20,
    data.state || "NOT_OFFERED",
    data.finderUpiId || "",
    data.ownerPaymentReportedAt || null,
    data.finderPaymentConfirmedAt || null,
    data.completedAt || null,
    data.cancellationReason || "",
    data.disputeReason || "",
    ts,
    ts,
    data.workflowVersion || "v1"
  );

  const created = await getRewardByReportId(data.reportId);
  if (!created) {
    throw new Error("Failed to create reward record.");
  }
  return created;
}

export async function updateRewardRecord(
  reportId: string,
  updates: Partial<RewardRecord>
): Promise<RewardRecord> {
  const existing = await getRewardByReportId(reportId);
  if (!existing) {
    throw new Error(`Reward record not found for report: ${reportId}`);
  }

  const merged: RewardRecord = {
    ...existing,
    ...updates,
    updatedAt: now(),
  };

  run(
    `UPDATE rewards SET
      state = ?,
      finderUpiId = ?,
      ownerPaymentReportedAt = ?,
      finderPaymentConfirmedAt = ?,
      completedAt = ?,
      cancellationReason = ?,
      disputeReason = ?,
      updatedAt = ?
    WHERE reportId = ?`,
    merged.state,
    merged.finderUpiId,
    merged.ownerPaymentReportedAt || null,
    merged.finderPaymentConfirmedAt || null,
    merged.completedAt || null,
    merged.cancellationReason || "",
    merged.disputeReason || "",
    merged.updatedAt,
    reportId
  );

  return merged;
}

export async function recordRewardEvent(
  event: Omit<RewardEvent, "id" | "createdAt">
): Promise<RewardEvent> {
  const eventId = id("rewevt");
  const ts = now();

  run(
    `INSERT INTO reward_events (
      id, rewardId, reportId, actorId, actorRole,
      eventType, fromState, toState, metadata, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    eventId,
    event.rewardId,
    event.reportId,
    event.actorId,
    event.actorRole,
    event.eventType,
    event.fromState,
    event.toState,
    JSON.stringify(event.metadata || {}),
    ts
  );

  return {
    ...event,
    id: eventId,
    createdAt: ts,
  };
}

export async function getRewardEvents(reportId: string): Promise<RewardEvent[]> {
  interface RawEventRow {
    id: string;
    rewardId: string;
    reportId: string;
    actorId: string;
    actorRole: string;
    eventType: string;
    fromState: string;
    toState: string;
    metadata: string;
    createdAt: string;
  }

  const rows = all<RawEventRow>(
    "SELECT * FROM reward_events WHERE reportId=? ORDER BY createdAt ASC",
    reportId
  );

  return rows.map((r) => ({
    id: r.id,
    rewardId: r.rewardId,
    reportId: r.reportId,
    actorId: r.actorId,
    actorRole: r.actorRole as RewardEvent["actorRole"],
    eventType: r.eventType,
    fromState: r.fromState as RewardEvent["fromState"],
    toState: r.toState as RewardEvent["toState"],
    metadata: JSON.parse(r.metadata || "{}"),
    createdAt: r.createdAt,
  }));
}
