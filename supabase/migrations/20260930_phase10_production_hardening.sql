-- =============================================================================
-- KHOJ — PHASE 10: PRODUCTION HARDENING + REAL RVU PILOT VALIDATION
-- Observability, Funnel Tracking, User Feedback & Operational Safety Schema
-- =============================================================================

-- 1. TABLE: pipeline_events
-- Tracks stage-by-stage progression through the core recovery funnel
CREATE TABLE IF NOT EXISTS pipeline_events (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN (
        'FOUND_REPORT',
        'FINGERPRINT_EXTRACTION',
        'EMBEDDING_GENERATION',
        'VECTOR_RETRIEVAL',
        'CANDIDATE_GENERATION',
        'RERANKING',
        'VERIFICATION_STARTED',
        'VERIFIED',
        'HANDOVER_STARTED',
        'RETURNED',
        'REWARD_OFFERED',
        'REWARD_COMPLETED',
        'REWARD_SKIPPED'
    )),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial', 'ambiguous', 'skipped')),
    stage_duration_ms INTEGER DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_events_report ON pipeline_events(report_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_stage ON pipeline_events(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created ON pipeline_events(created_at);

-- 2. TABLE: recovery_feedback
-- Lightweight post-return usability feedback (non-reputational)
CREATE TABLE IF NOT EXISTS recovery_feedback (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('owner', 'finder')),
    easy_rating TEXT NOT NULL CHECK (easy_rating IN ('yes', 'mostly', 'no')),
    confusion_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_feedback_report ON recovery_feedback(report_id);
CREATE INDEX IF NOT EXISTS idx_recovery_feedback_user ON recovery_feedback(user_id);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view all pipeline events" ON pipeline_events;
DROP POLICY IF EXISTS "System can insert pipeline events" ON pipeline_events;
DROP POLICY IF EXISTS "Users can insert own recovery feedback" ON recovery_feedback;
DROP POLICY IF EXISTS "Users can view own recovery feedback" ON recovery_feedback;
DROP POLICY IF EXISTS "Staff can view all recovery feedback" ON recovery_feedback;

CREATE POLICY "Staff can view all pipeline events"
    ON pipeline_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );

CREATE POLICY "Users can insert own recovery feedback"
    ON recovery_feedback FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can view own recovery feedback"
    ON recovery_feedback FOR SELECT
    USING (user_id = auth.uid()::text);

CREATE POLICY "Staff can view all recovery feedback"
    ON recovery_feedback FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );
