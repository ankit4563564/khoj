/**
 * KHOJ — Phase 10: User Usability Feedback Service
 * Collects non-reputational post-recovery feedback to identify friction in the workflow.
 */

import { id, now, one, all, run } from "@/lib/rvu/db";
import { HttpError } from "@/lib/rvu/auth";
import type { RecoveryFeedback } from "./funnelTypes";

interface RawFeedbackRow {
  id: string;
  reportId: string;
  userId: string;
  actorRole: string;
  easyRating: string;
  confusionNote: string;
  createdAt: string;
}

function parseFeedbackRow(row: RawFeedbackRow): RecoveryFeedback {
  return {
    id: row.id,
    reportId: row.reportId,
    userId: row.userId,
    actorRole: row.actorRole as RecoveryFeedback["actorRole"],
    easyRating: row.easyRating as RecoveryFeedback["easyRating"],
    confusionNote: row.confusionNote || "",
    createdAt: row.createdAt,
  };
}

export async function submitRecoveryFeedback(
  reportId: string,
  userId: string,
  actorRole: "owner" | "finder",
  easyRating: "yes" | "mostly" | "no",
  confusionNote = ""
): Promise<RecoveryFeedback> {
  if (!userId) {
    throw new HttpError(401, "Authentication required to submit feedback.");
  }

  // Validate report exists and is RETURNED
  const handover = await one<{ state: string }>('SELECT state FROM handovers WHERE "reportId"=?', reportId);
  if (!handover || handover.state !== "RETURNED") {
    throw new HttpError(400, "Feedback can only be submitted for completed returns.");
  }

  if (!["yes", "mostly", "no"].includes(easyRating)) {
    throw new HttpError(400, "Invalid rating. Must be 'yes', 'mostly', or 'no'.");
  }

  const cleanNote = (confusionNote || "").trim().slice(0, 1000);
  const feedbackId = id("fb");
  const ts = now();

  await run(
    `INSERT INTO recovery_feedback (id, "reportId", "userId", "actorRole", "easyRating", "confusionNote", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    feedbackId,
    reportId,
    userId,
    actorRole,
    easyRating,
    cleanNote,
    ts
  );

  return {
    id: feedbackId,
    reportId,
    userId,
    actorRole,
    easyRating,
    confusionNote: cleanNote,
    createdAt: ts,
  };
}

export async function getFeedbackForReport(reportId: string): Promise<RecoveryFeedback[]> {
  const rows = await all<RawFeedbackRow>('SELECT * FROM recovery_feedback WHERE "reportId"=?', reportId);
  return rows.map(parseFeedbackRow);
}

export async function listFeedbackSummary() {
  const rows = await all<RawFeedbackRow>("SELECT * FROM recovery_feedback");
  const total = rows.length;
  if (total === 0) {
    return {
      totalFeedback: 0,
      easyYesPct: 0,
      easyMostlyPct: 0,
      easyNoPct: 0,
      recentNotes: [],
    };
  }

  const yesCount = rows.filter((r) => r.easyRating === "yes").length;
  const mostlyCount = rows.filter((r) => r.easyRating === "mostly").length;
  const noCount = rows.filter((r) => r.easyRating === "no").length;

  return {
    totalFeedback: total,
    easyYesPct: Math.round((yesCount / total) * 100),
    easyMostlyPct: Math.round((mostlyCount / total) * 100),
    easyNoPct: Math.round((noCount / total) * 100),
    recentNotes: rows
      .filter((r) => r.confusionNote)
      .slice(-10)
      .map((r) => r.confusionNote),
  };
}
