-- =============================================================================
-- KHOJ — PHASE 9: OPTIONAL ₹20 THANK-YOU REWARD
-- Post-Return Optional Gratitude & Direct UPI Payment Coordination (Supabase / Postgres)
--
-- CORE PRINCIPLE:
-- Verification proves ownership. Handover proves return.
-- The reward is an OPTIONAL expression of gratitude strictly AFTER return.
-- KHOJ NEVER holds, processes, or escrows money. Owner pays finder directly via UPI.
-- =============================================================================

-- 1. TABLE: rewards
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
    recovery_case_id TEXT,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    finder_reference TEXT NOT NULL,
    amount_inr INTEGER NOT NULL DEFAULT 20 CHECK (amount_inr = 20),
    state TEXT NOT NULL DEFAULT 'NOT_OFFERED'
        CHECK (state IN (
            'NOT_OFFERED',
            'SKIPPED',
            'WAITING_FOR_UPI',
            'UPI_PROVIDED',
            'PAYMENT_INITIATED',
            'PAYMENT_SELF_REPORTED',
            'COMPLETED',
            'CANCELLED',
            'EXPIRED',
            'MANUAL_REVIEW'
        )),
    finder_upi_id TEXT NOT NULL DEFAULT '',
    owner_payment_reported_at TIMESTAMPTZ,
    finder_payment_confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancellation_reason TEXT NOT NULL DEFAULT '',
    dispute_reason TEXT NOT NULL DEFAULT '',
    workflow_version TEXT NOT NULL DEFAULT 'v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_report ON rewards(report_id);
CREATE INDEX IF NOT EXISTS idx_rewards_owner ON rewards(owner_id);
CREATE INDEX IF NOT EXISTS idx_rewards_finder ON rewards(finder_reference);
CREATE INDEX IF NOT EXISTS idx_rewards_state ON rewards(state);

-- 2. TABLE: reward_events
CREATE TABLE IF NOT EXISTS reward_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_id TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    report_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_events_reward ON reward_events(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_events_report ON reward_events(report_id);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own rewards" ON rewards;
DROP POLICY IF EXISTS "Finders can view own rewards" ON rewards;
DROP POLICY IF EXISTS "Staff can view all rewards" ON rewards;
DROP POLICY IF EXISTS "Staff can update all rewards" ON rewards;

CREATE POLICY "Owners can view own rewards"
    ON rewards FOR SELECT
    USING (owner_id = auth.uid()::text);

CREATE POLICY "Finders can view own rewards"
    ON rewards FOR SELECT
    USING (finder_reference = auth.uid()::text);

CREATE POLICY "Staff can view all rewards"
    ON rewards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );

CREATE POLICY "Participants can view reward events"
    ON reward_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rewards
            WHERE rewards.id = reward_events.reward_id
              AND (rewards.owner_id = auth.uid()::text OR rewards.finder_reference = auth.uid()::text)
        ) OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );
