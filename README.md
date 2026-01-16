# Music Publishing Royalty Management System

An AI-enhanced music publishing royalty management system with microservices architecture, event-driven processing, and modern React frontends.

## Architecture

- **5 FastAPI Microservices**: Auth, Works, Deals, Royalties, AI
- **3 Background Workers**: Usage Processor, Matching Worker, Notification Worker
- **2 React Frontends**: Admin Portal, Songwriter Portal
- **Event-Driven**: Apache Kafka for streaming usage data
- **AI-Powered**: LangGraph agents for contract generation and usage matching
- **Vector Search**: pgvector for similarity-based work matching

## Tech Stack

### Backend
- Python 3.11, FastAPI
- PostgreSQL 15 with pgvector
- Redis for caching/sessions
- Apache Kafka for event streaming
- OpenAI GPT-4 & embeddings
- LangGraph for AI agents

### Frontend
- React 18, TypeScript, Vite
- TailwindCSS
- React Query
- Zustand for state management

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- OpenAI API key

### 1. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-...
```

### 2. Start Infrastructure

```bash
# Start all services (PostgreSQL, Redis, Kafka, all microservices)
docker-compose -f docker-compose.dev.yml up -d

# Check service health
curl http://localhost:8001/health  # Auth
curl http://localhost:8002/health  # Works
curl http://localhost:8003/health  # Deals
curl http://localhost:8005/health  # AI
```

### 3. Test Contract Generation

```bash
# Generate a contract for an existing deal
curl -X POST http://localhost:8003/deals/01eebc99-9c0b-4ef8-bb6d-6bb9bd380a51/generate-contract | jq
```

### 4. Start Frontend

```bash
# Install dependencies
pnpm install

# Start Admin Portal (Port 3000)
pnpm run dev:admin
```

### 5. Access the Application

- **Admin Portal**: http://localhost:3000
- **Auth Service API**: http://localhost:8001/docs
- **Works Service API**: http://localhost:8002/docs
- **Deals Service API**: http://localhost:8003/docs
- **AI Service API**: http://localhost:8005/docs
- **Kafka UI**: http://localhost:8080

## Project Structure

```
music-publishing-system/
├── apps/
│   ├── admin-portal/        # React Admin Dashboard
│   └── songwriter-portal/   # React Songwriter Portal
├── packages/
│   └── shared/
│       ├── types/           # @musicpub/types
│       └── api-client/      # @musicpub/api-client
├── services/
│   ├── auth/                # Authentication Service
│   ├── works/               # Works Management Service
│   ├── deals/               # Deals & Contracts Service
│   ├── royalties/           # Royalty Calculation Service
│   ├── ai/                  # AI Agent Service
│   └── workers/
│       ├── usage_processor/ # Kafka Usage Consumer
│       ├── matching_worker/ # AI Matching Worker
│       └── notification_worker/
├── db/
│   ├── migrations/          # SQL Migrations
│   └── seeds/               # Test Data
└── infrastructure/
    └── kafka/               # Kafka Topics Config
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Auth | 8001 | JWT authentication, RBAC |
| Works | 8002 | Work CRUD, recordings, vector search |
| Deals | 8003 | Deal management, contract generation |
| Royalties | 8004 | Period calculations, statements |
| AI | 8005 | LangGraph agents, embeddings |

## API Documentation

Each service provides Swagger documentation:

- Auth: http://localhost:8001/docs
- Works: http://localhost:8002/docs
- Deals: http://localhost:8003/docs
- Royalties: http://localhost:8004/docs
- AI: http://localhost:8005/docs

## Development

### Running Tests

```bash
make test
```

### Code Formatting

```bash
make format
```

### Linting

```bash
make lint
```

## Test Credentials

After running `make db-seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@musicpub.com | password123 | admin |
| manager@musicpub.com | password123 | manager |
| songwriter1@email.com | password123 | songwriter |

## Implementation Phases

### Phase 1: Foundation (Complete)
- Project scaffolding
- Database schema with pgvector
- Auth Service (JWT authentication, user management)
- Works Service (CRUD, recordings, writers, vector search)
- Admin Portal scaffold with Notion-style theming

### Phase 2: Deals & Contracts (Complete)
- **Deals Service** - Full CRUD API for publishing deals
  - Deal management (create, update, delete, sign)
  - Deal-works associations
  - Songwriter lookup for deal creation
  - Integration with AI service for contract generation
- **AI Contract Generator** - LangGraph-powered contract creation
  - 6 contract templates (Publishing, Co-Publishing, Administration, Sub-Publishing, Sync License, Mechanical License)
  - Template variable substitution (songwriter, shares, dates, territories, advance)
  - AI-suggested additional terms (accounting, audit rights, delivery requirements)
  - Works exhibit generation
- **Admin Portal Deals UI**
  - Deals list with filtering (status, type) and search
  - Create deal modal with songwriter selection and share validation
  - Deal detail drawer with sign functionality
  - Contract generation integration

### Phase 3: Usage Pipeline (Complete)
- **Kafka Infrastructure** - Running with Zookeeper and Kafka UI
- **Usage Ingestion API** - Two ingestion endpoints:
  - `POST /usage/ingest` - Direct DB insert (for testing)
  - `POST /usage/ingest-kafka` - Publish to Kafka for full pipeline processing
- **Usage Events API** - `GET /usage/events` with filtering by status, source, date range
- **Usage Processor Worker** - Normalizes raw events, generates embeddings
- **Matching Worker** - LangGraph agent with ISRC/ISWC/Fuzzy/Embedding matchers
- **Admin Portal Usage Pages**:
  - Usage Dashboard with stats and match rates
  - Usage Events page with filtering and status badges
  - Event Detail Drawer with match info and manual matching
  - Unmatched Queue for manual review
- **Simulation Script** for end-to-end pipeline testing

### Phase 4: Royalties (Pending)
- Royalties Service
- Calculation Engine
- Statement PDF Generation
- Songwriter Portal

### Phase 5: Polish (Pending)
- AI Service consolidation
- Notification Worker
- Performance optimization

---

## Usage Pipeline

### Testing the Pipeline

1. **Start all services**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Simulate usage data** (publishes to Kafka):
   ```bash
   # Install script dependencies
   pip install aiokafka asyncpg

   # Generate 100 Spotify events (mix of matchable/unmatchable)
   python scripts/simulate_usage.py --count 100 --source spotify --include-unmatchable

   # Generate mixed source events
   python scripts/simulate_usage.py --count 50 --mixed --include-unmatchable

   # Dry run to preview events
   python scripts/simulate_usage.py --count 10 --dry-run
   ```

3. **Monitor the pipeline**:
   - **Kafka UI**: http://localhost:8080 - View messages in raw/normalized/matched topics
   - **Worker logs**: `docker-compose logs -f usage-processor matching-worker`
   - **Admin Portal**: http://localhost:3000/usage/events - View processing status

4. **API Endpoints**:
   ```bash
   # Ingest via Kafka (full pipeline)
   curl -X POST http://localhost:8005/usage/ingest-kafka \
     -H "Content-Type: application/json" \
     -d '{"source": "spotify", "events": [{"title": "Test Song", "artist": "Test Artist", "usage_date": "2024-01-15", "play_count": 100}]}'

   # List events with filters
   curl "http://localhost:8005/usage/events?status=matched&source=spotify&limit=10"

   # Get usage stats
   curl http://localhost:8005/usage/stats
   ```

### Kafka Topics

| Topic | Description |
|-------|-------------|
| `usage.raw.spotify` | Raw Spotify streaming data |
| `usage.raw.apple_music` | Raw Apple Music streaming data |
| `usage.raw.radio` | Raw radio airplay data |
| `usage.raw.generic` | Raw data from other sources |
| `usage.normalized` | Normalized events ready for matching |
| `usage.matched` | Successfully matched events |
| `usage.unmatched` | Events requiring manual review |
| `dlq.usage.processing` | Dead letter queue for processing errors |
| `dlq.matching` | Dead letter queue for matching errors |
