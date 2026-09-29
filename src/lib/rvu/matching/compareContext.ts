/**
 * KHOJ — Contextual Evidence Comparison
 * Evaluates campus location compatibility, temporal sequence, and registration timing.
 *
 * CRITICAL PRODUCT PRINCIPLES:
 * 1. CONTEXT IS SUPPORTING EVIDENCE: Location/time increases or decreases plausibility.
 * 2. CONTEXT NEVER PROVES OWNERSHIP ALONE.
 * 3. TEMPORAL IMPOSSIBILITY IS A CONFLICT: An item found BEFORE it was lost is flagged.
 */

export interface ContextComparison {
  locationScore: number; // 0.0 to 1.0 (Component weight: 0.15 combined with time)
  timeScore: number; // 0.0 to 1.0
  combinedLocationTimeScore: number; // 0.0 to 1.0
  registrationTimingScore: number; // 0.0 to 1.0 (Component weight: 0.10)
  contextMatches: string[];
  conflicts: string[];
  missingEvidence: string[];
}

export function compareContext(params: {
  ownerLocation?: string | null;
  foundLocation?: string | null;
  ownerLostDate?: string | null;
  foundDate?: string | null;
  itemCreatedAt?: string | null;
  foundCreatedAt?: string | null;
}): ContextComparison {
  const contextMatches: string[] = [];
  const conflicts: string[] = [];
  const missingEvidence: string[] = [];

  // 1. Location Compatibility
  const locA = (params.ownerLocation || "").trim().toLowerCase();
  const locB = (params.foundLocation || "").trim().toLowerCase();

  let locationScore = 0.50;

  if (locA && locB) {
    if (locA === locB) {
      locationScore = 1.0;
      contextMatches.push(`Location exact match: ${params.ownerLocation}`);
    } else if (locA.includes(locB) || locB.includes(locA)) {
      locationScore = 0.85;
      contextMatches.push(`Location proximity match: "${params.ownerLocation}" ~ "${params.foundLocation}"`);
    } else {
      // Both on campus, different zones
      locationScore = 0.40;
      missingEvidence.push(`Different campus zones: reported "${params.ownerLocation}", found at "${params.foundLocation}"`);
    }
  } else {
    locationScore = 0.50;
    missingEvidence.push("Location comparison limited: location omitted on one report");
  }

  // 2. Temporal Compatibility (Lost date vs Found date)
  let timeScore = 0.50;
  const lostDateStr = params.ownerLostDate || "";
  const foundDateStr = params.foundDate || "";

  if (lostDateStr && foundDateStr) {
    const lostMs = Date.parse(lostDateStr);
    const foundMs = Date.parse(foundDateStr);

    if (!isNaN(lostMs) && !isNaN(foundMs)) {
      const diffDays = Math.round((foundMs - lostMs) / (1000 * 3600 * 24));

      if (diffDays < -1) {
        // Temporal conflict: Found significantly BEFORE the owner claims to have lost it
        timeScore = 0.10;
        conflicts.push(`Temporal conflict: item found on ${foundDateStr.slice(0, 10)}, but owner claims lost on ${lostDateStr.slice(0, 10)}`);
      } else if (diffDays >= -1 && diffDays <= 1) {
        timeScore = 1.0;
        contextMatches.push(`Same-day or next-day discovery (${foundDateStr.slice(0, 10)})`);
      } else if (diffDays <= 4) {
        timeScore = 0.85;
        contextMatches.push(`Found within ${diffDays} days of loss`);
      } else if (diffDays <= 14) {
        timeScore = 0.70;
      } else {
        timeScore = 0.50;
      }
    }
  }

  const combinedLocationTimeScore = Math.round((locationScore * 0.6 + timeScore * 0.4) * 100) / 100;

  // 3. Registration Timing (Registered prior to being found vs reactive post-loss)
  let registrationTimingScore = 0.60; // Baseline
  if (params.itemCreatedAt && params.foundCreatedAt) {
    const regMs = Date.parse(params.itemCreatedAt);
    const foundReportMs = Date.parse(params.foundCreatedAt);

    if (!isNaN(regMs) && !isNaN(foundReportMs)) {
      if (regMs <= foundReportMs) {
        // Item was pre-registered in the vault BEFORE the item was found by stranger
        registrationTimingScore = 1.0;
        contextMatches.push("Vault verified: item was registered in owner vault before found report was filed");
      } else {
        // Owner registered item after found report
        registrationTimingScore = 0.65;
      }
    }
  }

  return {
    locationScore,
    timeScore,
    combinedLocationTimeScore,
    registrationTimingScore,
    contextMatches,
    conflicts,
    missingEvidence,
  };
}
