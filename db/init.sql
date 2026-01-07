-- Music Publishing System - Database Initialization
-- This file sets up required PostgreSQL extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram similarity for fuzzy matching

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE musicpub TO musicpub;

-- Create schemas if needed
-- CREATE SCHEMA IF NOT EXISTS musicpub;
