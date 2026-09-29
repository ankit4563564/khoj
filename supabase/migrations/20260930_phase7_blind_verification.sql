-- =============================================================================
-- KHOJ — PHASE 7: BLIND OWNERSHIP VERIFICATION
-- Interactive, Anti-Leakage Ownership Verification Schema (Supabase / Postgres)
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. TABLE: verification_sessions
-- Manages the state, generated challenges, attempt counts, and outcomes of blind verification.
-- =============================================================================

CREATE TABLE IF NOT EXISTS verification_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_match_id UUID NOT NULL REFERENCES candidate_matches(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES protected_items(id) ON DELETE CASCADE,
    found_report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    claimant_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    state TEXT NOT NULL DEFAULT 'PENDING_CHALLENGE' 
        CHECK (state IN ('PENDING_CHALLENGE', 'VERIFIED', 'VERIFICATION_FAILED', 'REQUIRES_MANUAL_REVIEW', 'EXPIRED', 'LOCKED')),
    
    challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
    active_challenge_index INTEGER NOT NULL DEFAULT 0,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    
    verification_score REAL NOT NULL DEFAULT 0.0 CHECK (verification_score BETWEEN 0.0 AND 1.0),
    verification_strength TEXT NOT NULL DEFAULT 'weak'
        CHECK (verification_strength IN ('strong', 'moderate', 'weak', 'contradictory')),
        
    matched_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    algorithm_version TEXT NOT NULL DEFAULT 'v1',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_sessions_cand ON verification_sessions(candidate_match_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_user ON verification_sessions(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_state ON verification_sessions(state);

-- =============================================================================
-- 3. TABLE: verification_audits
-- Immutable security audit log for all claimant verification attempts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS verification_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,
    candidate_match_id UUID NOT NULL REFERENCES candidate_matches(id) ON DELETE CASCADE,
    claimant_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    challenge_type TEXT NOT NULL,
    result TEXT NOT NULL,
    score REAL NOT NULL,
    matched_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    ip TEXT NOT NULL DEFAULT '',
    algorithm_version TEXT NOT NULL DEFAULT 'v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_audits_sess ON verification_audits(session_id);
CREATE INDEX IF NOT EXISTS idx_verification_audits_cand ON verification_audits(candidate_match_id);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Claimants can view own verification sessions" ON verification_sessions;
DROP POLICY IF EXISTS "Staff can view all verification sessions" ON verification_sessions;
DROP POLICY IF EXISTS "Claimants can view own verification audits" ON verification_audits;
DROP POLICY IF EXISTS "Staff can view all verification audits" ON verification_audits;

-- Claimants can only read their own verification sessions
CREATE POLICY "Claimants can view own verification sessions"
    ON verification_sessions FOR SELECT
    USING (claimant_user_id = auth.uid()::text);

-- University staff can inspect all verification sessions for manual review
CREATE POLICY "Staff can view all verification sessions"
    ON verification_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );

-- Audit trails viewable by the session owner
CREATE POLICY "Claimants can view own verification audits"
    ON verification_audits FOR SELECT
    USING (claimant_user_id = auth.uid()::text);

-- Staff can inspect all audits
CREATE POLICY "Staff can view all verification audits"
    ON verification_audits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );
