// KHOJ V1.5 Types according to Section 20 & 20A

export type ItemStatus = 
  | 'safe' 
  | 'lost' 
  | 'potential_match' 
  | 'ambiguous' 
  | 'verified' 
  | 'handover_pending' 
  | 'returned';

export type ItemCategory = 
  | 'Earbuds' 
  | 'Phone' 
  | 'Laptop' 
  | 'Charger' 
  | 'Bag' 
  | 'Watch' 
  | 'Water Bottle' 
  | 'ID Card' 
  | 'Keys' 
  | 'Calculator' 
  | 'Tablet' 
  | 'Other';

export interface User {
  id: string;
  college_email: string;
  name: string;
  created_at: string;
}

export interface RegisteredItem {
  id: string;
  user_id?: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone?: string;
  name: string;
  category: ItemCategory;
  brand: string;
  model: string;
  colour?: string; // V1.5 spelling
  color?: string; // V1.3 alias
  unique_detail?: string; // V1.5: "One unique identifying detail"
  uniqueDetail?: string; // V1.3 alias
  photos: string[]; // item_images: front, side, unique
  status: ItemStatus;
  created_at?: string;
  registeredAt?: string;
  lost_details?: {
    location: string;
    lost_at: string;
    notes?: string;
  };
  lostDetails?: {
    lastSeenLocation: string;
    lostTime: string;
    additionalNotes: string;
    markedLostAt: string;
  };
}

export interface FoundReport {
  id: string; // e.g. KJ-4821
  image_url?: string;
  photoUrl?: string; // V1.3 alias
  detail_image_url?: string;
  detailPhotoUrl?: string; // V1.3 alias
  location: string;
  finder_phone?: string;
  finderPhone?: string; // V1.3 alias
  finder_upi?: string;
  finderUpiId?: string; // V1.3 alias
  category_guess?: ItemCategory;
  categoryGuess?: ItemCategory; // V1.3 alias
  rough_description?: string;
  roughDescription?: string; // V1.3 alias
  status: 'FOUND' | 'MATCHING' | 'POTENTIAL_MATCH' | 'AMBIGUOUS' | 'MANUAL_REVIEW' | 'VERIFICATION' | 'VERIFIED' | 'HANDOVER' | 'RETURNED' | 'UNCLAIMED' | 'searching' | 'matched' | 'ambiguous' | 'verified' | 'handover_arranged' | 'returned';
  created_at?: string;
  timestamp?: string; // V1.3 alias
  active_match_id?: string;
  matchedItemId?: string;
  matchScore?: number;
  dualConfirmation?: {
    ownerConfirmed: boolean;
    finderConfirmed: boolean;
  };
  reward?: {
    status: 'none' | 'prompted' | 'upi_provided' | 'paid' | 'confirmed';
    amount: number;
    upiTransactionRef?: string;
  };
  handoverPoint?: string;
  handoverNotes?: string;
}

// PRD Section 20: matches table with full score breakdown & source
export interface MatchRecord {
  id: string;
  found_report_id: string;
  item_id: string;
  score: number; // overall aggregate 0-100
  visual_score: number; // visual similarity component
  unique_detail_score: number; // unique detail similarity component
  context_score: number; // brand/category/location/time/lost-status
  rank: number; // 1 = top candidate, 2, 3...
  source: 'ai_match' | 'manual_claim'; // PRD Section 16 & 20A
  status: 'pending' | 'active_verification' | 'rejected' | 'verified' | 'handover' | 'returned';
  created_at: string;
}

// PRD Section 20: verification attempt table (one row per attempt)
export interface VerificationAttempt {
  id: string;
  match_id: string;
  found_report_id: string;
  owner_answer: string;
  result: 'matched' | 'rejected' | 'no_response';
  attempt_number: number; // 1st, 2nd, 3rd candidate tried
  created_at: string;
}

// PRD Section 20: recovery table
export interface RecoveryRecord {
  id: string;
  match_id: string;
  found_report_id: string;
  owner_confirmed: boolean;
  finder_confirmed: boolean;
  status: 'HANDOVER' | 'RETURNED';
  returned_at?: string;
  handover_point: string;
}

// PRD Section 15 & 20: rewards table with explicit V1.5 status machine
export type RewardStatus = 'NOT_OFFERED' | 'OFFERED' | 'SKIPPED' | 'PENDING' | 'PAID';

export interface RewardRecord {
  id: string;
  recovery_id: string;
  found_report_id: string;
  amount: number; // Flat ₹20 per PRD
  finder_upi?: string;
  status: RewardStatus;
  created_at: string;
  paid_at?: string;
  upi_ref?: string;
}

export interface MatchCandidate {
  registeredItem: RegisteredItem;
  foundReport: FoundReport;
  overallScore: number;
  breakdown: {
    uniqueDetailScore: number;
    visualSimilarityScore: number;
    metadataScore: number;
    locationTimeScore: number;
    registrationPrecedenceScore: number;
  };
  isAmbiguous: boolean;
  notes?: string;
}

export interface V15Metrics {
  studentsCount: number;
  registeredItemsCount: number;
  lostItemsCount: number;
  foundReportsCount: number;
  potentialMatchesCount: number;
  ambiguousCasesCount: number;
  manualReviewsCount: number;
  verifiedMatchesCount: number;
  returnedItemsCount: number;
  rewardsCount: number;
  recoveryRate: number; // (Returned / Found Reports) * 100
  avgAttemptsPerMatch: number; // Section 25 secondary metric
}
