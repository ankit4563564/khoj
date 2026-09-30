/**
 * KHOJ — Phase 10: Operational Staff Operations & Manual Fallback Service
 * Provides authorized staff with actionable operational controls and manual fallback queries.
 */

import { one, all } from "@/lib/rvu/db";
import { HttpError } from "@/lib/rvu/auth";
import type { Report } from "@/lib/rvu/types";
import { computeFunnelMetrics } from "./funnelTracker";
import type { OperationalStaffOverview } from "./funnelTypes";

export async function getOperationalStaffOverview(staffUserId: string): Promise<OperationalStaffOverview> {
  if (!staffUserId) throw new HttpError(401, "Staff authentication required.");
  const user = await one<{ role: string }>("SELECT role FROM users WHERE id=?", staffUserId);
  if (user?.role !== "staff") throw new HttpError(403, "Staff privileges required.");

  const unresolvedFound = await one<{ count: number }>(
    "SELECT count(*) as count FROM reports WHERE kind='found' AND status NOT IN ('returned', 'closed')"
  );

  const ambiguous = await one<{ count: number }>(
    'SELECT count(*) as count FROM candidate_matches WHERE "confidenceTier"=\'ambiguous\' OR status=\'requires_manual_review\''
  );

  const verifReview = await one<{ count: number }>(
    "SELECT count(*) as count FROM verification_sessions WHERE state='REQUIRES_MANUAL_REVIEW'"
  );

  const disputedHandovers = await one<{ count: number }>(
    "SELECT count(*) as count FROM handovers WHERE state='MANUAL_REVIEW'"
  );

  const disputedRewards = await one<{ count: number }>(
    "SELECT count(*) as count FROM rewards WHERE state='MANUAL_REVIEW'"
  );

  const failedProcessing = await one<{ count: number }>(
    "SELECT count(*) as count FROM fingerprint_embeddings WHERE status='failed'"
  );

  const recentDisputes = await all<{
    reportId: string;
    itemTitle: string;
    disputeType: string;
    reason: string;
    createdAt: string;
  }>(
    `SELECT h."reportId", r.title as "itemTitle", 'handover' as "disputeType", h."issueReason" as reason, h."updatedAt" as "createdAt"
     FROM handovers h JOIN reports r ON h."reportId" = r.id
     WHERE h.state = 'MANUAL_REVIEW'
     UNION ALL
     SELECT rw."reportId", r.title as "itemTitle", 'reward' as "disputeType", rw."disputeReason" as reason, rw."updatedAt" as "createdAt"
     FROM rewards rw JOIN reports r ON rw."reportId" = r.id
     WHERE rw.state = 'MANUAL_REVIEW'
     ORDER BY "createdAt" DESC LIMIT 10`
  );

  const funnel = await computeFunnelMetrics();

  return {
    unresolvedFoundCount: Number(unresolvedFound?.count) || 0,
    ambiguousCandidateCount: Number(ambiguous?.count) || 0,
    verificationReviewQueueCount: Number(verifReview?.count) || 0,
    disputedHandoverCount: Number(disputedHandovers?.count) || 0,
    disputedRewardCount: Number(disputedRewards?.count) || 0,
    failedProcessingCount: Number(failedProcessing?.count) || 0,
    funnel,
    recentDisputes,
  };
}

/**
 * Manual fallback search allowing staff to find candidate matches using traditional
 * structured attributes when AI/embeddings are degraded or unavailable.
 */
export async function manualFallbackFilter(filters: {
  category?: string;
  brand?: string;
  color?: string;
  location?: string;
  status?: string;
  kind?: "lost" | "found";
}): Promise<Report[]> {
  const conditions: string[] = ["1=1"];
  const params: any[] = [];

  if (filters.kind) {
    conditions.push("kind = ?");
    params.push(filters.kind);
  }
  if (filters.category) {
    conditions.push("LOWER(category) = LOWER(?)");
    params.push(filters.category.trim());
  }
  if (filters.brand) {
    conditions.push("LOWER(brand) LIKE LOWER(?)");
    params.push(`%${filters.brand.trim()}%`);
  }
  if (filters.color) {
    conditions.push("LOWER(color) LIKE LOWER(?)");
    params.push(`%${filters.color.trim()}%`);
  }
  if (filters.location) {
    conditions.push("LOWER(location) LIKE LOWER(?)");
    params.push(`%${filters.location.trim()}%`);
  }
  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }

  const sql = `SELECT * FROM reports WHERE ${conditions.join(" AND ")} ORDER BY "createdAt" DESC LIMIT 50`;
  return all<Report>(sql, ...params);
}
