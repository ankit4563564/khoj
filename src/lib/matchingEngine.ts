import { RegisteredItem, FoundReport, MatchCandidate } from '@/types';

/**
 * Text token similarity helper (Jaccard / word overlap with fuzzy containment)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0.2;
  const words1 = text1.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const words2 = text2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0) return 0.2;

  let intersection = 0;
  for (const w of words1) {
    if (words2.some(w2 => w2.includes(w) || w.includes(w2) || (w.length > 3 && w2.length > 3 && (w.slice(0, 4) === w2.slice(0, 4))))) {
      intersection++;
    }
  }
  const union = new Set([...words1, ...words2]).size;
  return Math.min(1.0, (intersection / Math.max(words1.length, 1)) * 0.8 + (intersection / union) * 0.2);
}

/**
 * Visual / Semantic feature similarity simulation
 */
function computeSimulatedVisualSimilarity(item: RegisteredItem, report: FoundReport): number {
  let score = 0.5; // base

  const catGuess = report.category_guess;
  if (catGuess && item.category.toLowerCase() === catGuess.toLowerCase()) {
    score += 0.3;
  }

  const desc = (report.rough_description || report.roughDescription || '').toLowerCase();
  const itemColour = (item.colour || item.color || '').toLowerCase();
  if (desc) {
    if (desc.includes(item.brand.toLowerCase())) score += 0.15;
    if (desc.includes(itemColour)) score += 0.1;
    if (item.model && desc.includes(item.model.toLowerCase())) score += 0.15;
  }

  return Math.min(1.0, score);
}

/**
 * Compute unique detail similarity (0.0 to 1.0)
 * Evaluates whether distinguishing marks match.
 */
function computeUniqueDetailScore(item: RegisteredItem, report: FoundReport): number {
  const desc = report.rough_description || report.roughDescription || '';
  const detailImg = report.detail_image_url || report.detailPhotoUrl;
  if (!desc && !detailImg) return 0.4;
  
  const itemDetail = item.unique_detail || item.uniqueDetail || '';
  const textSim = calculateTextSimilarity(itemDetail, desc);
  const photoBonus = detailImg ? 0.35 : 0.1;
  return Math.min(1.0, textSim * 0.7 + photoBonus);
}

/**
 * Location and Time Proximity Score (0.0 to 1.0)
 */
function computeLocationTimeScore(item: RegisteredItem, report: FoundReport): number {
  let score = 0.5;
  const locItem = item.lost_details?.location || item.lostDetails?.lastSeenLocation;
  if (locItem) {
    const locItemLower = locItem.toLowerCase();
    const locReport = report.location.toLowerCase();
    if (locItemLower.includes(locReport) || locReport.includes(locItemLower)) {
      score = 0.95;
    } else {
      const words = locItemLower.split(' ');
      if (words.some(w => w.length > 3 && locReport.includes(w))) {
        score = 0.8;
      }
    }
  }
  return score;
}

/**
 * Primary PRD V1.5 Formula:
 * Match Score =
 *   Unique Detail Similarity      × 0.50
 *   Overall Visual Similarity     × 0.25
 *   Category/Brand/Colour Match   × 0.10
 *   Location/Time Proximity       × 0.10
 *   Registration Before Lost      × 0.05
 */
export function evaluateCandidateMatch(
  item: RegisteredItem,
  report: FoundReport
): MatchCandidate {
  const uniqueDetailScore = computeUniqueDetailScore(item, report);
  const visualSimilarityScore = computeSimulatedVisualSimilarity(item, report);

  let metadataScore = 0.4;
  const catGuess = report.category_guess || report.categoryGuess;
  if (catGuess?.toLowerCase() === item.category.toLowerCase()) metadataScore += 0.3;
  const desc = (report.rough_description || report.roughDescription || '').toLowerCase();
  const itemColour = (item.colour || item.color || '').toLowerCase();
  if (desc.includes(item.brand.toLowerCase())) metadataScore += 0.15;
  if (desc.includes(itemColour)) metadataScore += 0.15;
  metadataScore = Math.min(1.0, metadataScore);

  const locationTimeScore = computeLocationTimeScore(item, report);

  const regDate = new Date(item.created_at || item.registeredAt || '2026-09-01').getTime();
  const foundDate = new Date(report.created_at || report.timestamp || '2026-09-27').getTime();
  const registrationPrecedenceScore = regDate <= foundDate ? 1.0 : 0.2;

  const lostPriorityBonus = item.status === 'lost' ? 0.05 : 0.0;

  const rawScore = 
    (uniqueDetailScore * 0.50) +
    (visualSimilarityScore * 0.25) +
    (metadataScore * 0.10) +
    (locationTimeScore * 0.10) +
    (registrationPrecedenceScore * 0.05) +
    lostPriorityBonus;

  const overallScore = Math.round(Math.min(100, Math.max(10, rawScore * 100)));

  return {
    registeredItem: item,
    foundReport: report,
    overallScore,
    breakdown: {
      uniqueDetailScore: Math.round(uniqueDetailScore * 100),
      visualSimilarityScore: Math.round(visualSimilarityScore * 100),
      metadataScore: Math.round(metadataScore * 100),
      locationTimeScore: Math.round(locationTimeScore * 100),
      registrationPrecedenceScore: Math.round(registrationPrecedenceScore * 100),
    },
    isAmbiguous: false,
  };
}

/**
 * Ranked candidates for a found report, applying Ambiguous Match Rule (PRD V1.5 Section 10)
 */
export function rankCandidatesForReport(
  report: FoundReport,
  registeredItems: RegisteredItem[]
): {
  topCandidate: MatchCandidate | null;
  allCandidates: MatchCandidate[];
  isAmbiguous: boolean;
  requiresManualReview: boolean;
} {
  const candidates = registeredItems
    .map(item => evaluateCandidateMatch(item, report))
    .sort((a, b) => b.overallScore - a.overallScore);

  if (candidates.length === 0) {
    return { topCandidate: null, allCandidates: [], isAmbiguous: false, requiresManualReview: false };
  }

  const top1 = candidates[0];
  const top2 = candidates[1];

  // PRD V1.5 Section 10: "If two or more candidates score above 85% match confidence for the same found report, Status = AMBIGUOUS"
  let isAmbiguous = false;
  if (top2 && top1.overallScore >= 85 && top2.overallScore >= 85) {
    isAmbiguous = true;
    top1.isAmbiguous = true;
    top2.isAmbiguous = true;
    top1.notes = `Ambiguous tie with item #${top2.registeredItem.id} (${top2.registeredItem.name})`;
    top2.notes = `Ambiguous tie with item #${top1.registeredItem.id} (${top1.registeredItem.name})`;
  }

  const MIN_MATCH_THRESHOLD = 70;
  const requiresManualReview = isAmbiguous || (top1.overallScore >= 55 && top1.overallScore < MIN_MATCH_THRESHOLD);

  return {
    topCandidate: top1.overallScore >= 55 ? top1 : null,
    allCandidates: candidates,
    isAmbiguous,
    requiresManualReview,
  };
}
