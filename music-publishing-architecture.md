# Music Publishing Royalty Management System
## Architecture Design Document

---

## 1. Executive Summary

This document outlines the architecture for a modern, AI-enhanced music publishing royalty management system. The system ingests usage data via Kafka, processes royalty calculations, manages works and deals, and provides separate portals for administrators and songwriters.

### Key Design Principles
- **Event-Driven Architecture**: Kafka-based streaming for real-time usage processing
- **AI-First Design**: LLM-powered contract generation, intelligent matching, and natural language queries
- **Modular Services**: Loosely coupled microservices for scalability and maintainability
- **Domain-Driven Design**: Clear bounded contexts for Works, Deals, Royalties, and Users

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              MUSIC PUBLISHING SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Licensed   │    │    Kafka     │    │   Usage      │    │  PostgreSQL  │       │
│  │    Users     │───▶│   Cluster    │───▶│  Processor   │───▶│   Database   │       │
│  │  (DSPs etc)  │    │              │    │   Service    │    │  + pgvector  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘       │
│                             │                   │                    ▲              │
│                             ▼                   ▼                    │              │
│                      ┌──────────────┐    ┌──────────────┐           │              │
│                      │   Event      │    │   Matching   │           │              │
│                      │   Store      │    │    Agent     │───────────┤              │
│                      │  (Outbox)    │    │  (LangGraph) │           │              │
│                      └──────────────┘    └──────────────┘           │              │
│                                                                      │              │
│  ┌─────────────────────────────────────────────────────────────────┐│              │
│  │                     FastAPI Services Layer                       ││              │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   ││              │
│  │  │  Works  │ │  Deals  │ │Royalties│ │  Auth   │ │   AI    │   ││              │
│  │  │ Service │ │ Service │ │ Service │ │ Service │ │ Agents  │───┼┘              │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │               │
│  └─────────────────────────────────────────────────────────────────┘               │
│         ▲              ▲              ▲              ▲                              │
│         │              │              │              │                              │
│  ┌──────┴──────────────┴──────────────┴──────────────┴──────┐                      │
│  │                    API Gateway (Kong/Nginx)               │                      │
│  └──────────────────────────────────────────────────────────┘                      │
│         ▲                                            ▲                              │
│         │                                            │                              │
│  ┌──────┴──────────┐                    ┌───────────┴────────┐                     │
│  │  Admin Portal   │                    │  Songwriter Portal │                     │
│  │  (React App)    │                    │    (React App)     │                     │
│  └─────────────────┘                    └────────────────────┘                     │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Model

### 3.1 Core Entities

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN MODEL                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐               │
│  │    WORK     │         │    DEAL     │         │  SONGWRITER │               │
│  ├─────────────┤    *    ├─────────────┤    *    ├─────────────┤               │
│  │ id          │◄───────▶│ id          │◄───────▶│ id          │               │
│  │ title       │         │ work_id     │         │ name        │               │
│  │ iswc        │         │ songwriter_id│        │ ipi_number  │               │
│  │ writers[]   │         │ share_pct   │         │ pro_affil.  │               │
│  │ publishers[]│         │ deal_type   │         │ email       │               │
│  │ created_at  │         │ territory[] │         │ user_id     │               │
│  │ metadata    │         │ start_date  │         └─────────────┘               │
│  └─────────────┘         │ end_date    │                                        │
│         │                │ terms{}     │                                        │
│         │                │ status      │         ┌─────────────┐               │
│         │                └─────────────┘         │   ROYALTY   │               │
│         │                       │                ├─────────────┤               │
│         │                       │           *    │ id          │               │
│         │                       └───────────────▶│ deal_id     │               │
│         │                                        │ period      │               │
│         ▼                                        │ gross_amt   │               │
│  ┌─────────────┐         ┌─────────────┐        │ net_amt     │               │
│  │   USAGE     │────────▶│  MATCHED    │───────▶│ usage_ids[] │               │
│  ├─────────────┤         │   USAGE     │        │ status      │               │
│  │ id          │         ├─────────────┤        │ paid_at     │               │
│  │ source      │         │ id          │        └─────────────┘               │
│  │ isrc        │         │ usage_id    │                                        │
│  │ title       │         │ work_id     │                                        │
│  │ artist      │         │ confidence  │                                        │
│  │ play_count  │         │ match_type  │                                        │
│  │ revenue     │         │ matched_at  │                                        │
│  │ territory   │         └─────────────┘                                        │
│  │ period      │                                                                 │
│  │ raw_data    │                                                                 │
│  └─────────────┘                                                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Entity Relationships

| Relationship | Description |
|--------------|-------------|
| Work → Deal | One work can have multiple deals (different writers/territories) |
| Songwriter → Deal | One songwriter can have multiple deals across works |
| Deal → Royalty | Each deal generates royalties per calculation period |
| Usage → Matched Usage | Raw usage linked to identified works |
| Matched Usage → Royalty | Aggregated matched usage feeds royalty calculations |

---

## 4. Database Schema (PostgreSQL)

### 4.1 Core Tables

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for AI embeddings

-- ============================================
-- SONGWRITER / USER MANAGEMENT
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'songwriter', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE songwriters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
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

CREATE INDEX idx_songwriters_ipi ON songwriters(ipi_number);
CREATE INDEX idx_songwriters_user ON songwriters(user_id);

-- ============================================
-- WORKS MANAGEMENT
-- ============================================
CREATE TABLE works (
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
    
    -- Vector embedding for AI matching
    title_embedding vector(1536),
    metadata_embedding vector(1536)
);

CREATE INDEX idx_works_title ON works USING GIN (to_tsvector('english', title));
CREATE INDEX idx_works_iswc ON works(iswc);
CREATE INDEX idx_works_title_vector ON works USING ivfflat (title_embedding vector_cosine_ops);

-- Work-Songwriter relationship (writers on a work)
CREATE TABLE work_writers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    songwriter_id UUID NOT NULL REFERENCES songwriters(id),
    writer_role VARCHAR(50) CHECK (writer_role IN ('composer', 'lyricist', 'composer_lyricist', 'arranger', 'adapter')),
    ownership_share DECIMAL(5,2) NOT NULL CHECK (ownership_share > 0 AND ownership_share <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(work_id, songwriter_id)
);

-- Recordings linked to works (for matching)
CREATE TABLE recordings (
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

CREATE INDEX idx_recordings_isrc ON recordings(isrc);
CREATE INDEX idx_recordings_work ON recordings(work_id);
CREATE INDEX idx_recordings_artist ON recordings USING GIN (to_tsvector('english', artist_name));

-- ============================================
-- DEALS / AGREEMENTS
-- ============================================
CREATE TABLE deals (
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

CREATE INDEX idx_deals_songwriter ON deals(songwriter_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_dates ON deals(effective_date, expiration_date);

-- Link deals to specific works
CREATE TABLE deal_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id),
    included_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    excluded_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    UNIQUE(deal_id, work_id)
);

CREATE INDEX idx_deal_works_deal ON deal_works(deal_id);
CREATE INDEX idx_deal_works_work ON deal_works(work_id);

-- ============================================
-- USAGE DATA (Streaming/Performance Data)
-- ============================================
CREATE TABLE usage_events (
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

CREATE INDEX idx_usage_isrc ON usage_events(isrc);
CREATE INDEX idx_usage_status ON usage_events(processing_status);
CREATE INDEX idx_usage_period ON usage_events(reporting_period);
CREATE INDEX idx_usage_source ON usage_events(source);
CREATE INDEX idx_usage_date ON usage_events(usage_date);
CREATE INDEX idx_usage_embedding ON usage_events USING ivfflat (content_embedding vector_cosine_ops);

-- Partitioning for usage_events by reporting period (for scale)
-- CREATE TABLE usage_events_2024_q1 PARTITION OF usage_events FOR VALUES FROM ('2024_Q1') TO ('2024_Q2');

-- ============================================
-- MATCHED USAGE (Usage linked to Works)
-- ============================================
CREATE TABLE matched_usage (
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

CREATE INDEX idx_matched_usage_event ON matched_usage(usage_event_id);
CREATE INDEX idx_matched_usage_work ON matched_usage(work_id);
CREATE INDEX idx_matched_confidence ON matched_usage(match_confidence);

-- ============================================
-- ROYALTIES
-- ============================================
CREATE TABLE royalty_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_code VARCHAR(20) UNIQUE NOT NULL,  -- Q1_2024
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'calculating', 'calculated', 'approved', 'paid')),
    calculation_started_at TIMESTAMP WITH TIME ZONE,
    calculation_completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id)
);

CREATE TABLE royalty_statements (
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

CREATE INDEX idx_royalty_statements_songwriter ON royalty_statements(songwriter_id);
CREATE INDEX idx_royalty_statements_period ON royalty_statements(period_id);
CREATE INDEX idx_royalty_statements_status ON royalty_statements(status);

-- Detailed royalty line items
CREATE TABLE royalty_line_items (
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

CREATE INDEX idx_royalty_items_statement ON royalty_line_items(statement_id);
CREATE INDEX idx_royalty_items_work ON royalty_line_items(work_id);
CREATE INDEX idx_royalty_items_deal ON royalty_line_items(deal_id);

-- ============================================
-- CONTRACT TEMPLATES (For AI Generation)
-- ============================================
CREATE TABLE contract_templates (
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

-- ============================================
-- EVENT SOURCING / OUTBOX
-- ============================================
CREATE TABLE event_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed'))
);

CREATE INDEX idx_outbox_status ON event_outbox(status) WHERE status = 'pending';
CREATE INDEX idx_outbox_created ON event_outbox(created_at);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
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

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

---

## 5. Event Streaming Architecture (Kafka)

### 5.1 Topic Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KAFKA TOPIC ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  INGESTION TOPICS (External → System)                                           │
│  ─────────────────────────────────────                                          │
│  ┌─────────────────────────────────────────────────────────────────┐           │
│  │ usage.raw.spotify          │  Raw usage from Spotify            │           │
│  │ usage.raw.apple_music      │  Raw usage from Apple Music        │           │
│  │ usage.raw.radio            │  Radio play reports                │           │
│  │ usage.raw.sync             │  Sync license usage                │           │
│  │ usage.raw.generic          │  Other DSP/platform data           │           │
│  └─────────────────────────────────────────────────────────────────┘           │
│                              │                                                   │
│                              ▼                                                   │
│  PROCESSING TOPICS (Internal)                                                   │
│  ─────────────────────────────                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐           │
│  │ usage.normalized           │  Standardized usage events         │           │
│  │ usage.matched              │  Successfully matched to works     │           │
│  │ usage.unmatched            │  Requires manual/AI matching       │           │
│  │ usage.disputed             │  Flagged for review                │           │
│  └─────────────────────────────────────────────────────────────────┘           │
│                              │                                                   │
│                              ▼                                                   │
│  DOMAIN EVENTS (System → Consumers)                                             │
│  ──────────────────────────────────                                             │
│  ┌─────────────────────────────────────────────────────────────────┐           │
│  │ works.events               │  Work created/updated/deleted      │           │
│  │ deals.events               │  Deal lifecycle events             │           │
│  │ royalties.events           │  Calculation/payment events        │           │
│  │ notifications.email        │  Email notification triggers       │           │
│  │ notifications.push         │  Push notification triggers        │           │
│  └─────────────────────────────────────────────────────────────────┘           │
│                                                                                  │
│  DEAD LETTER QUEUES                                                             │
│  ──────────────────                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐           │
│  │ dlq.usage.processing       │  Failed usage processing           │           │
│  │ dlq.matching               │  Failed matching attempts          │           │
│  │ dlq.royalties              │  Failed royalty calculations       │           │
│  └─────────────────────────────────────────────────────────────────┘           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Event Schemas

```json
// Usage Event (usage.normalized)
{
    "event_id": "uuid",
    "event_type": "usage.normalized",
    "timestamp": "2024-01-15T10:30:00Z",
    "source": {
        "platform": "spotify",
        "original_event_id": "sp_123456",
        "report_date": "2024-01-01"
    },
    "content": {
        "isrc": "USRC12345678",
        "title": "Song Title",
        "artist": "Artist Name",
        "album": "Album Name"
    },
    "usage": {
        "type": "stream",
        "count": 1500000,
        "revenue": 4500.00,
        "currency": "USD"
    },
    "geography": {
        "territory": "US",
        "region": "North America"
    },
    "period": {
        "code": "2024_Q1",
        "start_date": "2024-01-01",
        "end_date": "2024-03-31"
    }
}

// Match Result Event (usage.matched)
{
    "event_id": "uuid",
    "event_type": "usage.matched",
    "timestamp": "2024-01-15T10:35:00Z",
    "usage_event_id": "original_usage_uuid",
    "match_result": {
        "work_id": "uuid",
        "recording_id": "uuid",
        "confidence": 0.95,
        "method": "isrc_exact",
        "alternative_matches": []
    }
}

// Royalty Calculated Event (royalties.events)
{
    "event_id": "uuid",
    "event_type": "royalty.statement.calculated",
    "timestamp": "2024-04-01T00:00:00Z",
    "statement": {
        "statement_id": "uuid",
        "period_id": "uuid",
        "period_code": "2024_Q1",
        "songwriter_id": "uuid",
        "gross_royalties": 15000.00,
        "net_payable": 12750.00
    }
}
```

---

## 6. Service Architecture

### 6.1 Service Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MICROSERVICES ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API GATEWAY (Kong)                               │   │
│  │    • Rate Limiting  • Auth Routing  • Request Logging  • SSL Term       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│         │           │            │            │            │                    │
│         ▼           ▼            ▼            ▼            ▼                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │   AUTH   │ │  WORKS   │ │  DEALS   │ │ ROYALTY  │ │   AI     │            │
│  │ SERVICE  │ │ SERVICE  │ │ SERVICE  │ │ SERVICE  │ │ SERVICE  │            │
│  │ :8001    │ │ :8002    │ │ :8003    │ │ :8004    │ │ :8005    │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│       │           │            │            │            │                     │
│       │           │            │            │            │                     │
│       └───────────┴────────────┴────────────┴────────────┘                     │
│                              │                                                   │
│                              ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                     SHARED INFRASTRUCTURE                                │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │   │
│  │   │PostgreSQL│  │  Redis   │  │  Kafka   │  │ Vector   │               │   │
│  │   │ Primary  │  │  Cache   │  │ Cluster  │  │   DB     │               │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  BACKGROUND WORKERS                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Usage      │  │   Matching   │  │   Royalty    │  │  Notification│       │
│  │  Processor   │  │    Agent     │  │  Calculator  │  │   Worker     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Service Specifications

#### Auth Service (Port 8001)
```
Responsibilities:
├── User authentication (JWT)
├── Role-based access control
├── Session management
├── Password reset flows
└── OAuth2 for third-party integration

Endpoints:
├── POST   /auth/login
├── POST   /auth/logout
├── POST   /auth/refresh
├── POST   /auth/register
├── GET    /auth/me
└── POST   /auth/password/reset
```

#### Works Service (Port 8002)
```
Responsibilities:
├── Work CRUD operations
├── Recording management
├── Writer/publisher associations
├── Work search (text + vector)
└── Metadata enrichment

Endpoints:
├── GET    /works
├── POST   /works
├── GET    /works/{id}
├── PUT    /works/{id}
├── DELETE /works/{id}
├── GET    /works/{id}/recordings
├── POST   /works/{id}/recordings
├── GET    /works/{id}/writers
├── POST   /works/{id}/writers
├── GET    /works/search
└── POST   /works/search/similar   (vector search)
```

#### Deals Service (Port 8003)
```
Responsibilities:
├── Deal/agreement management
├── Contract generation (AI)
├── Deal-work associations
├── Songwriter deal history
└── Deal term calculations

Endpoints:
├── GET    /deals
├── POST   /deals
├── GET    /deals/{id}
├── PUT    /deals/{id}
├── POST   /deals/{id}/works
├── DELETE /deals/{id}/works/{work_id}
├── POST   /deals/{id}/generate-contract
├── GET    /deals/{id}/contract
├── POST   /deals/{id}/sign
├── GET    /songwriters/{id}/deals
└── GET    /contracts/templates
```

#### Royalty Service (Port 8004)
```
Responsibilities:
├── Royalty period management
├── Statement generation
├── Royalty calculations
├── Payment processing hooks
└── Statement PDF generation

Endpoints:
├── GET    /royalties/periods
├── POST   /royalties/periods
├── GET    /royalties/periods/{id}
├── POST   /royalties/periods/{id}/calculate
├── GET    /royalties/statements
├── GET    /royalties/statements/{id}
├── GET    /royalties/statements/{id}/pdf
├── GET    /royalties/statements/{id}/line-items
├── GET    /songwriters/{id}/royalties
├── GET    /songwriters/{id}/royalties/summary
└── POST   /royalties/periods/{id}/approve
```

#### AI Service (Port 8005)
```
Responsibilities:
├── Contract generation (LangGraph)
├── Usage matching (embedding-based)
├── Natural language queries
├── Anomaly detection
└── Metadata enrichment

Endpoints:
├── POST   /ai/contracts/generate
├── POST   /ai/contracts/analyze
├── POST   /ai/matching/find-work
├── POST   /ai/matching/batch
├── POST   /ai/query/natural-language
├── GET    /ai/embeddings/{entity_type}/{id}
└── POST   /ai/embeddings/generate
```

---

## 7. AI/Agent Architecture (LangGraph)

### 7.1 Agent Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AI AGENT ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        LANGGRAPH ORCHESTRATOR                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                            │
│         ┌──────────────────────────┼──────────────────────────┐                │
│         │                          │                          │                 │
│         ▼                          ▼                          ▼                 │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐           │
│  │  CONTRACT    │         │   MATCHING   │         │    QUERY     │           │
│  │   AGENT      │         │    AGENT     │         │    AGENT     │           │
│  │              │         │              │         │              │           │
│  │ • Generate   │         │ • ISRC match │         │ • NL queries │           │
│  │ • Analyze    │         │ • Fuzzy match│         │ • SQL gen    │           │
│  │ • Summarize  │         │ • AI embed   │         │ • Report gen │           │
│  │ • Extract    │         │ • Confidence │         │ • Analytics  │           │
│  └──────────────┘         └──────────────┘         └──────────────┘           │
│         │                          │                          │                 │
│         │                          │                          │                 │
│         ▼                          ▼                          ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            TOOL REGISTRY                                 │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │   │
│  │  │ PostgreSQL │ │  pgvector  │ │  External  │ │  Document  │           │   │
│  │  │   Query    │ │   Search   │ │    APIs    │ │ Generation │           │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           RAG COMPONENTS                                 │   │
│  │                                                                          │   │
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐│   │
│  │  │  Contract        │    │  Work/Recording  │    │  Deal Terms        ││   │
│  │  │  Templates       │    │  Catalog         │    │  Knowledge Base    ││   │
│  │  │  (pgvector)      │    │  (pgvector)      │    │  (pgvector)        ││   │
│  │  └──────────────────┘    └──────────────────┘    └────────────────────┘│   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Contract Generation Agent (LangGraph Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     CONTRACT GENERATION WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐  │
│  │  START  │────▶│ ANALYZE │────▶│RETRIEVE │────▶│GENERATE │────▶│ REVIEW  │  │
│  │         │     │ REQUEST │     │TEMPLATES│     │ DRAFT   │     │         │  │
│  └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘  │
│                                                                        │        │
│                                        ┌───────────────────────────────┘        │
│                                        ▼                                        │
│                                 ┌─────────────┐                                 │
│                            ┌───▶│   REVISE    │◀───┐                           │
│                            │    └─────────────┘    │                           │
│                            │           │           │                           │
│                            │           ▼           │                           │
│                            │    ┌─────────────┐    │                           │
│                            └────│  VALIDATE   │────┘                           │
│                                 └─────────────┘                                 │
│                                        │                                        │
│                                        ▼                                        │
│                                 ┌─────────────┐                                 │
│                                 │  FINALIZE   │                                 │
│                                 └─────────────┘                                 │
│                                        │                                        │
│                                        ▼                                        │
│                                 ┌─────────────┐                                 │
│                                 │    END      │                                 │
│                                 └─────────────┘                                 │
│                                                                                  │
│  State Schema:                                                                   │
│  {                                                                               │
│    "deal_type": "publishing",                                                   │
│    "songwriter_info": {...},                                                    │
│    "deal_terms": {...},                                                         │
│    "template_matches": [...],                                                   │
│    "draft_contract": "...",                                                     │
│    "validation_result": {...},                                                  │
│    "revision_count": 0,                                                         │
│    "final_contract": "..."                                                      │
│  }                                                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Usage Matching Agent (LangGraph Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       USAGE MATCHING WORKFLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────┐     ┌─────────────┐     ┌─────────────────┐                       │
│  │  START  │────▶│   EXTRACT   │────▶│   ISRC/ISWC     │                       │
│  │         │     │   METADATA  │     │   EXACT MATCH   │                       │
│  └─────────┘     └─────────────┘     └─────────────────┘                       │
│                                               │                                  │
│                              ┌────────────────┴────────────────┐                │
│                              │                                 │                 │
│                              ▼                                 ▼                 │
│                      [Match Found]                     [No Match]               │
│                              │                                 │                 │
│                              ▼                                 ▼                 │
│                      ┌─────────────┐              ┌─────────────────┐           │
│                      │   CONFIRM   │              │  TITLE/ARTIST   │           │
│                      │   MATCH     │              │  FUZZY MATCH    │           │
│                      └─────────────┘              └─────────────────┘           │
│                              │                            │                      │
│                              │               ┌────────────┴────────────┐        │
│                              │               │                         │         │
│                              │               ▼                         ▼         │
│                              │       [Match Found]             [No Match]       │
│                              │               │                         │         │
│                              │               ▼                         ▼         │
│                              │       ┌─────────────┐       ┌─────────────────┐  │
│                              │       │   CONFIRM   │       │   EMBEDDING     │  │
│                              │       │   MATCH     │       │   SEARCH        │  │
│                              │       └─────────────┘       └─────────────────┘  │
│                              │               │                    │              │
│                              │               │        ┌───────────┴───────┐     │
│                              │               │        │                   │      │
│                              │               │        ▼                   ▼      │
│                              │               │  [High Conf.]       [Low Conf.]  │
│                              │               │        │                   │      │
│                              │               │        ▼                   ▼      │
│                              │               │ ┌───────────┐     ┌───────────┐  │
│                              │               │ │  CONFIRM  │     │   QUEUE   │  │
│                              │               │ │   MATCH   │     │  MANUAL   │  │
│                              │               │ └───────────┘     │  REVIEW   │  │
│                              │               │        │          └───────────┘  │
│                              │               │        │                │         │
│                              └───────────────┴────────┴────────────────┘        │
│                                              │                                   │
│                                              ▼                                   │
│                                       ┌─────────────┐                           │
│                                       │   PERSIST   │                           │
│                                       │   RESULT    │                           │
│                                       └─────────────┘                           │
│                                              │                                   │
│                                              ▼                                   │
│                                       ┌─────────────┐                           │
│                                       │    END      │                           │
│                                       └─────────────┘                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Flow Architecture

### 8.1 Usage Ingestion Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        USAGE DATA PIPELINE                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   DSP/Platform                                                                  │
│   ┌──────────┐                                                                  │
│   │ Spotify  │──┐                                                               │
│   └──────────┘  │                                                               │
│   ┌──────────┐  │     ┌──────────────┐     ┌──────────────┐                    │
│   │  Apple   │──┼────▶│    KAFKA     │────▶│    USAGE     │                    │
│   │  Music   │  │     │  Ingestion   │     │  PROCESSOR   │                    │
│   └──────────┘  │     │   Topics     │     │   SERVICE    │                    │
│   ┌──────────┐  │     └──────────────┘     └──────────────┘                    │
│   │  Radio   │──┤                                 │                             │
│   └──────────┘  │                                 │                             │
│   ┌──────────┐  │                    ┌────────────┴────────────┐               │
│   │  Other   │──┘                    │                         │                │
│   └──────────┘                       ▼                         ▼                │
│                              ┌──────────────┐          ┌──────────────┐         │
│                              │   Validate   │          │   Normalize  │         │
│                              │   & Clean    │          │   Schema     │         │
│                              └──────────────┘          └──────────────┘         │
│                                      │                         │                │
│                                      └───────────┬─────────────┘                │
│                                                  │                               │
│                                                  ▼                               │
│                                          ┌──────────────┐                       │
│                                          │   Generate   │                       │
│                                          │  Embeddings  │                       │
│                                          │   (OpenAI)   │                       │
│                                          └──────────────┘                       │
│                                                  │                               │
│                                                  ▼                               │
│                          ┌───────────────────────────────────────┐              │
│                          │                                       │               │
│                          ▼                                       ▼               │
│                   ┌──────────────┐                       ┌──────────────┐       │
│                   │  PostgreSQL  │                       │    KAFKA     │       │
│                   │ usage_events │                       │  normalized  │       │
│                   └──────────────┘                       │    topic     │       │
│                                                          └──────────────┘       │
│                                                                 │                │
│                                                                 ▼                │
│                                                         ┌──────────────┐        │
│                                                         │   MATCHING   │        │
│                                                         │    AGENT     │        │
│                                                         │  (LangGraph) │        │
│                                                         └──────────────┘        │
│                                                                 │                │
│                                          ┌──────────────────────┴──────────┐    │
│                                          │                                 │     │
│                                          ▼                                 ▼     │
│                                   ┌──────────────┐                ┌────────────┐│
│                                   │    KAFKA     │                │   KAFKA    ││
│                                   │   matched    │                │ unmatched  ││
│                                   │    topic     │                │   topic    ││
│                                   └──────────────┘                └────────────┘│
│                                          │                                      │
│                                          ▼                                      │
│                                   ┌──────────────┐                              │
│                                   │  PostgreSQL  │                              │
│                                   │matched_usage │                              │
│                                   └──────────────┘                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Royalty Calculation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     ROYALTY CALCULATION PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  TRIGGER: End of Quarter / Manual Initiation                                    │
│                                                                                  │
│  ┌──────────────┐                                                               │
│  │   CREATE     │                                                               │
│  │   PERIOD     │                                                               │
│  └──────────────┘                                                               │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐      │
│  │                    AGGREGATE MATCHED USAGE                            │      │
│  │                                                                       │      │
│  │   SELECT                                                              │      │
│  │     mu.work_id,                                                       │      │
│  │     dw.deal_id,                                                       │      │
│  │     ue.usage_type,                                                    │      │
│  │     ue.territory,                                                     │      │
│  │     ue.source,                                                        │      │
│  │     SUM(ue.play_count) as total_plays,                               │      │
│  │     SUM(ue.revenue_amount) as total_revenue                          │      │
│  │   FROM matched_usage mu                                               │      │
│  │   JOIN usage_events ue ON ...                                         │      │
│  │   JOIN deal_works dw ON ...                                           │      │
│  │   WHERE ue.reporting_period = ?                                       │      │
│  │   GROUP BY ...                                                        │      │
│  └──────────────────────────────────────────────────────────────────────┘      │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐      │
│  │                    FOR EACH SONGWRITER                                │      │
│  │  ┌────────────────────────────────────────────────────────────────┐  │      │
│  │  │  1. Get all deals for songwriter                               │  │      │
│  │  │  2. For each deal:                                             │  │      │
│  │  │     a. Get associated works                                    │  │      │
│  │  │     b. Calculate royalty per work:                             │  │      │
│  │  │        • gross = revenue * (writer_share / 100)                │  │      │
│  │  │        • Apply territory-specific rates                        │  │      │
│  │  │        • Apply usage-type rates                                │  │      │
│  │  │  3. Sum all line items for statement                           │  │      │
│  │  │  4. Apply deductions:                                          │  │      │
│  │  │     • Advance recoupment                                       │  │      │
│  │  │     • Withholding tax                                          │  │      │
│  │  │  5. Calculate net payable                                      │  │      │
│  │  └────────────────────────────────────────────────────────────────┘  │      │
│  └──────────────────────────────────────────────────────────────────────┘      │
│         │                                                                        │
│         ▼                                                                        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                    │
│  │   CREATE     │────▶│   CREATE     │────▶│   PUBLISH    │                    │
│  │  STATEMENT   │     │  LINE ITEMS  │     │    EVENT     │                    │
│  └──────────────┘     └──────────────┘     └──────────────┘                    │
│         │                                          │                            │
│         │                                          ▼                            │
│         │                                   ┌──────────────┐                    │
│         │                                   │    KAFKA     │                    │
│         │                                   │  royalties   │                    │
│         │                                   │   .events    │                    │
│         │                                   └──────────────┘                    │
│         │                                          │                            │
│         ▼                                          ▼                            │
│  ┌──────────────┐                           ┌──────────────┐                   │
│  │   GENERATE   │                           │ NOTIFICATION │                   │
│  │  STATEMENT   │                           │   WORKER     │                   │
│  │     PDF      │                           └──────────────┘                   │
│  └──────────────┘                                  │                            │
│                                                    ▼                            │
│                                             ┌──────────────┐                   │
│                                             │  EMAIL/SMS   │                   │
│                                             │    SEND      │                   │
│                                             └──────────────┘                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Frontend Architecture

### 9.1 Application Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND ARCHITECTURE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      ADMIN PORTAL (React)                                │   │
│  │                      admin.musicpub.com                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                        LAYOUTS                                   │   │   │
│  │  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │   │
│  │  │   │  Dashboard   │  │    Admin     │  │    Auth      │        │   │   │
│  │  │   │   Layout     │  │   Layout     │  │   Layout     │        │   │   │
│  │  │   └──────────────┘  └──────────────┘  └──────────────┘        │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                        PAGES                                     │   │   │
│  │  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│   │   │
│  │  │   │  Dashboard  │ │    Works    │ │    Deals    │ │ Royalties││   │   │
│  │  │   │    Page     │ │ Management  │ │ Management  │ │   Admin  ││   │   │
│  │  │   └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│   │   │
│  │  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│   │   │
│  │  │   │ Songwriters │ │  Contract   │ │   Usage     │ │ Settings ││   │   │
│  │  │   │ Management  │ │  Creator    │ │  Analytics  │ │   Page   ││   │   │
│  │  │   └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                     SHARED COMPONENTS                            │   │   │
│  │  │   DataTable │ Forms │ Charts │ Modals │ Search │ Filters       │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    SONGWRITER PORTAL (React)                             │   │
│  │                    portal.musicpub.com                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                        PAGES                                     │   │   │
│  │  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│   │   │
│  │  │   │  Dashboard  │ │  Royalties  │ │    Works    │ │  Profile ││   │   │
│  │  │   │   (Home)    │ │  Overview   │ │  Catalog    │ │ Settings ││   │   │
│  │  │   └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│   │   │
│  │  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │   │   │
│  │  │   │  Statement  │ │    Deals    │ │  Documents  │            │   │   │
│  │  │   │   Detail    │ │   History   │ │  Download   │            │   │   │
│  │  │   └─────────────┘ └─────────────┘ └─────────────┘            │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  SHARED PACKAGES                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ @musicpub/ui         │  Design system, components                       │   │
│  │ @musicpub/api-client │  TypeScript API client                          │   │
│  │ @musicpub/types      │  Shared TypeScript types                        │   │
│  │ @musicpub/utils      │  Shared utilities                               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Admin Portal Pages

| Page | Features |
|------|----------|
| **Dashboard** | KPIs, recent activity, alerts, quick actions |
| **Works Management** | CRUD works, recordings, writer associations, bulk import |
| **Deals Management** | View/edit deals, associate works, generate contracts |
| **Contract Creator** | AI-assisted contract generation, template selection, term configuration |
| **Songwriters** | Songwriter profiles, deal history, royalty summary |
| **Royalties Admin** | Period management, calculation triggers, approvals |
| **Usage Analytics** | Usage trends, matching metrics, source breakdown |
| **Settings** | User management, system configuration |

### 9.3 Songwriter Portal Pages

| Page | Features |
|------|----------|
| **Dashboard** | Royalty summary, recent statements, notifications |
| **Royalties Overview** | Quarterly statements, historical data, charts |
| **Statement Detail** | Line-by-line breakdown, work-level detail |
| **Works Catalog** | View assigned works, performance metrics |
| **Deals History** | Active/past deals, contract downloads |
| **Profile Settings** | Personal info, payment details, notifications |

---

## 10. API Gateway Configuration

### 10.1 Route Configuration

```yaml
# Kong Gateway Configuration
services:
  - name: auth-service
    url: http://auth-service:8001
    routes:
      - name: auth-routes
        paths:
          - /api/v1/auth
        strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 60
          policy: local

  - name: works-service
    url: http://works-service:8002
    routes:
      - name: works-routes
        paths:
          - /api/v1/works
        strip_path: false
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 1000

  - name: deals-service
    url: http://deals-service:8003
    routes:
      - name: deals-routes
        paths:
          - /api/v1/deals
          - /api/v1/contracts
        strip_path: false
    plugins:
      - name: jwt
      - name: acl
        config:
          allow:
            - admin

  - name: royalties-service
    url: http://royalties-service:8004
    routes:
      - name: royalties-routes
        paths:
          - /api/v1/royalties
        strip_path: false
    plugins:
      - name: jwt

  - name: ai-service
    url: http://ai-service:8005
    routes:
      - name: ai-routes
        paths:
          - /api/v1/ai
        strip_path: false
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 100  # AI calls are expensive
```

---

## 11. Security Architecture

### 11.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ARCHITECTURE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PERIMETER SECURITY                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  • WAF (Web Application Firewall)                                       │   │
│  │  • DDoS Protection (Cloudflare/AWS Shield)                             │   │
│  │  • SSL/TLS Termination                                                  │   │
│  │  • IP Whitelisting (for DSP ingestion)                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  APPLICATION SECURITY                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  • JWT Authentication                                                   │   │
│  │  • Role-Based Access Control (RBAC)                                    │   │
│  │  • API Rate Limiting                                                    │   │
│  │  • Input Validation & Sanitization                                      │   │
│  │  • CORS Configuration                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  DATA SECURITY                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  • Encryption at Rest (PostgreSQL TDE)                                 │   │
│  │  • Encryption in Transit (TLS 1.3)                                     │   │
│  │  • Field-Level Encryption (PII, Payment Info)                          │   │
│  │  • Database Row-Level Security                                          │   │
│  │  • Audit Logging                                                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  RBAC MATRIX                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Role          │ Works │ Deals │ Royalties │ Users │ AI    │ Settings │   │
│  │  ─────────────────────────────────────────────────────────────────────  │   │
│  │  admin         │ CRUD  │ CRUD  │ CRUD      │ CRUD  │ Full  │ Full     │   │
│  │  manager       │ CRUD  │ CRUD  │ RU        │ R     │ Full  │ R        │   │
│  │  analyst       │ R     │ R     │ R         │ -     │ Query │ -        │   │
│  │  songwriter    │ R*    │ R*    │ R*        │ Self  │ -     │ -        │   │
│  │                │       │       │           │       │       │          │   │
│  │  * = Own records only                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Deployment Architecture

### 12.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT ARCHITECTURE (AWS)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         AWS REGION (us-east-1)                           │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  VPC (10.0.0.0/16)                                              │   │   │
│  │  │                                                                  │   │   │
│  │  │  PUBLIC SUBNETS                                                  │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐                            │   │   │
│  │  │  │     ALB      │  │  NAT Gateway │                            │   │   │
│  │  │  │ (Ingress)    │  │              │                            │   │   │
│  │  │  └──────────────┘  └──────────────┘                            │   │   │
│  │  │         │                  │                                    │   │   │
│  │  │  ───────┼──────────────────┼────────────────────────────────   │   │   │
│  │  │         │                  │                                    │   │   │
│  │  │  PRIVATE SUBNETS (Application)                                  │   │   │
│  │  │  ┌──────────────────────────────────────────────────────────┐ │   │   │
│  │  │  │                    EKS CLUSTER                            │ │   │   │
│  │  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │ │   │   │
│  │  │  │  │  Auth  │ │ Works  │ │ Deals  │ │Royalty │ │   AI   │ │ │   │   │
│  │  │  │  │Service │ │Service │ │Service │ │Service │ │Service │ │ │   │   │
│  │  │  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │ │   │   │
│  │  │  │                                                          │ │   │   │
│  │  │  │  ┌─────────────────┐ ┌─────────────────┐                │ │   │   │
│  │  │  │  │ Usage Processor │ │ Matching Worker │                │ │   │   │
│  │  │  │  └─────────────────┘ └─────────────────┘                │ │   │   │
│  │  │  │                                                          │ │   │   │
│  │  │  │  ┌─────────────────┐ ┌─────────────────┐                │ │   │   │
│  │  │  │  │Royalty Calculator│ │Notification Svc │               │ │   │   │
│  │  │  │  └─────────────────┘ └─────────────────┘                │ │   │   │
│  │  │  └──────────────────────────────────────────────────────────┘ │   │   │
│  │  │                                                                │   │   │
│  │  │  ───────────────────────────────────────────────────────────   │   │   │
│  │  │                                                                │   │   │
│  │  │  PRIVATE SUBNETS (Data)                                        │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │   │
│  │  │  │  RDS Aurora  │  │  ElastiCache │  │    MSK       │        │   │   │
│  │  │  │ (PostgreSQL) │  │   (Redis)    │  │  (Kafka)     │        │   │   │
│  │  │  │  + pgvector  │  │              │  │              │        │   │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘        │   │   │
│  │  │                                                                │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  EXTERNAL SERVICES                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │   │
│  │  │      S3      │  │  CloudWatch  │  │   Secrets    │                   │   │
│  │  │  (Storage)   │  │ (Monitoring) │  │   Manager    │                   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  STATIC HOSTING (CloudFront + S3)                                               │
│  ┌──────────────────┐  ┌──────────────────┐                                    │
│  │   Admin Portal   │  │ Songwriter Portal│                                    │
│  │admin.musicpub.com│  │portal.musicpub.com│                                   │
│  └──────────────────┘  └──────────────────┘                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, TailwindCSS, React Query | UI Applications |
| **API Gateway** | Kong / AWS API Gateway | Routing, Auth, Rate Limiting |
| **Backend** | Python 3.11, FastAPI, Pydantic | API Services |
| **AI/ML** | LangGraph, LangChain, OpenAI API | Agent Orchestration |
| **Database** | PostgreSQL 15 + pgvector | Primary Data Store |
| **Cache** | Redis | Session, Query Cache |
| **Message Queue** | Apache Kafka (MSK) | Event Streaming |
| **Search** | pgvector + PostgreSQL FTS | Vector & Text Search |
| **Container** | Docker, Kubernetes (EKS) | Container Orchestration |
| **CI/CD** | GitHub Actions, ArgoCD | Deployment Pipeline |
| **Monitoring** | Prometheus, Grafana, CloudWatch | Observability |
| **Storage** | AWS S3 | Documents, PDFs, Exports |

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database schema implementation
- [ ] Core FastAPI services setup
- [ ] Basic authentication
- [ ] Works CRUD operations
- [ ] Admin portal scaffold

### Phase 2: Deals & Contracts (Weeks 5-8)
- [ ] Deals service implementation
- [ ] Contract template system
- [ ] AI contract generation (LangGraph)
- [ ] Deal-work associations
- [ ] Contract management UI

### Phase 3: Usage Pipeline (Weeks 9-12)
- [ ] Kafka infrastructure
- [ ] Usage ingestion service
- [ ] Matching agent (LangGraph)
- [ ] Usage analytics dashboard
- [ ] Manual matching interface

### Phase 4: Royalties (Weeks 13-16)
- [ ] Royalty calculation engine
- [ ] Statement generation
- [ ] PDF statement generation
- [ ] Royalties admin interface
- [ ] Songwriter portal

### Phase 5: Polish & Launch (Weeks 17-20)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation
- [ ] Production deployment

---

## Appendix A: Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL + pgvector | Native vector support, mature, ACID compliant |
| Event Streaming | Kafka | Industry standard, high throughput, replay capability |
| AI Framework | LangGraph | State machine for agents, good debugging, checkpointing |
| API Framework | FastAPI | Async, automatic OpenAPI, Pydantic validation |
| Frontend | React | Large ecosystem, component reuse, TypeScript support |
| Embedding Model | OpenAI text-embedding-3-large | High quality, 1536 dimensions, good for RAG |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **ISWC** | International Standard Musical Work Code - unique identifier for musical works |
| **ISRC** | International Standard Recording Code - unique identifier for recordings |
| **IPI** | Interested Parties Information - unique identifier for songwriters/publishers |
| **PRO** | Performance Rights Organization (ASCAP, BMI, SESAC) |
| **DSP** | Digital Service Provider (Spotify, Apple Music, etc.) |
| **Mechanical Royalty** | Payment for reproduction of a musical work |
| **Sync License** | License for synchronizing music with visual media |
| **Advance** | Upfront payment to songwriter against future royalties |
| **Recoupment** | Process of recovering advance payments from royalties |
