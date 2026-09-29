-- =============================================================================
-- KHOJ — PHASE 11: REAL RVU CONTROLLED PILOT SCHEMA
-- Pilot Ground Truth Recording, Operational Incident Tracking & Audit Logging
-- =============================================================================

-- 1. TABLE: pilot_ground_truth
-- Records independent ground truth for every real pilot found-item case
CREATE TABLE IF NOT EXISTS pilot_ground_truth (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    true_owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    true_item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
    has_real_match BOOLEAN NOT NULL DEFAULT false,
    candidate_rank INTEGER,
    verification_result TEXT NOT NULL CHECK (verification_result IN ('passed', 'failed', 'generic_rejected', 'unverified', 'skipped')),
    handover_result TEXT NOT NULL CHECK (handover_result IN ('completed', 'cancelled', 'disputed', 'uninitiated')),
    returned_result TEXT NOT NULL CHECK (returned_result IN ('RETURNED', 'UNRETURNED')),
    case_classification TEXT NOT NULL CHECK (case_classification IN ('RETURNED', 'UNRETURNED', 'NO_MATCH', 'MANUAL_REVIEW', 'DISPUTED', 'UNKNOWN')),
    failure_stage TEXT NOT NULL CHECK (failure_stage IN (
        'NONE',
        'NO_FINDER',
        'NO_MATCH',
        'RETRIEVAL_FAILURE',
        'RERANKING_FAILURE',
        'VERIFICATION_FAILURE',
        'OWNER_UNAVAILABLE',
        'FINDER_UNAVAILABLE',
        'HANDOVER_FAILURE',
        'DISPUTE',
        'DATA_QUALITY',
        'OTHER'
    )),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_gt_report ON pilot_ground_truth(report_id);
CREATE INDEX IF NOT EXISTS idx_pilot_gt_item ON pilot_ground_truth(true_item_id);
CREATE INDEX IF NOT EXISTS idx_pilot_gt_classification ON pilot_ground_truth(case_classification);
CREATE INDEX IF NOT EXISTS idx_pilot_gt_failure ON pilot_ground_truth(failure_stage);

-- 2. TABLE: pilot_incidents
-- Operational incident handling (safety, dispute, impersonation, wrong item)
CREATE TABLE IF NOT EXISTS pilot_incidents (
    id TEXT PRIMARY KEY,
    report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'wrong_item',
        'suspicious_behavior',
        'safety_concern',
        'impersonation',
        'disputed_ownership',
        'handover_dispute',
        'reward_dispute'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reported_by TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')) DEFAULT 'open',
    resolution_notes TEXT,
    resolved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pilot_incidents_report ON pilot_incidents(report_id);
CREATE INDEX IF NOT EXISTS idx_pilot_incidents_status ON pilot_incidents(status);
CREATE INDEX IF NOT EXISTS idx_pilot_incidents_type ON pilot_incidents(incident_type);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE pilot_ground_truth ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage pilot ground truth" ON pilot_ground_truth;
DROP POLICY IF EXISTS "Staff can manage pilot incidents" ON pilot_incidents;

CREATE POLICY "Staff can manage pilot ground truth"
    ON pilot_ground_truth FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND (users.role = 'staff' OR users.role = 'admin')
        )
    );

CREATE POLICY "Staff can manage pilot incidents"
    ON pilot_incidents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND (users.role = 'staff' OR users.role = 'admin')
        )
    );
