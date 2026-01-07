-- Music Publishing System - Initial Database Schema
-- Version: 001
-- Description: Complete schema for music publishing royalty management

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'songwriter', 'viewer', 'manager', 'analyst')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- SONGWRITERS
-- ============================================
CREATE TABLE IF NOT EXISTS songwriters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    legal_name VARCHAR(255) NOT NULL,
    stage_name VARCHAR(255),
    ipi_number VARCHAR(20) UNIQUE,  -- Interested Parties Information
    pro_affiliation VARCHAR(100),    -- ASCAP, BMI, SESAC, etc.
    tax_id_encrypted BYTEA,
    address JSONB,
    payment_info JSONB,              -- Encrypted payment details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_songwriters_ipi ON songwriters(ipi_number);
CREATE INDEX IF NOT EXISTS idx_songwriters_user ON songwriters(user_id);
CREATE INDEX IF NOT EXISTS idx_songwriters_name ON songwriters USING GIN (to_tsvector('english', legal_name));

-- ============================================
-- WORKS MANAGEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    alternate_titles TEXT[],
    iswc VARCHAR(15) UNIQUE,         -- International Standard Musical Work Code
    language VARCHAR(10),
    genre VARCHAR(100),
    release_date DATE,
    duration_seconds INTEGER,
    lyrics TEXT,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disputed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Vector embeddings for AI matching
    title_embedding vector(1536),
    metadata_embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_works_title ON works USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_works_iswc ON works(iswc);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_works_title_trgm ON works USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_works_title_vector ON works USING ivfflat (title_embedding vector_cosine_ops) WITH (lists = 100);

-- Work-Songwriter relationship (writers on a work)
CREATE TABLE IF NOT EXISTS work_writers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    songwriter_id UUID NOT NULL REFERENCES songwriters(id),
    writer_role VARCHAR(50) CHECK (writer_role IN ('composer', 'lyricist', 'composer_lyricist', 'arranger', 'adapter')),
    ownership_share DECIMAL(5,2) NOT NULL CHECK (ownership_share > 0 AND ownership_share <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(work_id, songwriter_id)
);

CREATE INDEX IF NOT EXISTS idx_work_writers_work ON work_writers(work_id);
CREATE INDEX IF NOT EXISTS idx_work_writers_songwriter ON work_writers(songwriter_id);

-- Recordings linked to works (for matching)
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    isrc VARCHAR(12) UNIQUE,         -- International Standard Recording Code
    title VARCHAR(500) NOT NULL,
    artist_name VARCHAR(255),
    version_type VARCHAR(50),        -- original, remix, live, acoustic
    duration_seconds INTEGER,
    release_date DATE,
    label VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_isrc ON recordings(isrc);
CREATE INDEX IF NOT EXISTS idx_recordings_work ON recordings(work_id);
CREATE INDEX IF NOT EXISTS idx_recordings_artist ON recordings USING GIN (to_tsvector('english', artist_name));
CREATE INDEX IF NOT EXISTS idx_recordings_artist_trgm ON recordings USING GIN (artist_name gin_trgm_ops);

-- ============================================
-- DEALS / AGREEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_number VARCHAR(50) UNIQUE NOT NULL,
    songwriter_id UUID NOT NULL REFERENCES songwriters(id),
    deal_type VARCHAR(50) NOT NULL CHECK (deal_type IN (
        'publishing', 'co_publishing', 'administration',
        'sub_publishing', 'sync_license', 'mechanical_license'
    )),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'expired', 'terminated')),

    -- Financial Terms
    advance_amount DECIMAL(12,2) DEFAULT 0,
    advance_recouped DECIMAL(12,2) DEFAULT 0,
    publisher_share DECIMAL(5,2) NOT NULL,  -- Publisher's percentage
    writer_share DECIMAL(5,2) NOT NULL,     -- Writer's percentage

    -- Term Details
    effective_date DATE NOT NULL,
    expiration_date DATE,
    term_months INTEGER,
    retention_period_months INTEGER,        -- Rights retention after term

    -- Scope
    territories TEXT[] DEFAULT ARRAY['WORLD'],
    rights_granted TEXT[] DEFAULT ARRAY['ALL'],
    excluded_rights TEXT[],

    -- Contract Details
    contract_document_url VARCHAR(500),
    contract_embedding vector(1536),        -- For AI contract analysis
    special_terms JSONB DEFAULT '{}',

    -- Audit Trail
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_shares CHECK (publisher_share + writer_share = 100)
);

CREATE INDEX IF NOT EXISTS idx_deals_songwriter ON deals(songwriter_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_dates ON deals(effective_date, expiration_date);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(deal_type);

-- Link deals to specific works
CREATE TABLE IF NOT EXISTS deal_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id),
    included_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    excluded_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,

    UNIQUE(deal_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_works_deal ON deal_works(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_works_work ON deal_works(work_id);

-- ============================================
-- USAGE DATA (Streaming/Performance Data)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source Information
    source VARCHAR(100) NOT NULL,           -- spotify, apple_music, radio_station, etc.
    source_event_id VARCHAR(255),           -- Original ID from source

    -- Content Identification
    isrc VARCHAR(12),
    reported_title VARCHAR(500),
    reported_artist VARCHAR(255),
    reported_album VARCHAR(255),

    -- Usage Details
    usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN (
        'stream', 'download', 'radio_play', 'tv_broadcast',
        'public_performance', 'sync', 'mechanical'
    )),
    play_count BIGINT DEFAULT 1,
    revenue_amount DECIMAL(12,6),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Geographic & Temporal
    territory VARCHAR(5),                   -- ISO country code
    usage_date DATE NOT NULL,
    reporting_period VARCHAR(20),           -- Q1_2024, 2024_01, etc.

    -- Processing Status
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'matched', 'unmatched', 'disputed', 'error'
    )),

    -- Raw Data
    raw_payload JSONB,

    -- Timestamps
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,

    -- Embedding for fuzzy matching
    content_embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_usage_isrc ON usage_events(isrc);
CREATE INDEX IF NOT EXISTS idx_usage_status ON usage_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage_events(reporting_period);
CREATE INDEX IF NOT EXISTS idx_usage_source ON usage_events(source);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_events(usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_title_trgm ON usage_events USING GIN (reported_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_usage_embedding ON usage_events USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- MATCHED USAGE (Usage linked to Works)
-- ============================================
CREATE TABLE IF NOT EXISTS matched_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usage_event_id UUID NOT NULL REFERENCES usage_events(id),
    work_id UUID NOT NULL REFERENCES works(id),
    recording_id UUID REFERENCES recordings(id),

    -- Matching Details
    match_confidence DECIMAL(5,4) NOT NULL CHECK (match_confidence BETWEEN 0 AND 1),
    match_method VARCHAR(50) NOT NULL CHECK (match_method IN (
        'isrc_exact', 'iswc_exact', 'title_artist_exact',
        'fuzzy_title', 'ai_embedding', 'manual'
    )),
    matched_by VARCHAR(100),                -- 'system' or user_id

    -- Override for disputes
    is_confirmed BOOLEAN DEFAULT false,
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,

    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(usage_event_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_matched_usage_event ON matched_usage(usage_event_id);
CREATE INDEX IF NOT EXISTS idx_matched_usage_work ON matched_usage(work_id);
CREATE INDEX IF NOT EXISTS idx_matched_confidence ON matched_usage(match_confidence);

-- ============================================
-- ROYALTIES
-- ============================================
CREATE TABLE IF NOT EXISTS royalty_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_code VARCHAR(20) UNIQUE NOT NULL,  -- Q1_2024
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'calculating', 'calculated', 'approved', 'paid')),
    calculation_started_at TIMESTAMP WITH TIME ZONE,
    calculation_completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_royalty_periods_code ON royalty_periods(period_code);
CREATE INDEX IF NOT EXISTS idx_royalty_periods_status ON royalty_periods(status);

CREATE TABLE IF NOT EXISTS royalty_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id UUID NOT NULL REFERENCES royalty_periods(id),
    songwriter_id UUID NOT NULL REFERENCES songwriters(id),

    -- Summary Amounts
    gross_royalties DECIMAL(12,2) NOT NULL DEFAULT 0,
    publisher_share DECIMAL(12,2) NOT NULL DEFAULT 0,
    writer_share DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Deductions
    advance_recoupment DECIMAL(12,2) DEFAULT 0,
    withholding_tax DECIMAL(12,2) DEFAULT 0,
    other_deductions DECIMAL(12,2) DEFAULT 0,

    -- Net Payable
    net_payable DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'sent', 'paid')),

    -- Payment Info
    payment_date DATE,
    payment_reference VARCHAR(100),

    -- Document
    statement_pdf_url VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(period_id, songwriter_id)
);

CREATE INDEX IF NOT EXISTS idx_royalty_statements_songwriter ON royalty_statements(songwriter_id);
CREATE INDEX IF NOT EXISTS idx_royalty_statements_period ON royalty_statements(period_id);
CREATE INDEX IF NOT EXISTS idx_royalty_statements_status ON royalty_statements(status);

-- Detailed royalty line items
CREATE TABLE IF NOT EXISTS royalty_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    statement_id UUID NOT NULL REFERENCES royalty_statements(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id),
    work_id UUID NOT NULL REFERENCES works(id),

    -- Source Breakdown
    usage_type VARCHAR(50) NOT NULL,
    territory VARCHAR(5),
    source VARCHAR(100),

    -- Amounts
    usage_count BIGINT NOT NULL DEFAULT 0,
    gross_revenue DECIMAL(12,6) NOT NULL DEFAULT 0,
    publisher_rate DECIMAL(5,4) NOT NULL,
    calculated_royalty DECIMAL(12,6) NOT NULL DEFAULT 0,

    -- Audit
    calculation_details JSONB DEFAULT '{}',
    matched_usage_ids UUID[]
);

CREATE INDEX IF NOT EXISTS idx_royalty_items_statement ON royalty_line_items(statement_id);
CREATE INDEX IF NOT EXISTS idx_royalty_items_work ON royalty_line_items(work_id);
CREATE INDEX IF NOT EXISTS idx_royalty_items_deal ON royalty_line_items(deal_id);

-- ============================================
-- CONTRACT TEMPLATES (For AI Generation)
-- ============================================
CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    deal_type VARCHAR(50) NOT NULL,
    template_content TEXT NOT NULL,
    template_variables JSONB NOT NULL,      -- Required variables
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    content_embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates(deal_type);
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON contract_templates(is_active);

-- ============================================
-- EVENT SOURCING / OUTBOX
-- ============================================
CREATE TABLE IF NOT EXISTS event_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON event_outbox(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_created ON event_outbox(created_at);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================
-- REFRESH TOKENS (for auth)
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songwriters_updated_at BEFORE UPDATE ON songwriters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON works
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_royalty_statements_updated_at BEFORE UPDATE ON royalty_statements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON contract_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
