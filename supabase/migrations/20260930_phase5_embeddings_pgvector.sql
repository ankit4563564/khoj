-- =============================================================================
-- KHOJ — PHASE 5: EMBEDDINGS + PGVECTOR RETRIEVAL ENGINE MIGRATION
-- Vector storage, pgvector extension, HNSW cosine index, and search RPC
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- 2. TABLE: fingerprint_embeddings
-- Stores 768-dimensional normalized vector embeddings generated from structured fingerprints.
-- Model: Google Gemini text-embedding-004 (Dimension: 768)
-- =============================================================================

CREATE TABLE IF NOT EXISTS fingerprint_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('owner_item', 'found_report')),
    modality TEXT NOT NULL CHECK (modality IN ('text_structured', 'image_visual')),
    
    embedding vector(768) NOT NULL,
    
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    dimension INTEGER NOT NULL DEFAULT 768,
    
    content_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'stale')),
    error_message TEXT,
    
    category TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_fingerprint_embedding UNIQUE (source_id, modality, model_name, model_version)
);

-- =============================================================================
-- 3. INDEXES
-- HNSW Cosine Index for fast, exact-or-approximate Top-K vector retrieval
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_hnsw 
    ON fingerprint_embeddings 
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_source 
    ON fingerprint_embeddings (source_id, source_type);

CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_cat_status 
    ON fingerprint_embeddings (category, status);

CREATE INDEX IF NOT EXISTS idx_fingerprint_embeddings_hash 
    ON fingerprint_embeddings (content_hash);

-- =============================================================================
-- 4. RPC FUNCTION: match_fingerprint_embeddings
-- Performs cosine similarity search against active, ready vector embeddings.
-- Cosine similarity = 1 - (embedding <=> query_embedding)
-- =============================================================================

CREATE OR REPLACE FUNCTION match_fingerprint_embeddings (
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    filter_source_type text DEFAULT 'owner_item',
    filter_category text DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_id TEXT,
    source_type TEXT,
    modality TEXT,
    similarity float,
    category TEXT,
    model_name TEXT,
    model_version TEXT,
    metadata JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fe.id,
        fe.source_id,
        fe.source_type,
        fe.modality,
        1 - (fe.embedding <=> query_embedding) AS similarity,
        fe.category,
        fe.model_name,
        fe.model_version,
        fe.metadata
    FROM fingerprint_embeddings fe
    WHERE fe.status = 'ready'
      AND fe.source_type = filter_source_type
      AND (filter_category IS NULL OR fe.category = filter_category)
      AND (1 - (fe.embedding <=> query_embedding)) >= match_threshold
    ORDER BY fe.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- Strictly prevents public access to internal embeddings and vector similarity queries.
-- =============================================================================

ALTER TABLE fingerprint_embeddings ENABLE ROW LEVEL SECURITY;

-- Service role bypass for background pipelines and matching engine
CREATE POLICY "Service role full access on fingerprint_embeddings"
    ON fingerprint_embeddings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated students may view embeddings only for items they own
CREATE POLICY "Students can view embeddings for their own protected items"
    ON fingerprint_embeddings
    FOR SELECT
    TO authenticated
    USING (
        source_type = 'owner_item' AND
        EXISTS (
            SELECT 1 FROM protected_items pi
            WHERE pi.id = fingerprint_embeddings.source_id
              AND pi.user_id = auth.uid()::text
        )
    );
