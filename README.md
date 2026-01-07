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
# Start PostgreSQL, Redis, Kafka
make up

# Wait for services to be healthy, then run migrations
make db-migrate

# Seed with test data
make db-seed
```

### 3. Start Backend Services

```bash
# Start all services with Docker Compose
make dev
```

Or run individual services:

```bash
# Auth Service (Port 8001)
cd services/auth && pip install -e . && uvicorn src.main:app --port 8001 --reload

# Works Service (Port 8002)
cd services/works && pip install -e . && uvicorn src.main:app --port 8002 --reload
```

### 4. Start Frontend

```bash
# Install dependencies
npm install

# Start Admin Portal (Port 3000)
npm run dev:admin
```

### 5. Access the Application

- **Admin Portal**: http://localhost:3000
- **Auth Service API**: http://localhost:8001/docs
- **Works Service API**: http://localhost:8002/docs
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
- Auth Service
- Works Service
- Admin Portal scaffold

### Phase 2: Deals & Contracts (Pending)
- Deals Service
- LangGraph Contract Generator
- Contract Templates

### Phase 3: Usage Pipeline (Pending)
- Kafka infrastructure
- Usage Processor Worker
- Matching Agent

### Phase 4: Royalties (Pending)
- Royalties Service
- Calculation Engine
- Statement PDF Generation
- Songwriter Portal

### Phase 5: Polish (Pending)
- AI Service consolidation
- Notification Worker
- Performance optimization
# music-publishing-lifecycle
