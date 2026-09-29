-- =============================================================================
-- KHOJ — PHASE 1: PRODUCTION DATA FOUNDATION
-- Multimodal Matching Engine Additive Schema (Supabase / Postgres)
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE ON VECTOR EXTENSION:
-- In Phase 1, we do NOT invent or hardcode arbitrary embedding dimensions.
-- Once the multimodal embedding provider (e.g. Gemini Multimodal or OpenAI text-embedding-3)
-- is selected in a future phase, activate pgvector via:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE item_fingerprints ADD COLUMN text_embedding vector(DIMENSION);
-- ALTER TABLE item_fingerprints ADD COLUMN image_embedding vector(DIMENSION);
-- ALTER TABLE found_fingerprints ADD COLUMN image_embedding vector(DIMENSION);

-- 2. TABLE: item_fingerprints
-- Represents the canonical structured feature set of a student's registered belonging.
CREATE TABLE IF NOT EXISTS item_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id TEXT NOT NULL REFERENCES protected_items(id) ON DELETE CASCADE,
    
    category TEXT NOT NULL,
    subcategory TEXT,
    
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    material TEXT,
    
    visible_text JSONB NOT NULL DEFAULT '[]'::jsonb,
    logos JSONB NOT NULL DEFAULT '[]'::jsonb,
    accessories JSONB NOT NULL DEFAULT '[]'::jsonb,
    distinctive_features JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    condition TEXT NOT NULL DEFAULT 'unknown',
    
    owner_description TEXT NOT NULL DEFAULT '',
    normalized_description TEXT NOT NULL DEFAULT '',
    
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    image_reference TEXT,
    text_embedding_reference TEXT,
    image_embedding_reference TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_fingerprint_per_item UNIQUE (item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_fingerprints_category ON item_fingerprints(category);
CREATE INDEX IF NOT EXISTS idx_item_fingerprints_brand ON item_fingerprints(brand);
CREATE INDEX IF NOT EXISTS idx_item_fingerprints_item ON item_fingerprints(item_id);

-- 3. TABLE: found_fingerprints
-- Represents what KHOJ's vision and context understand from a finder's photo submission.
CREATE TABLE IF NOT EXISTS found_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    found_report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    
    category TEXT NOT NULL,
    subcategory TEXT,
    
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    material TEXT,
    
    visible_text JSONB NOT NULL DEFAULT '[]'::jsonb,
    logos JSONB NOT NULL DEFAULT '[]'::jsonb,
    accessories JSONB NOT NULL DEFAULT '[]'::jsonb,
    distinctive_features JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    condition TEXT NOT NULL DEFAULT 'unknown',
    visual_description TEXT NOT NULL DEFAULT '',
    
    found_location TEXT NOT NULL DEFAULT '',
    found_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    image_reference TEXT,
    image_embedding_reference TEXT,
    
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_fingerprint_per_found_report UNIQUE (found_report_id)
);

CREATE INDEX IF NOT EXISTS idx_found_fingerprints_category ON found_fingerprints(category);
CREATE INDEX IF NOT EXISTS idx_found_fingerprints_report ON found_fingerprints(found_report_id);

-- 4. TABLE: candidate_matches
-- Ranked candidate pairings generated between found reports and registered items.
-- CRITICAL RULE: A candidate match is NOT an ownership declaration.
CREATE TABLE IF NOT EXISTS candidate_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    found_report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES protected_items(id) ON DELETE CASCADE,
    
    vector_similarity REAL,
    attribute_score INTEGER NOT NULL DEFAULT 0 CHECK (attribute_score BETWEEN 0 AND 100),
    unique_clue_score INTEGER NOT NULL DEFAULT 0 CHECK (unique_clue_score BETWEEN 0 AND 100),
    location_score INTEGER NOT NULL DEFAULT 0 CHECK (location_score BETWEEN 0 AND 100),
    time_score INTEGER NOT NULL DEFAULT 0 CHECK (time_score BETWEEN 0 AND 100),
    
    overall_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
    
    confidence_tier TEXT NOT NULL CHECK (confidence_tier IN ('high', 'medium', 'low')),
    status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'verification_required', 'verified', 'rejected', 'expired')),
    
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_candidate_pair UNIQUE (found_report_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_matches_found ON candidate_matches(found_report_id);
CREATE INDEX IF NOT EXISTS idx_candidate_matches_item ON candidate_matches(item_id);
CREATE INDEX IF NOT EXISTS idx_candidate_matches_score ON candidate_matches(overall_score DESC);

-- 5. TABLE: verification_evidence
-- Stores blind challenge-response verification records for candidate matches.
CREATE TABLE IF NOT EXISTS verification_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_match_id UUID NOT NULL REFERENCES candidate_matches(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES protected_items(id) ON DELETE CASCADE,
    
    question TEXT NOT NULL,
    owner_answer TEXT NOT NULL,
    expected_evidence TEXT NOT NULL,
    
    result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'passed', 'failed')),
    evidence_source TEXT NOT NULL DEFAULT 'owner_registration',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_evidence_candidate ON verification_evidence(candidate_match_id);
CREATE INDEX IF NOT EXISTS idx_verification_evidence_item ON verification_evidence(item_id);

-- =============================================================================
-- SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all Phase 1 tables
ALTER TABLE item_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE found_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_evidence ENABLE ROW LEVEL SECURITY;

-- 1. item_fingerprints Policies
-- Owners can only read/update fingerprints of items they own.
CREATE POLICY "Owners can view own item fingerprints"
    ON item_fingerprints FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM protected_items
            WHERE protected_items.id = item_fingerprints.item_id
              AND protected_items.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Owners can update own item fingerprints"
    ON item_fingerprints FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM protected_items
            WHERE protected_items.id = item_fingerprints.item_id
              AND protected_items.user_id = auth.uid()::text
        )
    );

-- 2. found_fingerprints Policies
-- Public/anonymous users can NEVER read private found fingerprints directly.
-- Only authenticated university staff or system processes can query found fingerprints.
CREATE POLICY "Staff can view found fingerprints"
    ON found_fingerprints FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
              AND users.role = 'staff'
        )
    );

-- 3. candidate_matches Policies
-- Item owners can only view candidate matches for items they own.
-- Public/finders have NO direct select access.
CREATE POLICY "Owners can view candidate matches for their items"
    ON candidate_matches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM protected_items
            WHERE protected_items.id = candidate_matches.item_id
              AND protected_items.user_id = auth.uid()::text
        )
    );

-- 4. verification_evidence Policies
-- Only the owner of the item under verification can view their verification questions.
CREATE POLICY "Owners can view verification evidence for their items"
    ON verification_evidence FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM protected_items
            WHERE protected_items.id = verification_evidence.item_id
              AND protected_items.user_id = auth.uid()::text
        )
    );
