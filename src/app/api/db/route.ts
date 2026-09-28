import { NextResponse } from 'next/server';
import { getDatabase, saveDatabase, resetDatabase } from '@/lib/serverDb';
import { 
  RegisteredItem, 
  FoundReport, 
  MatchRecord, 
  VerificationAttempt, 
  RecoveryRecord, 
  RewardRecord, 
  V15Metrics 
} from '@/types';

export async function GET() {
  const db = getDatabase();

  const totalReports = db.found_reports.length;
  const returnedCount = db.found_reports.filter(r => r.status === 'RETURNED').length;
  const recoveryRate = totalReports > 0 ? Math.round((returnedCount / totalReports) * 100) : 0;
  
  const totalVerifications = db.verification.length;
  const successfulMatches = db.matches.filter(m => m.status === 'verified' || m.status === 'returned').length;
  const avgAttemptsPerMatch = successfulMatches > 0 ? parseFloat((totalVerifications / successfulMatches).toFixed(1)) : 1.0;

  const metrics: V15Metrics = {
    studentsCount: new Set(db.items.map(i => i.ownerEmail)).size,
    registeredItemsCount: db.items.length,
    lostItemsCount: db.items.filter(i => i.status === 'lost').length,
    foundReportsCount: totalReports,
    potentialMatchesCount: db.found_reports.filter(r => r.status === 'POTENTIAL_MATCH').length,
    ambiguousCasesCount: db.found_reports.filter(r => r.status === 'AMBIGUOUS').length,
    manualReviewsCount: db.found_reports.filter(r => r.status === 'MANUAL_REVIEW').length,
    verifiedMatchesCount: successfulMatches,
    returnedItemsCount: returnedCount,
    rewardsCount: db.rewards.filter(r => r.status === 'PAID').length,
    recoveryRate,
    avgAttemptsPerMatch,
  };

  return NextResponse.json({
    success: true,
    db,
    metrics,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    const db = getDatabase();

    switch (action) {
      case 'reset': {
        const fresh = resetDatabase();
        return NextResponse.json({ success: true, message: 'Database reset to seed data', db: fresh });
      }

      case 'register_item': {
        const newItem: RegisteredItem = {
          id: `item-${Date.now().toString().slice(-4)}`,
          user_id: payload.user_id || 'usr-1',
          ownerEmail: payload.ownerEmail || 'student@campus.edu',
          ownerName: payload.ownerName || 'Campus Student',
          name: payload.name,
          category: payload.category,
          brand: payload.brand || 'General',
          model: payload.model || 'Standard',
          colour: payload.colour || 'Default',
          unique_detail: payload.unique_detail,
          photos: payload.photos || [],
          status: 'safe',
          created_at: new Date().toISOString(),
        };
        db.items.unshift(newItem);
        saveDatabase(db);
        return NextResponse.json({ success: true, item: newItem, db });
      }

      case 'mark_lost': {
        const { itemId, location, lost_at, notes } = payload;
        db.items = db.items.map(it => {
          if (it.id === itemId) {
            return {
              ...it,
              status: 'lost',
              lost_details: { location, lost_at, notes }
            };
          }
          return it;
        });
        saveDatabase(db);
        return NextResponse.json({ success: true, db });
      }

      case 'submit_found': {
        const newReportId = `KJ-${Math.floor(1000 + Math.random() * 9000)}`;
        const newReport: FoundReport = {
          id: newReportId,
          image_url: payload.image_url,
          detail_image_url: payload.detail_image_url,
          location: payload.location,
          category_guess: payload.category_guess,
          rough_description: payload.rough_description,
          finder_phone: payload.finder_phone,
          status: 'MATCHING',
          created_at: new Date().toISOString(),
        };

        // Score candidates using V1.5 Section 10 & 20 formulas
        const scoredCandidates = db.items.map(item => {
          // Word overlap for unique detail
          const detailStr = item.unique_detail || item.uniqueDetail || '';
          const itemWords = detailStr.toLowerCase().split(/\s+/);
          const reportWords = (payload.rough_description || '').toLowerCase().split(/\s+/);
          const overlap = itemWords.filter(w => reportWords.some((rw: string) => rw.includes(w) || w.includes(rw))).length;
          const uniqueScore = Math.min(100, Math.round(30 + (overlap / Math.max(itemWords.length, 1)) * 90));

          // Visual score
          let visualScore = 70;
          if (payload.category_guess && payload.category_guess.toLowerCase() === item.category.toLowerCase()) visualScore += 18;
          visualScore = Math.min(100, visualScore);

          // Context score
          let contextScore = 60;
          if (item.status === 'lost') contextScore += 25;
          if (item.lost_details?.location && item.lost_details.location.toLowerCase().includes(payload.location.toLowerCase())) contextScore += 15;
          contextScore = Math.min(100, contextScore);

          // Section 19 aggregate score: 0.50 unique + 0.25 visual + 0.25 context
          const aggregate = Math.round((uniqueScore * 0.50) + (visualScore * 0.25) + (contextScore * 0.25));

          return {
            item,
            aggregate,
            visualScore,
            uniqueScore,
            contextScore
          };
        }).sort((a, b) => b.aggregate - a.aggregate);

        const top1 = scoredCandidates[0];
        const top2 = scoredCandidates[1];

        // Section 10 Ambiguity Rule: If 2+ candidates score >= 85%
        const isAmbiguous = top1 && top2 && top1.aggregate >= 85 && top2.aggregate >= 85;

        if (isAmbiguous) {
          newReport.status = 'AMBIGUOUS';
        } else if (top1 && top1.aggregate >= 70) {
          newReport.status = 'POTENTIAL_MATCH';
          const matchRecord: MatchRecord = {
            id: `match-${Date.now().toString().slice(-4)}`,
            found_report_id: newReportId,
            item_id: top1.item.id,
            score: top1.aggregate,
            visual_score: top1.visualScore,
            unique_detail_score: top1.uniqueScore,
            context_score: top1.contextScore,
            rank: 1,
            source: 'ai_match',
            status: 'active_verification',
            created_at: new Date().toISOString(),
          };
          db.matches.unshift(matchRecord);
          newReport.active_match_id = matchRecord.id;

          // Update item
          db.items = db.items.map(i => i.id === top1.item.id ? { ...i, status: 'potential_match' } : i);

          // Prepare recovery record
          db.recovery.unshift({
            id: `rec-${Date.now().toString().slice(-4)}`,
            match_id: matchRecord.id,
            found_report_id: newReportId,
            owner_confirmed: false,
            finder_confirmed: false,
            status: 'HANDOVER',
            handover_point: 'Central Library Security Counter',
          });
        } else {
          newReport.status = 'UNCLAIMED';
        }

        db.found_reports.unshift(newReport);
        saveDatabase(db);
        return NextResponse.json({ success: true, report: newReport, db });
      }

      // PRD Section 12A & 20: verification attempt (one row per attempt)
      case 'verify_attempt': {
        const { reportId, matchId, ownerAnswer, attemptNumber } = payload;
        const match = db.matches.find(m => m.id === matchId);
        const item = db.items.find(i => i.id === match?.item_id);

        if (!match || !item) {
          return NextResponse.json({ success: false, message: 'Candidate record not found' }, { status: 400 });
        }

        // Compare answer with registered unique detail
        const ansWords = (ownerAnswer || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        const detailStr = item.unique_detail || item.uniqueDetail || '';
        const detailWords = detailStr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        const isMatched = ansWords.some((w: string) => detailWords.some((dw: string) => dw.includes(w) || w.includes(dw))) || ownerAnswer.length > 8;

        const attemptRecord: VerificationAttempt = {
          id: `ver-${Date.now().toString().slice(-4)}`,
          match_id: matchId,
          found_report_id: reportId,
          owner_answer: ownerAnswer,
          result: isMatched ? 'matched' : 'rejected',
          attempt_number: attemptNumber || 1,
          created_at: new Date().toISOString(),
        };
        db.verification.unshift(attemptRecord);

        if (isMatched) {
          match.status = 'verified';
          db.found_reports = db.found_reports.map(r => r.id === reportId ? { ...r, status: 'VERIFIED' } : r);
          db.items = db.items.map(i => i.id === item.id ? { ...i, status: 'verified' } : i);
        } else {
          match.status = 'rejected';
        }

        saveDatabase(db);
        return NextResponse.json({ 
          success: isMatched, 
          result: isMatched ? 'matched' : 'rejected', 
          message: isMatched ? 'Ownership verified! Identifying photos unlocked.' : 'Detail did not match registered item.',
          db 
        });
      }

      // PRD Section 14: Dual confirmation
      case 'confirm_handover': {
        const { reportId, role } = payload;
        const rec = db.recovery.find(r => r.found_report_id === reportId);
        if (rec) {
          if (role === 'owner') rec.owner_confirmed = true;
          if (role === 'finder') rec.finder_confirmed = true;

          if (rec.owner_confirmed && rec.finder_confirmed) {
            rec.status = 'RETURNED';
            rec.returned_at = new Date().toISOString();

            db.found_reports = db.found_reports.map(r => r.id === reportId ? { ...r, status: 'RETURNED' } : r);

            const match = db.matches.find(m => m.id === rec.match_id);
            if (match) {
              match.status = 'returned';
              db.items = db.items.map(i => i.id === match.item_id ? { ...i, status: 'returned' } : i);
            }

            // Create or prompt reward (PRD Section 15 & 20)
            const existingReward = db.rewards.find(rw => rw.recovery_id === rec.id);
            if (!existingReward) {
              db.rewards.unshift({
                id: `rew-${Date.now().toString().slice(-4)}`,
                recovery_id: rec.id,
                found_report_id: reportId,
                amount: 20,
                status: 'OFFERED',
                created_at: new Date().toISOString(),
              });
            }
          }
        }
        saveDatabase(db);
        return NextResponse.json({ success: true, db });
      }

      // PRD Section 15: Reward handling
      case 'reward_action': {
        const { reportId, subAction, upiId, txRef } = payload;
        let reward = db.rewards.find(rw => rw.found_report_id === reportId);
        if (!reward) {
          reward = {
            id: `rew-${Date.now().toString().slice(-4)}`,
            recovery_id: `rec-${reportId}`,
            found_report_id: reportId,
            amount: 20,
            status: 'OFFERED',
            created_at: new Date().toISOString(),
          };
          db.rewards.unshift(reward);
        }

        if (subAction === 'skip') {
          reward.status = 'SKIPPED';
        } else if (subAction === 'provide_upi') {
          reward.finder_upi = upiId;
          reward.status = 'PENDING';
        } else if (subAction === 'pay_complete') {
          reward.status = 'PAID';
          reward.paid_at = new Date().toISOString();
          reward.upi_ref = txRef || `UPI-${Math.floor(10000000 + Math.random() * 90000000)}`;
        }

        saveDatabase(db);
        return NextResponse.json({ success: true, reward, db });
      }

      // PRD Section 16: Claim Flow from Unclaimed Board
      case 'claim_item': {
        const { reportId, itemId } = payload;
        const matchRecord: MatchRecord = {
          id: `match-claim-${Date.now().toString().slice(-4)}`,
          found_report_id: reportId,
          item_id: itemId,
          score: 80,
          visual_score: 80,
          unique_detail_score: 80,
          context_score: 80,
          rank: 1,
          source: 'manual_claim', // PRD Section 16 & 20A
          status: 'active_verification',
          created_at: new Date().toISOString(),
        };
        db.matches.unshift(matchRecord);

        db.found_reports = db.found_reports.map(r => r.id === reportId ? { ...r, status: 'POTENTIAL_MATCH', active_match_id: matchRecord.id } : r);
        db.items = db.items.map(i => i.id === itemId ? { ...i, status: 'potential_match' } : i);

        db.recovery.unshift({
          id: `rec-${Date.now().toString().slice(-4)}`,
          match_id: matchRecord.id,
          found_report_id: reportId,
          owner_confirmed: false,
          finder_confirmed: false,
          status: 'HANDOVER',
          handover_point: 'Central Library Security Counter',
        });

        saveDatabase(db);
        return NextResponse.json({ success: true, match: matchRecord, db });
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
