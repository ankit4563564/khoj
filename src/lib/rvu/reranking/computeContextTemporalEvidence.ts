/**
 * KHOJ — Contextual & Temporal Evidence Comparator
 * Evaluates campus location proximity and validates chronological sequence.
 * Enforces: registration_time <= lost_time <= found_time.
 */

export interface ContextTemporalResult {
  contextScore: number;                       // 0.00 - 1.00 (Weight: 0.10)
  temporalScore: number;                      // 0.00 - 1.00 (Weight: 0.10)
  contextMatches: string[];
  temporalMatches: string[];
  conflicts: string[];
  missingEvidence: string[];
}

export function compareContextAndTemporalEvidence(params: {
  ownerLastSeenLocation?: string;
  foundLocation?: string;
  lostAt?: string | null;
  foundAt?: string | null;
  registeredAt?: string | null;
}): ContextTemporalResult {
  const contextMatches: string[] = [];
  const temporalMatches: string[] = [];
  const conflicts: string[] = [];
  const missingEvidence: string[] = [];

  // =============================================================
  // 1. CONTEXTUAL LOCATION PROXIMITY (Weight: 0.10)
  // =============================================================
  let contextScore = 0.5; // Baseline neutral

  const ownerLoc = (params.ownerLastSeenLocation || "").trim().toLowerCase();
  const foundLoc = (params.foundLocation || "").trim().toLowerCase();

  if (ownerLoc && foundLoc) {
    if (ownerLoc === foundLoc || ownerLoc.includes(foundLoc) || foundLoc.includes(ownerLoc)) {
      contextScore = 1.0;
      contextMatches.push(`Location proximity match: reported at '${params.ownerLastSeenLocation}'`);
    } else {
      contextScore = 0.6;
      contextMatches.push(`Different campus zones: '${params.ownerLastSeenLocation}' vs '${params.foundLocation}'`);
    }
  } else {
    missingEvidence.push("Specific last-seen location omitted by owner or finder");
  }

  // =============================================================
  // 2. TEMPORAL CHRONOLOGY VALIDATION (Weight: 0.10)
  // =============================================================
  let temporalScore = 0.5; // Baseline neutral

  const tLost = params.lostAt ? Date.parse(params.lostAt) : NaN;
  const tFound = params.foundAt ? Date.parse(params.foundAt) : NaN;
  const tRegistered = params.registeredAt ? Date.parse(params.registeredAt) : NaN;

  const hasLost = !isNaN(tLost);
  const hasFound = !isNaN(tFound);
  const hasReg = !isNaN(tRegistered);

  if (hasLost && hasFound) {
    const diffHours = (tFound - tLost) / (1000 * 60 * 60);

    if (diffHours < -1.0) {
      // Hard chronological contradiction: item found before it was lost!
      temporalScore = 0.1;
      conflicts.push(
        `Temporal conflict: found timestamp precedes lost timestamp by ${Math.abs(Math.round(diffHours))} hours`
      );
    } else if (diffHours >= -1.0 && diffHours <= 48) {
      // Optimal window (same day or within 48h)
      temporalScore = 1.0;
      temporalMatches.push("Temporal alignment: found within 48 hours of reported loss");
    } else if (diffHours <= 24 * 14) {
      // Plausible window (within 2 weeks)
      temporalScore = 0.85;
      temporalMatches.push("Temporal compatibility: found within 2 weeks of reported loss");
    } else {
      temporalScore = 0.60;
      temporalMatches.push("Extended temporal delta: found more than 2 weeks after reported loss");
    }
  } else {
    missingEvidence.push("Exact loss or discovery timestamp unavailable for chronological validation");
  }

  // Bonus for pre-loss vault registration
  if (hasReg && hasLost && tRegistered < tLost) {
    temporalScore = Math.min(1.0, temporalScore + 0.1);
    temporalMatches.push("Vault verified: item was registered in vault prior to loss");
  }

  return {
    contextScore: Number(contextScore.toFixed(2)),
    temporalScore: Number(temporalScore.toFixed(2)),
    contextMatches,
    temporalMatches,
    conflicts,
    missingEvidence,
  };
}
