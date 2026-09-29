/**
 * KHOJ — Phase 10: Funnel Tracker
 * Records pipeline events and computes true recovery funnel metrics.
 * 
 * CORE FUNNEL:
 * FOUND_REPORT -> FINGERPRINT -> RETRIEVAL -> CANDIDATE -> VERIFICATION -> VERIFIED -> HANDOVER -> RETURNED
 */

import { id, now, one, all, run } from "@/lib/rvu/db";
import type { FunnelMetrics, PipelineEvent, PipelineStage, PipelineStatus } from "./funnelTypes";

interface RawPipelineRow {
  id: string;
  reportId: string;
  stage: string;
  status: string;
  stageDurationMs: number;
  metadata: string;
  createdAt: string;
}

function parsePipelineRow(row: RawPipelineRow): PipelineEvent {
  return {
    id: row.id,
    reportId: row.reportId,
    stage: row.stage as PipelineStage,
    status: row.status as PipelineStatus,
    stageDurationMs: Number(row.stageDurationMs) || 0,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.createdAt,
  };
}

/**
 * Records an immutable pipeline event for measuring the recovery funnel.
 */
export async function recordPipelineStage(
  reportId: string,
  stage: PipelineStage,
  status: PipelineStatus,
  stageDurationMs = 0,
  metadata: Record<string, unknown> = {}
): Promise<PipelineEvent> {
  const eventId = id("pipe");
  const ts = now();

  // Strip any accidental PII from metadata
  const safeMeta = { ...metadata };
  delete (safeMeta as any).phone;
  delete (safeMeta as any).email;
  delete (safeMeta as any).password;
  delete (safeMeta as any).token;
  delete (safeMeta as any).upi;

  run(
    `INSERT INTO pipeline_events (id, reportId, stage, status, stageDurationMs, metadata, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    eventId,
    reportId,
    stage,
    status,
    stageDurationMs,
    JSON.stringify(safeMeta),
    ts
  );

  return {
    id: eventId,
    reportId,
    stage,
    status,
    stageDurationMs,
    metadata: safeMeta,
    createdAt: ts,
  };
}

/**
 * Retrieves all pipeline events for a specific found report.
 */
export async function getPipelineEvents(reportId: string): Promise<PipelineEvent[]> {
  const rows = all<RawPipelineRow>(
    "SELECT * FROM pipeline_events WHERE reportId=? ORDER BY createdAt ASC",
    reportId
  );
  return rows.map(parsePipelineRow);
}

/**
 * Calculates real funnel conversion metrics across the system.
 */
export async function computeFunnelMetrics(): Promise<FunnelMetrics> {
  // Counts from database tables to calculate real-world funnel rates
  const foundRow = one<{ count: number }>("SELECT count(*) as count FROM reports WHERE kind='found'");
  const foundCount = foundRow?.count || 0;

  const fpRow = one<{ count: number }>("SELECT count(DISTINCT foundReportId) as count FROM found_fingerprints");
  const fingerprintCount = fpRow?.count || 0;

  const candRow = one<{ count: number }>("SELECT count(DISTINCT foundReportId) as count FROM candidate_matches");
  const candidateCount = candRow?.count || 0;

  const verifStartRow = one<{ count: number }>("SELECT count(DISTINCT foundReportId) as count FROM verification_sessions");
  const verificationStartedCount = verifStartRow?.count || 0;

  const verifiedRow = one<{ count: number }>(
    "SELECT count(DISTINCT foundReportId) as count FROM verification_sessions WHERE state='VERIFIED'"
  );
  const verifiedCount = verifiedRow?.count || 0;

  const handoverRow = one<{ count: number }>("SELECT count(*) as count FROM handovers");
  const handoverCount = handoverRow?.count || 0;

  const returnedRow = one<{ count: number }>(
    "SELECT count(*) as count FROM handovers WHERE state='RETURNED' AND ownerConfirmed=1 AND finderConfirmed=1"
  );
  const returnedCount = returnedRow?.count || 0;

  const rewardOfferedRow = one<{ count: number }>(
    "SELECT count(*) as count FROM rewards WHERE state != 'NOT_OFFERED'"
  );
  const rewardOfferedCount = rewardOfferedRow?.count || 0;

  const rewardCompRow = one<{ count: number }>(
    "SELECT count(*) as count FROM rewards WHERE state='COMPLETED'"
  );
  const rewardCompletedCount = rewardCompRow?.count || 0;

  const rewardSkipRow = one<{ count: number }>(
    "SELECT count(*) as count FROM rewards WHERE state='SKIPPED'"
  );
  const rewardSkippedCount = rewardSkipRow?.count || 0;

  const safeRate = (num: number, den: number): number => {
    if (!den || den === 0) return 0;
    return Math.round((num / den) * 1000) / 1000;
  };

  return {
    foundCount,
    fingerprintCount,
    candidateCount,
    verificationStartedCount,
    verifiedCount,
    handoverCount,
    returnedCount,
    rewardOfferedCount,
    rewardCompletedCount,
    rewardSkippedCount,
    rates: {
      foundToFingerprintRate: safeRate(fingerprintCount, foundCount),
      fingerprintToCandidateRate: safeRate(candidateCount, fingerprintCount),
      candidateToVerificationRate: safeRate(verificationStartedCount, candidateCount),
      verificationSuccessRate: safeRate(verifiedCount, verificationStartedCount),
      verifiedToHandoverRate: safeRate(handoverCount, verifiedCount),
      handoverToReturnedRate: safeRate(returnedCount, handoverCount),
      successfulRecoveryRate: safeRate(returnedCount, foundCount),
    },
  };
}
