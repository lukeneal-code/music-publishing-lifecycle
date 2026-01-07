# Music Publishing System - Project Structure & Code Examples

## Repository Structure

```
music-publishing-system/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── Makefile
├── README.md
│
├── infrastructure/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── eks.tf
│   │   ├── rds.tf
│   │   ├── msk.tf
│   │   └── variables.tf
│   ├── kubernetes/
│   │   ├── base/
│   │   ├── overlays/
│   │   └── argocd/
│   └── kafka/
│       └── topics.yaml
│
├── packages/
│   ├── shared/
│   │   ├── types/              # @musicpub/types
│   │   │   ├── src/
│   │   │   │   ├── works.ts
│   │   │   │   ├── deals.ts
│   │   │   │   ├── royalties.ts
│   │   │   │   └── index.ts
│   │   │   └── package.json
│   │   └── api-client/         # @musicpub/api-client
│   │       ├── src/
│   │       │   ├── client.ts
│   │       │   ├── works.ts
│   │       │   ├── deals.ts
│   │       │   └── royalties.ts
│   │       └── package.json
│   └── ui/                     # @musicpub/ui
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── styles/
│       └── package.json
│
├── services/
│   ├── gateway/                # API Gateway config
│   │   └── kong.yml
│   │
│   ├── auth/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── alembic/
│   │   └── src/
│   │       ├── main.py
│   │       ├── config.py
│   │       ├── models/
│   │       ├── routers/
│   │       ├── services/
│   │       └── schemas/
│   │
│   ├── works/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── main.py
│   │       ├── models/
│   │       ├── routers/
│   │       ├── services/
│   │       └── schemas/
│   │
│   ├── deals/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── main.py
│   │       ├── models/
│   │       ├── routers/
│   │       ├── services/
│   │       ├── agents/         # LangGraph agents
│   │       │   └── contract_generator.py
│   │       └── schemas/
│   │
│   ├── royalties/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── main.py
│   │       ├── models/
│   │       ├── routers/
│   │       ├── services/
│   │       │   ├── calculator.py
│   │       │   └── statement_generator.py
│   │       └── schemas/
│   │
│   ├── ai/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   └── src/
│   │       ├── main.py
│   │       ├── agents/
│   │       │   ├── matching_agent.py
│   │       │   ├── contract_agent.py
│   │       │   └── query_agent.py
│   │       ├── embeddings/
│   │       └── tools/
│   │
│   └── workers/
│       ├── usage_processor/
│       │   ├── Dockerfile
│       │   └── src/
│       │       ├── consumer.py
│       │       ├── normalizers/
│       │       └── producers.py
│       ├── matching_worker/
│       │   └── src/
│       │       └── worker.py
│       └── notification_worker/
│           └── src/
│               └── worker.py
│
├── apps/
│   ├── admin-portal/           # Admin React App
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       ├── routes/
│   │       ├── pages/
│   │       │   ├── Dashboard/
│   │       │   ├── Works/
│   │       │   ├── Deals/
│   │       │   ├── ContractCreator/
│   │       │   ├── Royalties/
│   │       │   ├── Songwriters/
│   │       │   └── Settings/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── stores/
│   │       └── lib/
│   │
│   └── songwriter-portal/      # Songwriter React App
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── pages/
│           │   ├── Dashboard/
│           │   ├── Royalties/
│           │   ├── Works/
│           │   ├── Deals/
│           │   └── Profile/
│           └── components/
│
└── db/
    ├── migrations/
    │   └── versions/
    └── seeds/
```

---

## Key Implementation Examples

### 1. FastAPI Service Structure (Works Service)

```python
# services/works/src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .routers import works, recordings, writers
from .database import engine, init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Works Service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(works.router, prefix="/works", tags=["works"])
app.include_router(recordings.router, prefix="/works", tags=["recordings"])
app.include_router(writers.router, prefix="/works", tags=["writers"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "works"}
```

```python
# services/works/src/models/work.py
from sqlalchemy import Column, String, Date, Integer, JSON, Enum, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import uuid

from ..database import Base

class Work(Base):
    __tablename__ = "works"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False, index=True)
    alternate_titles = Column(ARRAY(String))
    iswc = Column(String(15), unique=True, index=True)
    language = Column(String(10))
    genre = Column(String(100))
    release_date = Column(Date)
    duration_seconds = Column(Integer)
    lyrics = Column(String)
    metadata = Column(JSONB, default={})
    status = Column(String(50), default="active")
    
    # Vector embeddings for AI matching
    title_embedding = Column(Vector(1536))
    metadata_embedding = Column(Vector(1536))
    
    # Relationships
    recordings = relationship("Recording", back_populates="work")
    writers = relationship("WorkWriter", back_populates="work")
    deal_works = relationship("DealWork", back_populates="work")
```

```python
# services/works/src/schemas/work.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from uuid import UUID

class WorkBase(BaseModel):
    title: str = Field(..., max_length=500)
    alternate_titles: Optional[List[str]] = None
    iswc: Optional[str] = Field(None, max_length=15)
    language: Optional[str] = None
    genre: Optional[str] = None
    release_date: Optional[date] = None
    duration_seconds: Optional[int] = None
    metadata: Optional[dict] = {}

class WorkCreate(WorkBase):
    pass

class WorkUpdate(BaseModel):
    title: Optional[str] = None
    alternate_titles: Optional[List[str]] = None
    iswc: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[dict] = None

class WorkResponse(WorkBase):
    id: UUID
    status: str
    
    class Config:
        from_attributes = True

class WorkWithWriters(WorkResponse):
    writers: List["WriterResponse"] = []
    recordings: List["RecordingResponse"] = []
```

```python
# services/works/src/routers/works.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from ..schemas.work import WorkCreate, WorkUpdate, WorkResponse, WorkWithWriters
from ..services.work_service import WorkService
from ..services.embedding_service import EmbeddingService

router = APIRouter()

@router.get("", response_model=List[WorkResponse])
async def list_works(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    service = WorkService(db)
    return await service.list_works(skip=skip, limit=limit, status=status, search=search)

@router.post("", response_model=WorkResponse, status_code=201)
async def create_work(
    work: WorkCreate,
    db: AsyncSession = Depends(get_db)
):
    service = WorkService(db)
    embedding_service = EmbeddingService()
    
    # Generate embedding for the title
    title_embedding = await embedding_service.generate_embedding(work.title)
    
    return await service.create_work(work, title_embedding=title_embedding)

@router.get("/{work_id}", response_model=WorkWithWriters)
async def get_work(
    work_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    service = WorkService(db)
    work = await service.get_work(work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work

@router.put("/{work_id}", response_model=WorkResponse)
async def update_work(
    work_id: UUID,
    work_update: WorkUpdate,
    db: AsyncSession = Depends(get_db)
):
    service = WorkService(db)
    work = await service.update_work(work_id, work_update)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work

@router.post("/search/similar", response_model=List[WorkResponse])
async def search_similar_works(
    query: str,
    limit: int = Query(10, ge=1, le=50),
    threshold: float = Query(0.7, ge=0, le=1),
    db: AsyncSession = Depends(get_db)
):
    """Vector similarity search for works"""
    service = WorkService(db)
    embedding_service = EmbeddingService()
    
    query_embedding = await embedding_service.generate_embedding(query)
    return await service.search_similar(query_embedding, limit=limit, threshold=threshold)
```

---

### 2. LangGraph Agent (Contract Generator)

```python
# services/deals/src/agents/contract_generator.py
from typing import TypedDict, List, Optional, Annotated
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
import operator

from ..services.template_service import TemplateService
from ..services.validation_service import ContractValidationService

class ContractState(TypedDict):
    """State for contract generation workflow"""
    deal_type: str
    songwriter_info: dict
    deal_terms: dict
    territory: List[str]
    template_matches: Annotated[List[dict], operator.add]
    draft_contract: str
    validation_result: Optional[dict]
    revision_notes: List[str]
    revision_count: int
    final_contract: Optional[str]
    messages: Annotated[list, add_messages]

class ContractGeneratorAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
        self.template_service = TemplateService()
        self.validation_service = ContractValidationService()
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(ContractState)
        
        # Add nodes
        workflow.add_node("analyze_request", self.analyze_request)
        workflow.add_node("retrieve_templates", self.retrieve_templates)
        workflow.add_node("generate_draft", self.generate_draft)
        workflow.add_node("validate", self.validate_contract)
        workflow.add_node("revise", self.revise_contract)
        workflow.add_node("finalize", self.finalize_contract)
        
        # Add edges
        workflow.set_entry_point("analyze_request")
        workflow.add_edge("analyze_request", "retrieve_templates")
        workflow.add_edge("retrieve_templates", "generate_draft")
        workflow.add_edge("generate_draft", "validate")
        
        # Conditional edge based on validation
        workflow.add_conditional_edges(
            "validate",
            self.should_revise,
            {
                "revise": "revise",
                "finalize": "finalize"
            }
        )
        
        workflow.add_edge("revise", "validate")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()
    
    async def analyze_request(self, state: ContractState) -> ContractState:
        """Analyze the contract request and extract key requirements"""
        prompt = f"""Analyze this contract request and extract key requirements:
        
        Deal Type: {state['deal_type']}
        Songwriter: {state['songwriter_info']}
        Terms: {state['deal_terms']}
        Territory: {state['territory']}
        
        Identify:
        1. Required clauses based on deal type
        2. Special terms needed
        3. Potential compliance requirements
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return {
            **state,
            "messages": [response]
        }
    
    async def retrieve_templates(self, state: ContractState) -> ContractState:
        """Retrieve relevant contract templates using RAG"""
        templates = await self.template_service.find_relevant_templates(
            deal_type=state['deal_type'],
            territories=state['territory']
        )
        
        return {
            **state,
            "template_matches": templates
        }
    
    async def generate_draft(self, state: ContractState) -> ContractState:
        """Generate contract draft using templates and terms"""
        template_context = "\n".join([
            t['content'] for t in state['template_matches'][:3]
        ])
        
        prompt = f"""Generate a music publishing contract with the following details:
        
        Deal Type: {state['deal_type']}
        Songwriter: {state['songwriter_info']['legal_name']}
        IPI: {state['songwriter_info'].get('ipi_number', 'N/A')}
        
        Terms:
        - Publisher Share: {state['deal_terms']['publisher_share']}%
        - Writer Share: {state['deal_terms']['writer_share']}%
        - Advance: ${state['deal_terms'].get('advance_amount', 0)}
        - Territory: {', '.join(state['territory'])}
        - Term: {state['deal_terms'].get('term_months', 'Perpetual')} months
        
        Use these template clauses as reference:
        {template_context}
        
        Generate a complete, professional contract document.
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return {
            **state,
            "draft_contract": response.content,
            "messages": [response]
        }
    
    async def validate_contract(self, state: ContractState) -> ContractState:
        """Validate the contract for completeness and compliance"""
        validation_result = await self.validation_service.validate(
            contract=state['draft_contract'],
            deal_type=state['deal_type'],
            terms=state['deal_terms']
        )
        
        return {
            **state,
            "validation_result": validation_result
        }
    
    def should_revise(self, state: ContractState) -> str:
        """Determine if contract needs revision"""
        if state['revision_count'] >= 3:
            return "finalize"  # Max revisions reached
        
        if state['validation_result']['is_valid']:
            return "finalize"
        
        return "revise"
    
    async def revise_contract(self, state: ContractState) -> ContractState:
        """Revise contract based on validation feedback"""
        issues = state['validation_result'].get('issues', [])
        
        prompt = f"""Revise this contract to address the following issues:
        
        Issues:
        {chr(10).join(f'- {issue}' for issue in issues)}
        
        Current contract:
        {state['draft_contract']}
        
        Provide the corrected contract.
        """
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return {
            **state,
            "draft_contract": response.content,
            "revision_count": state['revision_count'] + 1,
            "revision_notes": state['revision_notes'] + issues,
            "messages": [response]
        }
    
    async def finalize_contract(self, state: ContractState) -> ContractState:
        """Finalize the contract"""
        return {
            **state,
            "final_contract": state['draft_contract']
        }
    
    async def generate(
        self,
        deal_type: str,
        songwriter_info: dict,
        deal_terms: dict,
        territory: List[str]
    ) -> dict:
        """Main entry point to generate a contract"""
        initial_state: ContractState = {
            "deal_type": deal_type,
            "songwriter_info": songwriter_info,
            "deal_terms": deal_terms,
            "territory": territory,
            "template_matches": [],
            "draft_contract": "",
            "validation_result": None,
            "revision_notes": [],
            "revision_count": 0,
            "final_contract": None,
            "messages": []
        }
        
        result = await self.graph.ainvoke(initial_state)
        
        return {
            "contract": result["final_contract"],
            "validation": result["validation_result"],
            "revisions": result["revision_count"]
        }
```

---

### 3. Usage Matching Agent (LangGraph)

```python
# services/ai/src/agents/matching_agent.py
from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, END
from langchain_openai import OpenAIEmbeddings
import asyncpg

class MatchingState(TypedDict):
    """State for usage matching workflow"""
    usage_event_id: str
    isrc: Optional[str]
    title: str
    artist: str
    raw_metadata: dict
    
    # Match results
    isrc_match: Optional[dict]
    fuzzy_match: Optional[dict]
    embedding_match: Optional[dict]
    
    # Final result
    matched_work_id: Optional[str]
    match_confidence: float
    match_method: str
    needs_manual_review: bool

class UsageMatchingAgent:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(MatchingState)
        
        # Add nodes
        workflow.add_node("extract_metadata", self.extract_metadata)
        workflow.add_node("isrc_match", self.isrc_exact_match)
        workflow.add_node("fuzzy_match", self.fuzzy_title_match)
        workflow.add_node("embedding_match", self.embedding_similarity_match)
        workflow.add_node("confirm_match", self.confirm_match)
        workflow.add_node("queue_manual", self.queue_for_manual_review)
        
        # Entry point
        workflow.set_entry_point("extract_metadata")
        
        # Conditional flow based on ISRC presence
        workflow.add_conditional_edges(
            "extract_metadata",
            lambda s: "isrc_match" if s.get("isrc") else "fuzzy_match"
        )
        
        # After ISRC match
        workflow.add_conditional_edges(
            "isrc_match",
            self.evaluate_isrc_match,
            {
                "found": "confirm_match",
                "not_found": "fuzzy_match"
            }
        )
        
        # After fuzzy match
        workflow.add_conditional_edges(
            "fuzzy_match",
            self.evaluate_fuzzy_match,
            {
                "high_confidence": "confirm_match",
                "low_confidence": "embedding_match",
                "no_match": "embedding_match"
            }
        )
        
        # After embedding match
        workflow.add_conditional_edges(
            "embedding_match",
            self.evaluate_embedding_match,
            {
                "high_confidence": "confirm_match",
                "low_confidence": "queue_manual",
                "no_match": "queue_manual"
            }
        )
        
        workflow.add_edge("confirm_match", END)
        workflow.add_edge("queue_manual", END)
        
        return workflow.compile()
    
    async def extract_metadata(self, state: MatchingState) -> MatchingState:
        """Extract and normalize metadata from usage event"""
        # Normalize title and artist
        normalized_title = self._normalize_text(state['title'])
        normalized_artist = self._normalize_text(state['artist'])
        
        return {
            **state,
            "title": normalized_title,
            "artist": normalized_artist
        }
    
    async def isrc_exact_match(self, state: MatchingState) -> MatchingState:
        """Try exact ISRC match against recordings table"""
        query = """
        SELECT r.id as recording_id, r.work_id, w.title, w.iswc
        FROM recordings r
        JOIN works w ON r.work_id = w.id
        WHERE r.isrc = $1
        """
        
        async with self.db.acquire() as conn:
            result = await conn.fetchrow(query, state['isrc'])
        
        if result:
            return {
                **state,
                "isrc_match": dict(result),
                "match_confidence": 1.0,
                "match_method": "isrc_exact"
            }
        
        return {**state, "isrc_match": None}
    
    async def fuzzy_title_match(self, state: MatchingState) -> MatchingState:
        """Fuzzy match on title and artist using PostgreSQL trigram similarity"""
        query = """
        SELECT 
            w.id as work_id,
            w.title,
            w.iswc,
            similarity(w.title, $1) as title_sim,
            (
                SELECT MAX(similarity(s.legal_name, $2))
                FROM work_writers ww
                JOIN songwriters s ON ww.songwriter_id = s.id
                WHERE ww.work_id = w.id
            ) as artist_sim
        FROM works w
        WHERE similarity(w.title, $1) > 0.4
        ORDER BY (similarity(w.title, $1) * 0.6 + COALESCE(
            (SELECT MAX(similarity(s.legal_name, $2))
             FROM work_writers ww
             JOIN songwriters s ON ww.songwriter_id = s.id
             WHERE ww.work_id = w.id), 0) * 0.4
        ) DESC
        LIMIT 5
        """
        
        async with self.db.acquire() as conn:
            results = await conn.fetch(query, state['title'], state['artist'])
        
        if results:
            best_match = results[0]
            combined_score = (best_match['title_sim'] * 0.6 + 
                            (best_match['artist_sim'] or 0) * 0.4)
            
            return {
                **state,
                "fuzzy_match": {
                    "work_id": str(best_match['work_id']),
                    "title": best_match['title'],
                    "score": combined_score,
                    "alternatives": [dict(r) for r in results[1:]]
                },
                "match_confidence": combined_score,
                "match_method": "fuzzy_title"
            }
        
        return {**state, "fuzzy_match": None}
    
    async def embedding_similarity_match(self, state: MatchingState) -> MatchingState:
        """Vector similarity search using embeddings"""
        # Generate embedding for the usage event
        search_text = f"{state['title']} {state['artist']}"
        query_embedding = await self.embeddings.aembed_query(search_text)
        
        # Vector similarity search
        query = """
        SELECT 
            w.id as work_id,
            w.title,
            w.iswc,
            1 - (w.title_embedding <=> $1::vector) as similarity
        FROM works w
        WHERE w.title_embedding IS NOT NULL
        ORDER BY w.title_embedding <=> $1::vector
        LIMIT 5
        """
        
        async with self.db.acquire() as conn:
            results = await conn.fetch(query, query_embedding)
        
        if results and results[0]['similarity'] > 0.75:
            best_match = results[0]
            return {
                **state,
                "embedding_match": {
                    "work_id": str(best_match['work_id']),
                    "title": best_match['title'],
                    "similarity": best_match['similarity'],
                    "alternatives": [dict(r) for r in results[1:]]
                },
                "match_confidence": best_match['similarity'],
                "match_method": "ai_embedding"
            }
        
        return {**state, "embedding_match": None, "match_confidence": 0}
    
    def evaluate_isrc_match(self, state: MatchingState) -> str:
        return "found" if state.get("isrc_match") else "not_found"
    
    def evaluate_fuzzy_match(self, state: MatchingState) -> str:
        if not state.get("fuzzy_match"):
            return "no_match"
        score = state['fuzzy_match']['score']
        if score > 0.85:
            return "high_confidence"
        return "low_confidence"
    
    def evaluate_embedding_match(self, state: MatchingState) -> str:
        if not state.get("embedding_match"):
            return "no_match"
        similarity = state['embedding_match']['similarity']
        if similarity > 0.85:
            return "high_confidence"
        elif similarity > 0.75:
            return "low_confidence"
        return "no_match"
    
    async def confirm_match(self, state: MatchingState) -> MatchingState:
        """Confirm and record the match"""
        # Determine which match to use
        if state.get("isrc_match"):
            work_id = state['isrc_match']['work_id']
        elif state.get("fuzzy_match"):
            work_id = state['fuzzy_match']['work_id']
        else:
            work_id = state['embedding_match']['work_id']
        
        return {
            **state,
            "matched_work_id": work_id,
            "needs_manual_review": False
        }
    
    async def queue_for_manual_review(self, state: MatchingState) -> MatchingState:
        """Queue for manual review when confidence is too low"""
        return {
            **state,
            "matched_work_id": None,
            "needs_manual_review": True,
            "match_method": "manual_required"
        }
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for matching"""
        import re
        text = text.lower()
        text = re.sub(r'[\(\[].*?[\)\]]', '', text)  # Remove parenthetical
        text = re.sub(r'[^\w\s]', '', text)  # Remove punctuation
        text = ' '.join(text.split())  # Normalize whitespace
        return text
    
    async def match(self, usage_event: dict) -> MatchingState:
        """Main entry point for matching"""
        initial_state: MatchingState = {
            "usage_event_id": usage_event['id'],
            "isrc": usage_event.get('isrc'),
            "title": usage_event['reported_title'],
            "artist": usage_event['reported_artist'],
            "raw_metadata": usage_event,
            "isrc_match": None,
            "fuzzy_match": None,
            "embedding_match": None,
            "matched_work_id": None,
            "match_confidence": 0.0,
            "match_method": "",
            "needs_manual_review": False
        }
        
        return await self.graph.ainvoke(initial_state)
```

---

### 4. Kafka Usage Consumer

```python
# services/workers/usage_processor/src/consumer.py
import asyncio
import json
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from langchain_openai import OpenAIEmbeddings
import asyncpg

from .normalizers import SpotifyNormalizer, AppleMusicNormalizer, RadioNormalizer
from .config import settings

class UsageProcessor:
    def __init__(self):
        self.consumer = None
        self.producer = None
        self.db_pool = None
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
        
        self.normalizers = {
            'spotify': SpotifyNormalizer(),
            'apple_music': AppleMusicNormalizer(),
            'radio': RadioNormalizer(),
        }
    
    async def start(self):
        """Initialize connections and start processing"""
        # Database pool
        self.db_pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=5,
            max_size=20
        )
        
        # Kafka consumer
        self.consumer = AIOKafkaConsumer(
            'usage.raw.spotify',
            'usage.raw.apple_music',
            'usage.raw.radio',
            bootstrap_servers=settings.KAFKA_BROKERS,
            group_id='usage-processor-group',
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        
        # Kafka producer
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
        await self.consumer.start()
        await self.producer.start()
        
        try:
            await self.process_messages()
        finally:
            await self.consumer.stop()
            await self.producer.stop()
            await self.db_pool.close()
    
    async def process_messages(self):
        """Main message processing loop"""
        async for message in self.consumer:
            try:
                # Determine source from topic
                source = message.topic.split('.')[-1]  # e.g., 'spotify'
                
                # Normalize the event
                normalizer = self.normalizers.get(source)
                if not normalizer:
                    print(f"No normalizer for source: {source}")
                    continue
                
                normalized_event = normalizer.normalize(message.value)
                
                # Generate embedding for matching
                search_text = f"{normalized_event['reported_title']} {normalized_event['reported_artist']}"
                embedding = await self.embeddings.aembed_query(search_text)
                normalized_event['content_embedding'] = embedding
                
                # Store in database
                event_id = await self.store_event(normalized_event)
                normalized_event['id'] = str(event_id)
                
                # Publish to normalized topic
                await self.producer.send(
                    'usage.normalized',
                    value=normalized_event,
                    key=str(event_id).encode('utf-8')
                )
                
                # Commit offset
                await self.consumer.commit()
                
            except Exception as e:
                print(f"Error processing message: {e}")
                # Send to DLQ
                await self.producer.send(
                    'dlq.usage.processing',
                    value={
                        'original_message': message.value,
                        'error': str(e),
                        'topic': message.topic
                    }
                )
    
    async def store_event(self, event: dict) -> str:
        """Store normalized event in database"""
        query = """
        INSERT INTO usage_events (
            source, source_event_id, isrc, reported_title, reported_artist,
            reported_album, usage_type, play_count, revenue_amount, currency,
            territory, usage_date, reporting_period, raw_payload, content_embedding
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id
        """
        
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval(
                query,
                event['source'],
                event.get('source_event_id'),
                event.get('isrc'),
                event['reported_title'],
                event['reported_artist'],
                event.get('reported_album'),
                event['usage_type'],
                event['play_count'],
                event.get('revenue_amount'),
                event.get('currency', 'USD'),
                event.get('territory'),
                event['usage_date'],
                event['reporting_period'],
                json.dumps(event.get('raw_payload', {})),
                event.get('content_embedding')
            )
        
        return result

# Normalizer example
class SpotifyNormalizer:
    def normalize(self, raw_event: dict) -> dict:
        """Normalize Spotify streaming data format"""
        return {
            'source': 'spotify',
            'source_event_id': raw_event.get('stream_id'),
            'isrc': raw_event.get('track_isrc'),
            'reported_title': raw_event.get('track_name', ''),
            'reported_artist': raw_event.get('artist_name', ''),
            'reported_album': raw_event.get('album_name'),
            'usage_type': 'stream',
            'play_count': raw_event.get('stream_count', 1),
            'revenue_amount': raw_event.get('royalty_amount'),
            'currency': raw_event.get('currency', 'USD'),
            'territory': raw_event.get('country_code'),
            'usage_date': raw_event.get('stream_date'),
            'reporting_period': raw_event.get('reporting_period'),
            'raw_payload': raw_event
        }

if __name__ == "__main__":
    processor = UsageProcessor()
    asyncio.run(processor.start())
```

---

### 5. Royalty Calculator Service

```python
# services/royalties/src/services/calculator.py
from decimal import Decimal
from typing import List, Dict
from uuid import UUID
import asyncpg
from datetime import date

class RoyaltyCalculator:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    async def calculate_period(self, period_id: UUID) -> Dict:
        """Calculate royalties for an entire period"""
        async with self.db.acquire() as conn:
            # Update period status
            await conn.execute(
                "UPDATE royalty_periods SET status = 'calculating', "
                "calculation_started_at = NOW() WHERE id = $1",
                period_id
            )
            
            # Get period details
            period = await conn.fetchrow(
                "SELECT * FROM royalty_periods WHERE id = $1", period_id
            )
            
            # Get all songwriters with active deals
            songwriters = await conn.fetch("""
                SELECT DISTINCT s.id
                FROM songwriters s
                JOIN deals d ON s.id = d.songwriter_id
                WHERE d.status = 'active'
                AND d.effective_date <= $1
                AND (d.expiration_date IS NULL OR d.expiration_date >= $2)
            """, period['end_date'], period['start_date'])
            
            results = {
                'total_statements': 0,
                'total_gross': Decimal('0'),
                'total_net': Decimal('0'),
                'errors': []
            }
            
            for songwriter in songwriters:
                try:
                    statement = await self.calculate_songwriter_royalties(
                        period_id=period_id,
                        songwriter_id=songwriter['id'],
                        period_code=period['period_code']
                    )
                    results['total_statements'] += 1
                    results['total_gross'] += statement['gross_royalties']
                    results['total_net'] += statement['net_payable']
                except Exception as e:
                    results['errors'].append({
                        'songwriter_id': str(songwriter['id']),
                        'error': str(e)
                    })
            
            # Update period status
            await conn.execute(
                "UPDATE royalty_periods SET status = 'calculated', "
                "calculation_completed_at = NOW() WHERE id = $1",
                period_id
            )
        
        return results
    
    async def calculate_songwriter_royalties(
        self,
        period_id: UUID,
        songwriter_id: UUID,
        period_code: str
    ) -> Dict:
        """Calculate royalties for a single songwriter"""
        async with self.db.acquire() as conn:
            # Get all deals for songwriter
            deals = await conn.fetch("""
                SELECT d.*, 
                       ARRAY_AGG(dw.work_id) as work_ids
                FROM deals d
                JOIN deal_works dw ON d.id = dw.deal_id
                WHERE d.songwriter_id = $1 
                AND d.status = 'active'
                GROUP BY d.id
            """, songwriter_id)
            
            statement_id = await conn.fetchval("""
                INSERT INTO royalty_statements (period_id, songwriter_id)
                VALUES ($1, $2) RETURNING id
            """, period_id, songwriter_id)
            
            total_gross = Decimal('0')
            line_items = []
            
            for deal in deals:
                # Get matched usage for this deal's works
                usage_summary = await conn.fetch("""
                    SELECT 
                        mu.work_id,
                        ue.usage_type,
                        ue.territory,
                        ue.source,
                        SUM(ue.play_count) as total_plays,
                        SUM(ue.revenue_amount) as total_revenue,
                        ARRAY_AGG(mu.id) as matched_usage_ids
                    FROM matched_usage mu
                    JOIN usage_events ue ON mu.usage_event_id = ue.id
                    WHERE mu.work_id = ANY($1)
                    AND ue.reporting_period = $2
                    AND mu.match_confidence >= 0.8
                    GROUP BY mu.work_id, ue.usage_type, ue.territory, ue.source
                """, deal['work_ids'], period_code)
                
                for usage in usage_summary:
                    # Calculate royalty based on deal terms
                    gross_revenue = Decimal(str(usage['total_revenue'] or 0))
                    writer_rate = Decimal(str(deal['writer_share'])) / 100
                    
                    # Apply territory-specific rates if applicable
                    territory_rate = await self.get_territory_rate(
                        deal['id'], 
                        usage['territory']
                    )
                    
                    calculated_royalty = gross_revenue * writer_rate * territory_rate
                    total_gross += calculated_royalty
                    
                    # Store line item
                    line_item_id = await conn.fetchval("""
                        INSERT INTO royalty_line_items (
                            statement_id, deal_id, work_id, usage_type,
                            territory, source, usage_count, gross_revenue,
                            publisher_rate, calculated_royalty, matched_usage_ids
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING id
                    """, 
                        statement_id, deal['id'], usage['work_id'],
                        usage['usage_type'], usage['territory'], usage['source'],
                        usage['total_plays'], gross_revenue,
                        writer_rate, calculated_royalty, usage['matched_usage_ids']
                    )
                    
                    line_items.append({
                        'id': line_item_id,
                        'work_id': usage['work_id'],
                        'royalty': calculated_royalty
                    })
            
            # Calculate deductions
            deductions = await self.calculate_deductions(
                conn, songwriter_id, total_gross
            )
            
            net_payable = total_gross - deductions['total']
            
            # Update statement
            await conn.execute("""
                UPDATE royalty_statements SET
                    gross_royalties = $1,
                    publisher_share = $2,
                    writer_share = $3,
                    advance_recoupment = $4,
                    withholding_tax = $5,
                    net_payable = $6,
                    status = 'calculated'
                WHERE id = $7
            """,
                total_gross,
                total_gross * Decimal('0.5'),  # Example split
                total_gross * Decimal('0.5'),
                deductions['advance_recoupment'],
                deductions['withholding_tax'],
                net_payable,
                statement_id
            )
            
            return {
                'statement_id': statement_id,
                'gross_royalties': total_gross,
                'deductions': deductions,
                'net_payable': net_payable,
                'line_items_count': len(line_items)
            }
    
    async def calculate_deductions(
        self,
        conn: asyncpg.Connection,
        songwriter_id: UUID,
        gross_amount: Decimal
    ) -> Dict:
        """Calculate deductions (advances, taxes, etc.)"""
        # Get unrecouped advance balance
        advance_balance = await conn.fetchval("""
            SELECT COALESCE(SUM(advance_amount - advance_recouped), 0)
            FROM deals
            WHERE songwriter_id = $1 AND status = 'active'
        """, songwriter_id)
        
        # Calculate recoupment (up to gross amount or remaining balance)
        advance_recoupment = min(Decimal(str(advance_balance)), gross_amount)
        
        # Calculate withholding tax (simplified example)
        taxable_amount = gross_amount - advance_recoupment
        withholding_tax = taxable_amount * Decimal('0.15')  # 15% example rate
        
        return {
            'advance_recoupment': advance_recoupment,
            'withholding_tax': withholding_tax,
            'other_deductions': Decimal('0'),
            'total': advance_recoupment + withholding_tax
        }
    
    async def get_territory_rate(
        self,
        deal_id: UUID,
        territory: str
    ) -> Decimal:
        """Get territory-specific rate from deal terms"""
        # Default rate if no territory-specific rate exists
        return Decimal('1.0')
```

---

### 6. React Admin Portal - Works Management Page

```tsx
// apps/admin-portal/src/pages/Works/WorksPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit, Trash2, Music } from 'lucide-react';
import { worksApi } from '@/lib/api';
import { Work, WorkCreate } from '@musicpub/types';
import { DataTable } from '@/components/DataTable';
import { Button } from '@musicpub/ui';
import { WorkFormModal } from './WorkFormModal';
import { WorkDetailDrawer } from './WorkDetailDrawer';

export function WorksPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [page, setPage] = useState(1);

  const { data: worksData, isLoading } = useQuery({
    queryKey: ['works', { search: searchQuery, status: statusFilter, page }],
    queryFn: () => worksApi.listWorks({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      skip: (page - 1) * 25,
      limit: 25,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data: WorkCreate) => worksApi.createWork(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      setIsCreateModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => worksApi.deleteWork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
  });

  const columns = [
    {
      key: 'title',
      header: 'Title',
      cell: (work: Work) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Music className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{work.title}</div>
            {work.iswc && (
              <div className="text-sm text-gray-500">ISWC: {work.iswc}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'writers',
      header: 'Writers',
      cell: (work: Work) => (
        <div className="text-sm">
          {work.writers?.map(w => w.songwriter.legal_name).join(', ') || '-'}
        </div>
      ),
    },
    {
      key: 'recordings',
      header: 'Recordings',
      cell: (work: Work) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {work.recordings_count || 0} recordings
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (work: Work) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          work.status === 'active' 
            ? 'bg-green-100 text-green-800'
            : work.status === 'disputed'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {work.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (work: Work) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedWork(work)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('Delete this work?')) {
                deleteMutation.mutate(work.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Works</h1>
          <p className="text-gray-500">Manage your music catalog</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Work
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search works..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="disputed">Disputed</option>
        </select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={worksData?.items || []}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages: Math.ceil((worksData?.total || 0) / 25),
          onPageChange: setPage,
        }}
        onRowClick={(work) => setSelectedWork(work)}
      />

      {/* Create Modal */}
      <WorkFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Detail Drawer */}
      <WorkDetailDrawer
        work={selectedWork}
        isOpen={!!selectedWork}
        onClose={() => setSelectedWork(null)}
      />
    </div>
  );
}
```

---

### 7. React Songwriter Portal - Royalties Dashboard

```tsx
// apps/songwriter-portal/src/pages/Dashboard/DashboardPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Music, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { royaltiesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RoyaltyChart } from '@/components/RoyaltyChart';
import { StatementCard } from '@/components/StatementCard';

export function DashboardPage() {
  const { user } = useAuth();

  const { data: summary } = useQuery({
    queryKey: ['royalties', 'summary', user?.songwriter_id],
    queryFn: () => royaltiesApi.getSongwriterSummary(user!.songwriter_id),
    enabled: !!user?.songwriter_id,
  });

  const { data: recentStatements } = useQuery({
    queryKey: ['royalties', 'statements', 'recent', user?.songwriter_id],
    queryFn: () => royaltiesApi.getStatements({
      songwriter_id: user!.songwriter_id,
      limit: 4,
    }),
    enabled: !!user?.songwriter_id,
  });

  const { data: topWorks } = useQuery({
    queryKey: ['works', 'top', user?.songwriter_id],
    queryFn: () => royaltiesApi.getTopPerformingWorks(user!.songwriter_id),
    enabled: !!user?.songwriter_id,
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-500">
          Here's an overview of your royalties and catalog performance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Quarter</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(summary?.current_quarter_earnings || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          {summary?.quarter_change && (
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className={`w-4 h-4 mr-1 ${
                summary.quarter_change >= 0 ? 'text-green-500' : 'text-red-500'
              }`} />
              <span className={summary.quarter_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                {summary.quarter_change >= 0 ? '+' : ''}{summary.quarter_change}%
              </span>
              <span className="text-gray-500 ml-1">vs last quarter</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Year to Date</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(summary?.ytd_earnings || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Works</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {summary?.active_works_count || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Music className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payout</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(summary?.pending_payout || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          {summary?.next_payment_date && (
            <p className="mt-4 text-sm text-gray-500">
              Expected: {formatDate(summary.next_payment_date)}
            </p>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Earnings Over Time
          </h2>
          <RoyaltyChart
            data={summary?.monthly_earnings || []}
            type="line"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue by Source
          </h2>
          <RoyaltyChart
            data={summary?.revenue_by_source || []}
            type="donut"
          />
        </div>
      </div>

      {/* Recent Statements & Top Works */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Statements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Statements
            </h2>
            <Link
              to="/royalties"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
            >
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentStatements?.items?.map((statement) => (
              <StatementCard
                key={statement.id}
                statement={statement}
                compact
              />
            ))}
          </div>
        </div>

        {/* Top Performing Works */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Performing Works
            </h2>
            <Link
              to="/works"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
            >
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {topWorks?.map((work, index) => (
              <div
                key={work.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-400 w-6">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{work.title}</p>
                    <p className="text-sm text-gray-500">
                      {work.total_plays?.toLocaleString()} plays
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(work.total_royalties)}
                  </p>
                  <p className="text-sm text-gray-500">this quarter</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Docker Compose (Development)

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # Database
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: musicpub
      POSTGRES_PASSWORD: musicpub_dev
      POSTGRES_DB: musicpub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U musicpub"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
    depends_on:
      - kafka

  # Services
  auth-service:
    build:
      context: ./services/auth
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      DATABASE_URL: postgresql://musicpub:musicpub_dev@postgres:5432/musicpub
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev_jwt_secret_change_in_production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  works-service:
    build:
      context: ./services/works
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    environment:
      DATABASE_URL: postgresql://musicpub:musicpub_dev@postgres:5432/musicpub
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy

  deals-service:
    build:
      context: ./services/deals
      dockerfile: Dockerfile
    ports:
      - "8003:8003"
    environment:
      DATABASE_URL: postgresql://musicpub:musicpub_dev@postgres:5432/musicpub
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy

  royalties-service:
    build:
      context: ./services/royalties
      dockerfile: Dockerfile
    ports:
      - "8004:8004"
    environment:
      DATABASE_URL: postgresql://musicpub:musicpub_dev@postgres:5432/musicpub
      KAFKA_BROKERS: kafka:29092
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_started

  ai-service:
    build:
      context: ./services/ai
      dockerfile: Dockerfile
    ports:
      - "8005:8005"
    environment:
      DATABASE_URL: postgresql://musicpub:musicpub_dev@postgres:5432/musicpub
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy

  usage-processor:
    build:
      context: ./services/workers/usage_processor
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://musicpub:musicpub_dev@postgres:5432/musicpub
      KAFKA_BROKERS: kafka:29092
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_started

volumes:
  postgres_data:
  redis_data:
```

This comprehensive project structure and code examples should give you a solid foundation for implementing the music publishing system!