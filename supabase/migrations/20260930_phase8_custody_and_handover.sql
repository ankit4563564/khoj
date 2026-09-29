-- =============================================================================
-- KHOJ — PHASE 8: CUSTODY & HANDOVER WORKFLOW
-- Safe Campus Handover & Dual-Confirmation Workflow Schema (Supabase / Postgres)
-- =============================================================================

-- 1. TABLE: handovers
CREATE TABLE IF NOT EXISTS handovers (
    report_id TEXT PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    finder_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_match_id UUID REFERENCES candidate_matches(id) ON DELETE SET NULL,
    
    state TEXT NOT NULL DEFAULT 'RECOVERY_PENDING'
        CHECK (state IN (
            'VERIFICATION_REQUIRED',
            'VERIFIED',
            'RECOVERY_PENDING',
            'HANDOVER_PROPOSED',
            'HANDOVER_ACCEPTED',
            'HANDOVER_IN_PROGRESS',
            'OWNER_CONFIRMED',
            'FINDER_CONFIRMED',
            'RETURNED',
            'CANCELLED',
            'EXPIRED',
            'MANUAL_REVIEW'
        )),
        
    owner_confirmed BOOLEAN NOT NULL DEFAULT false,
    finder_confirmed BOOLEAN NOT NULL DEFAULT false,
    
    point TEXT NOT NULL DEFAULT '',
    proposed_location TEXT NOT NULL DEFAULT '',
    proposed_date TEXT NOT NULL DEFAULT '',
    proposed_time_window TEXT NOT NULL DEFAULT '',
    proposed_by TEXT NOT NULL DEFAULT 'owner' CHECK (proposed_by IN ('owner', 'finder')),
    
    owner_confirmed_at TIMESTAMPTZ,
    finder_confirmed_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    
    finder_action_token TEXT NOT NULL DEFAULT '',
    token_expires_at TIMESTAMPTZ,
    
    issue_reason TEXT NOT NULL DEFAULT '',
    cancellation_reason TEXT NOT NULL DEFAULT '',
    workflow_version TEXT NOT NULL DEFAULT 'v1',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handovers_owner ON handovers(owner_id);
CREATE INDEX IF NOT EXISTS idx_handovers_finder ON handovers(finder_id);
CREATE INDEX IF NOT EXISTS idx_handovers_state ON handovers(state);
CREATE INDEX IF NOT EXISTS idx_handovers_token ON handovers(finder_action_token);

-- 2. TABLE: recovery_events
CREATE TABLE IF NOT EXISTS recovery_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    candidate_match_id UUID REFERENCES candidate_matches(id) ON DELETE SET NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_events_rep ON recovery_events(report_id);
CREATE INDEX IF NOT EXISTS idx_recovery_events_actor ON recovery_events(actor_id);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own handovers" ON handovers;
DROP POLICY IF EXISTS "Finders can view own handovers" ON handovers;
DROP POLICY IF EXISTS "Staff can view all handovers" ON handovers;
DROP POLICY IF EXISTS "Staff can update all handovers" ON handovers;

CREATE POLICY "Owners can view own handovers"
    ON handovers FOR SELECT
    USING (owner_id = auth.uid()::text);

CREATE POLICY "Finders can view own handovers"
    ON handovers FOR SELECT
    USING (finder_id = auth.uid()::text);

CREATE POLICY "Staff can view all handovers"
    ON handovers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );

CREATE POLICY "Participants can view recovery events"
    ON recovery_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM handovers
            WHERE handovers.report_id = recovery_events.report_id
              AND (handovers.owner_id = auth.uid()::text OR handovers.finder_id = auth.uid()::text)
        ) OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );
