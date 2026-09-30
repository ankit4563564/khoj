-- =============================================================================
-- KHOJ — Complete PostgreSQL Schema for Supabase
-- =============================================================================

-- Drop older draft tables if they were created with snake_case columns
DROP TABLE IF EXISTS
    pilot_incidents,
    pilot_ground_truth,
    recovery_feedback,
    pipeline_events,
    reward_events,
    rewards,
    verification_audits,
    verification_sessions,
    fingerprint_embeddings,
    verification_evidence,
    candidate_matches,
    found_fingerprints,
    item_fingerprints,
    blind_attempts,
    recovery_events,
    found_ids,
    identity_audit,
    identity_links,
    campus_directory,
    tokens,
    guest_sessions,
    rate_limits,
    sessions,
    activity,
    audit,
    notifications,
    matches,
    handovers,
    claims,
    protected_items,
    reports,
    uploads,
    users
CASCADE;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    "studentId" TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'student',
    verified BOOLEAN NOT NULL DEFAULT false,
    password TEXT,
    "googleId" TEXT UNIQUE,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    mime TEXT NOT NULL,
    content BYTEA NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '',
    brand TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    "privateDetail" TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    "imageId" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT '',
    "custodyLocation" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS protected_items (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    "privateDetail" TEXT NOT NULL DEFAULT '',
    "imageId" TEXT,
    status TEXT NOT NULL DEFAULT 'safe',
    "lostReportId" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lostReportId" TEXT,
    proof TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    "staffNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL DEFAULT '',
    UNIQUE("reportId", "userId")
);

CREATE TABLE IF NOT EXISTS handovers (
    "reportId" TEXT PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "finderId" TEXT NOT NULL,
    "ownerConfirmed" INTEGER NOT NULL DEFAULT 0,
    "finderConfirmed" INTEGER NOT NULL DEFAULT 0,
    point TEXT NOT NULL,
    "returnedAt" TEXT,
    "rewardStatus" TEXT NOT NULL DEFAULT 'offered',
    "finderUpi" TEXT NOT NULL DEFAULT '',
    "candidateMatchId" TEXT,
    state TEXT NOT NULL DEFAULT 'RECOVERY_PENDING',
    "proposedLocation" TEXT NOT NULL DEFAULT '',
    "proposedDate" TEXT NOT NULL DEFAULT '',
    "proposedTimeWindow" TEXT NOT NULL DEFAULT '',
    "proposedBy" TEXT NOT NULL DEFAULT 'owner',
    "ownerConfirmedAt" TEXT,
    "finderConfirmedAt" TEXT,
    "finderActionToken" TEXT NOT NULL DEFAULT '',
    "tokenExpiresAt" TEXT,
    "issueReason" TEXT NOT NULL DEFAULT '',
    "cancellationReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL DEFAULT '',
    "updatedAt" TEXT NOT NULL DEFAULT '',
    "workflowVersion" TEXT NOT NULL DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    "lostId" TEXT NOT NULL,
    "foundId" TEXT NOT NULL,
    score INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT '',
    UNIQUE("lostId", "foundId")
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    title TEXT NOT NULL,
    href TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit (
    id TEXT PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    action TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    "reportId" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    expires BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_sessions (
    token TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    expires BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    expires BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS identity_links (
    "userId" TEXT PRIMARY KEY,
    usn TEXT NOT NULL,
    status TEXT NOT NULL,
    "linkedAt" TEXT,
    "requestedAt" TEXT NOT NULL,
    "reviewedBy" TEXT,
    note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS identity_audit (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    action TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS found_ids (
    "reportId" TEXT PRIMARY KEY,
    "targetUserId" TEXT,
    "subjectHash" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS campus_directory (
    usn TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recovery_events (
    id TEXT PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "candidateMatchId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blind_attempts (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    accepted INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS item_fingerprints (
    id TEXT PRIMARY KEY,
    "itemId" TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    subcategory TEXT,
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    material TEXT,
    "visibleText" TEXT NOT NULL DEFAULT '[]',
    logos TEXT NOT NULL DEFAULT '[]',
    accessories TEXT NOT NULL DEFAULT '[]',
    "distinctiveFeatures" TEXT NOT NULL DEFAULT '[]',
    condition TEXT NOT NULL DEFAULT 'unknown',
    "ownerDescription" TEXT NOT NULL DEFAULT '',
    "normalizedDescription" TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}',
    "imageReference" TEXT,
    "textEmbeddingReference" TEXT,
    "imageEmbeddingReference" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS found_fingerprints (
    id TEXT PRIMARY KEY,
    "foundReportId" TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    subcategory TEXT,
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    material TEXT,
    "visibleText" TEXT NOT NULL DEFAULT '[]',
    logos TEXT NOT NULL DEFAULT '[]',
    accessories TEXT NOT NULL DEFAULT '[]',
    "distinctiveFeatures" TEXT NOT NULL DEFAULT '[]',
    condition TEXT NOT NULL DEFAULT 'unknown',
    "visualDescription" TEXT NOT NULL DEFAULT '',
    "foundLocation" TEXT NOT NULL DEFAULT '',
    "foundAt" TEXT NOT NULL,
    "imageReference" TEXT,
    "imageEmbeddingReference" TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_matches (
    id TEXT PRIMARY KEY,
    "foundReportId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "vectorSimilarity" REAL,
    "attributeScore" INTEGER NOT NULL DEFAULT 0,
    "uniqueClueScore" INTEGER NOT NULL DEFAULT 0,
    "locationScore" INTEGER NOT NULL DEFAULT 0,
    "timeScore" INTEGER NOT NULL DEFAULT 0,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "confidenceTier" TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'candidate',
    evidence TEXT NOT NULL DEFAULT '[]',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    UNIQUE("foundReportId", "itemId")
);

CREATE TABLE IF NOT EXISTS verification_evidence (
    id TEXT PRIMARY KEY,
    "candidateMatchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    question TEXT NOT NULL,
    "ownerAnswer" TEXT NOT NULL,
    "expectedEvidence" TEXT NOT NULL,
    result TEXT NOT NULL DEFAULT 'pending',
    "evidenceSource" TEXT NOT NULL DEFAULT 'owner_registration',
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fingerprint_embeddings (
    id TEXT PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    modality TEXT NOT NULL,
    embedding TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    dimension INTEGER NOT NULL DEFAULT 768,
    "contentHash" TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    "errorMessage" TEXT,
    category TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    UNIQUE("sourceId", modality, "modelName", "modelVersion")
);

CREATE TABLE IF NOT EXISTS verification_sessions (
    id TEXT PRIMARY KEY,
    "candidateMatchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "foundReportId" TEXT NOT NULL,
    "claimantUserId" TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'PENDING_CHALLENGE',
    challenges TEXT NOT NULL DEFAULT '[]',
    "activeChallengeIndex" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "verificationScore" REAL NOT NULL DEFAULT 0.0,
    "verificationStrength" TEXT NOT NULL DEFAULT 'weak',
    "matchedEvidence" TEXT NOT NULL DEFAULT '[]',
    conflicts TEXT NOT NULL DEFAULT '[]',
    "missingEvidence" TEXT NOT NULL DEFAULT '[]',
    "algorithmVersion" TEXT NOT NULL DEFAULT 'v1',
    "expiresAt" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_audits (
    id TEXT PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "candidateMatchId" TEXT NOT NULL,
    "claimantUserId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "challengeType" TEXT NOT NULL,
    result TEXT NOT NULL,
    score REAL NOT NULL,
    "matchedCategories" TEXT NOT NULL DEFAULT '[]',
    ip TEXT NOT NULL DEFAULT '',
    "algorithmVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    "reportId" TEXT NOT NULL UNIQUE,
    "recoveryCaseId" TEXT,
    "ownerId" TEXT NOT NULL,
    "finderReference" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL DEFAULT 20,
    state TEXT NOT NULL DEFAULT 'NOT_OFFERED',
    "finderUpiId" TEXT NOT NULL DEFAULT '',
    "ownerPaymentReportedAt" TEXT,
    "finderPaymentConfirmedAt" TEXT,
    "completedAt" TEXT,
    "cancellationReason" TEXT NOT NULL DEFAULT '',
    "disputeReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "workflowVersion" TEXT NOT NULL DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS reward_events (
    id TEXT PRIMARY KEY,
    "rewardId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pipeline_events (
    id TEXT PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    "stageDurationMs" INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}',
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_feedback (
    id TEXT PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "easyRating" TEXT NOT NULL,
    "confusionNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pilot_ground_truth (
    id TEXT PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "trueOwnerId" TEXT,
    "trueItemId" TEXT,
    "hasRealMatch" INTEGER NOT NULL DEFAULT 0,
    "candidateRank" INTEGER,
    "verificationResult" TEXT NOT NULL,
    "handoverResult" TEXT NOT NULL,
    "returnedResult" TEXT NOT NULL,
    "caseClassification" TEXT NOT NULL,
    "failureStage" TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pilot_incidents (
    id TEXT PRIMARY KEY,
    "reportId" TEXT,
    "incidentType" TEXT NOT NULL,
    severity TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    "resolutionNotes" TEXT,
    "resolvedBy" TEXT,
    "createdAt" TEXT NOT NULL,
    "resolvedAt" TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_fingerprints_item ON item_fingerprints("itemId");
CREATE INDEX IF NOT EXISTS idx_found_fingerprints_report ON found_fingerprints("foundReportId");
CREATE INDEX IF NOT EXISTS idx_candidate_matches_pair ON candidate_matches("foundReportId", "itemId");
CREATE INDEX IF NOT EXISTS idx_candidate_matches_score ON candidate_matches("overallScore" DESC);
CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_src ON fingerprint_embeddings("sourceId", "sourceType");
CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_cat ON fingerprint_embeddings(category, status);
CREATE INDEX IF NOT EXISTS idx_verif_sessions_cand ON verification_sessions("candidateMatchId");
CREATE INDEX IF NOT EXISTS idx_verif_sessions_user ON verification_sessions("claimantUserId");
CREATE INDEX IF NOT EXISTS idx_verif_sessions_state ON verification_sessions(state);
CREATE INDEX IF NOT EXISTS idx_verif_audits_sess ON verification_audits("sessionId");
CREATE INDEX IF NOT EXISTS idx_rewards_report ON rewards("reportId");
CREATE INDEX IF NOT EXISTS idx_rewards_owner ON rewards("ownerId");
CREATE INDEX IF NOT EXISTS idx_rewards_finder ON rewards("finderReference");
CREATE INDEX IF NOT EXISTS idx_rewards_state ON rewards(state);
CREATE INDEX IF NOT EXISTS idx_reward_events_reward ON reward_events("rewardId");
CREATE INDEX IF NOT EXISTS idx_reward_events_report ON reward_events("reportId");
CREATE INDEX IF NOT EXISTS idx_pipeline_events_report ON pipeline_events("reportId");
CREATE INDEX IF NOT EXISTS idx_pipeline_events_stage ON pipeline_events(stage);
CREATE INDEX IF NOT EXISTS idx_recovery_feedback_report ON recovery_feedback("reportId");
CREATE INDEX IF NOT EXISTS idx_recovery_feedback_user ON recovery_feedback("userId");
CREATE INDEX IF NOT EXISTS idx_pilot_gt_report ON pilot_ground_truth("reportId");
CREATE INDEX IF NOT EXISTS idx_pilot_gt_item ON pilot_ground_truth("trueItemId");
CREATE INDEX IF NOT EXISTS idx_pilot_incidents_report ON pilot_incidents("reportId");
CREATE INDEX IF NOT EXISTS idx_pilot_incidents_status ON pilot_incidents(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions("userId");
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens("userId");
CREATE INDEX IF NOT EXISTS idx_guest_sessions_user ON guest_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports("userId");
CREATE INDEX IF NOT EXISTS idx_reports_kind ON reports(kind, status);
CREATE INDEX IF NOT EXISTS idx_claims_user ON claims("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId", "createdAt" DESC);
