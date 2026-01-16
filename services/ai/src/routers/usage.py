"""Usage data API endpoints for the AI service."""

import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from aiokafka import AIOKafkaProducer
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usage", tags=["usage"])

# Kafka topic mapping
SOURCE_TOPIC_MAP = {
    "spotify": "usage.raw.spotify",
    "apple_music": "usage.raw.apple_music",
    "radio": "usage.raw.radio",
}
DEFAULT_TOPIC = "usage.raw.generic"

# Database setup (reusing AI service's config)
DATABASE_URL = getattr(settings, 'database_url', 'postgresql+asyncpg://musicpub:musicpub_dev@postgres:5432/musicpub')
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Request/Response Models
class RawUsageEventInput(BaseModel):
    """Input for a raw usage event."""

    source_event_id: str | None = None
    isrc: str | None = None
    title: str | None = None
    artist: str | None = None
    album: str | None = None
    usage_type: str = "stream"
    play_count: int = 1
    revenue_amount: float | None = None
    currency: str = "USD"
    territory: str | None = None
    usage_date: str  # YYYY-MM-DD format
    reporting_period: str | None = None


class UsageIngestRequest(BaseModel):
    """Request to ingest usage events."""

    events: list[RawUsageEventInput]
    source: str = "generic"


class UsageIngestResponse(BaseModel):
    """Response from usage ingestion."""

    message: str
    events_received: int
    events_queued: int


class UsageEventResponse(BaseModel):
    """Response for a usage event."""

    id: str
    source: str
    isrc: str | None
    reported_title: str | None
    reported_artist: str | None
    usage_type: str
    play_count: int
    revenue_amount: float | None
    territory: str | None
    usage_date: str
    processing_status: str
    ingested_at: str


class UnmatchedListResponse(BaseModel):
    """Response for listing unmatched events."""

    items: list[UsageEventResponse]
    total: int
    skip: int
    limit: int


class ManualMatchRequest(BaseModel):
    """Request to manually match a usage event."""

    usage_event_id: str
    work_id: str
    recording_id: str | None = None


class ManualMatchResponse(BaseModel):
    """Response from manual matching."""

    message: str
    usage_event_id: str
    work_id: str
    match_method: str = "manual"


class UsageStatsResponse(BaseModel):
    """Usage statistics response."""

    total_events: int
    matched_count: int
    unmatched_count: int
    pending_count: int
    error_count: int
    match_rate: float
    by_source: dict[str, int]
    by_status: dict[str, int]


class UsageKafkaIngestResponse(BaseModel):
    """Response from Kafka-based usage ingestion."""

    message: str
    events_received: int
    events_published: int
    topic: str


class MatchInfo(BaseModel):
    """Match information for a usage event."""

    work_id: str
    work_title: str
    recording_id: str | None = None
    match_confidence: float
    match_method: str
    is_confirmed: bool
    matched_at: str | None = None


class UsageEventDetailResponse(BaseModel):
    """Detailed response for a usage event including match info."""

    id: str
    source: str
    source_event_id: str | None = None
    isrc: str | None = None
    reported_title: str | None = None
    reported_artist: str | None = None
    reported_album: str | None = None
    usage_type: str
    play_count: int
    revenue_amount: float | None = None
    currency: str = "USD"
    territory: str | None = None
    usage_date: str
    reporting_period: str | None = None
    processing_status: str
    ingested_at: str
    processed_at: str | None = None
    match_info: MatchInfo | None = None


class UsageEventsListResponse(BaseModel):
    """Response for listing all usage events with filters."""

    items: list[UsageEventDetailResponse]
    total: int
    skip: int
    limit: int


# Endpoints
@router.post("/ingest", response_model=UsageIngestResponse)
async def ingest_usage_events(request: UsageIngestRequest):
    """
    Ingest raw usage events.

    For testing purposes, this endpoint directly inserts events into the database
    and marks them as 'pending' for processing by the Usage Processor Worker.

    In production, events would typically be published to Kafka topics.
    """
    from sqlalchemy import text

    if not request.events:
        raise HTTPException(status_code=400, detail="No events provided")

    events_queued = 0

    async with async_session_maker() as session:
        for event in request.events:
            try:
                # Parse usage date
                usage_date = datetime.strptime(event.usage_date, "%Y-%m-%d").date()

                # Generate reporting period if not provided
                reporting_period = event.reporting_period
                if not reporting_period:
                    reporting_period = usage_date.strftime("%Y_%m")

                # Insert directly into usage_events table
                insert_sql = text("""
                    INSERT INTO usage_events (
                        source, source_event_id, isrc, reported_title, reported_artist,
                        reported_album, usage_type, play_count, revenue_amount, currency,
                        territory, usage_date, reporting_period, processing_status,
                        ingested_at
                    ) VALUES (
                        :source, :source_event_id, :isrc, :title, :artist,
                        :album, :usage_type, :play_count, :revenue_amount, :currency,
                        :territory, :usage_date, :reporting_period, 'pending',
                        NOW()
                    )
                """)

                await session.execute(insert_sql, {
                    "source": request.source,
                    "source_event_id": event.source_event_id,
                    "isrc": event.isrc,
                    "title": event.title,
                    "artist": event.artist,
                    "album": event.album,
                    "usage_type": event.usage_type,
                    "play_count": event.play_count,
                    "revenue_amount": event.revenue_amount,
                    "currency": event.currency,
                    "territory": event.territory,
                    "usage_date": usage_date,
                    "reporting_period": reporting_period,
                })

                events_queued += 1

            except Exception as e:
                logger.error(f"Error ingesting event: {e}")
                continue

        await session.commit()

    return UsageIngestResponse(
        message=f"Successfully queued {events_queued} events for processing",
        events_received=len(request.events),
        events_queued=events_queued,
    )


@router.post("/ingest-kafka", response_model=UsageKafkaIngestResponse)
async def ingest_usage_events_kafka(request: UsageIngestRequest):
    """
    Ingest raw usage events by publishing to Kafka.

    This endpoint publishes events to Kafka raw topics so they flow through
    the full processing pipeline (Usage Processor -> Matching Worker).

    Topic mapping:
    - spotify -> usage.raw.spotify
    - apple_music -> usage.raw.apple_music
    - radio -> usage.raw.radio
    - * -> usage.raw.generic
    """
    if not request.events:
        raise HTTPException(status_code=400, detail="No events provided")

    # Determine topic based on source
    topic = SOURCE_TOPIC_MAP.get(request.source.lower(), DEFAULT_TOPIC)
    events_published = 0

    try:
        producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_brokers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
        )
        await producer.start()

        try:
            for event in request.events:
                # Create message payload
                message = {
                    "source": request.source,
                    "source_event_id": event.source_event_id or str(uuid4()),
                    "isrc": event.isrc,
                    "reported_title": event.title,
                    "reported_artist": event.artist,
                    "reported_album": event.album,
                    "usage_type": event.usage_type,
                    "play_count": event.play_count,
                    "revenue_amount": event.revenue_amount,
                    "currency": event.currency,
                    "territory": event.territory,
                    "usage_date": event.usage_date,
                    "reporting_period": event.reporting_period,
                    "ingested_at": datetime.utcnow().isoformat(),
                }

                # Use ISRC as key for partitioning if available
                key = event.isrc or event.source_event_id

                await producer.send_and_wait(topic, value=message, key=key)
                events_published += 1

        finally:
            await producer.stop()

    except Exception as e:
        logger.error(f"Failed to publish events to Kafka: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to publish events to Kafka: {str(e)}"
        )

    return UsageKafkaIngestResponse(
        message=f"Successfully published {events_published} events to Kafka",
        events_received=len(request.events),
        events_published=events_published,
        topic=topic,
    )


@router.get("/events", response_model=UsageEventsListResponse)
async def list_usage_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None, description="Filter by status: pending, processing, matched, unmatched, error"),
    source: str | None = Query(None, description="Filter by source: spotify, apple_music, radio, generic"),
    start_date: str | None = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="Filter by end date (YYYY-MM-DD)"),
):
    """
    List all usage events with optional filters.

    Supports filtering by:
    - status: pending, processing, matched, unmatched, error
    - source: spotify, apple_music, radio, generic
    - date range: start_date, end_date
    """
    from sqlalchemy import text

    async with async_session_maker() as session:
        # Build query with filters
        where_clauses = ["1=1"]
        params: dict[str, Any] = {"skip": skip, "limit": limit}

        if status:
            where_clauses.append("ue.processing_status = :status")
            params["status"] = status

        if source:
            where_clauses.append("ue.source = :source")
            params["source"] = source

        if start_date:
            where_clauses.append("ue.usage_date >= :start_date")
            params["start_date"] = start_date

        if end_date:
            where_clauses.append("ue.usage_date <= :end_date")
            params["end_date"] = end_date

        where_sql = " AND ".join(where_clauses)

        # Query events with optional match info
        query = text(f"""
            SELECT
                ue.id, ue.source, ue.source_event_id, ue.isrc,
                ue.reported_title, ue.reported_artist, ue.reported_album,
                ue.usage_type, ue.play_count, ue.revenue_amount, ue.currency,
                ue.territory, ue.usage_date, ue.reporting_period,
                ue.processing_status, ue.ingested_at, ue.processed_at,
                mu.work_id, mu.recording_id, mu.match_confidence,
                mu.match_method, mu.is_confirmed, mu.matched_at,
                w.title as work_title
            FROM usage_events ue
            LEFT JOIN matched_usage mu ON ue.id = mu.usage_event_id
            LEFT JOIN works w ON mu.work_id = w.id
            WHERE {where_sql}
            ORDER BY ue.ingested_at DESC
            OFFSET :skip LIMIT :limit
        """)

        result = await session.execute(query, params)
        rows = result.fetchall()

        items = []
        for row in rows:
            match_info = None
            if row.work_id:
                match_info = MatchInfo(
                    work_id=str(row.work_id),
                    work_title=row.work_title or "Unknown",
                    recording_id=str(row.recording_id) if row.recording_id else None,
                    match_confidence=float(row.match_confidence) if row.match_confidence else 0.0,
                    match_method=row.match_method or "unknown",
                    is_confirmed=row.is_confirmed or False,
                    matched_at=row.matched_at.isoformat() if row.matched_at else None,
                )

            items.append(UsageEventDetailResponse(
                id=str(row.id),
                source=row.source,
                source_event_id=row.source_event_id,
                isrc=row.isrc,
                reported_title=row.reported_title,
                reported_artist=row.reported_artist,
                reported_album=row.reported_album,
                usage_type=row.usage_type,
                play_count=row.play_count,
                revenue_amount=float(row.revenue_amount) if row.revenue_amount else None,
                currency=row.currency or "USD",
                territory=row.territory,
                usage_date=str(row.usage_date),
                reporting_period=row.reporting_period,
                processing_status=row.processing_status,
                ingested_at=row.ingested_at.isoformat(),
                processed_at=row.processed_at.isoformat() if row.processed_at else None,
                match_info=match_info,
            ))

        # Get total count
        count_query = text(f"""
            SELECT COUNT(*) as total FROM usage_events ue WHERE {where_sql}
        """)
        count_params = {k: v for k, v in params.items() if k not in ("skip", "limit")}
        count_result = await session.execute(count_query, count_params)
        total = count_result.scalar() or 0

    return UsageEventsListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/unmatched", response_model=UnmatchedListResponse)
async def list_unmatched_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    source: str | None = None,
    territory: str | None = None,
):
    """
    List unmatched usage events that need manual review.
    """
    from sqlalchemy import text

    async with async_session_maker() as session:
        # Build query
        where_clauses = ["processing_status = 'unmatched'"]
        params: dict[str, Any] = {"skip": skip, "limit": limit}

        if source:
            where_clauses.append("source = :source")
            params["source"] = source

        if territory:
            where_clauses.append("territory = :territory")
            params["territory"] = territory

        where_sql = " AND ".join(where_clauses)

        # Get items
        query = text(f"""
            SELECT id, source, isrc, reported_title, reported_artist,
                   usage_type, play_count, revenue_amount, territory,
                   usage_date, processing_status, ingested_at
            FROM usage_events
            WHERE {where_sql}
            ORDER BY ingested_at DESC
            OFFSET :skip LIMIT :limit
        """)

        result = await session.execute(query, params)
        rows = result.fetchall()

        items = [
            UsageEventResponse(
                id=str(row.id),
                source=row.source,
                isrc=row.isrc,
                reported_title=row.reported_title,
                reported_artist=row.reported_artist,
                usage_type=row.usage_type,
                play_count=row.play_count,
                revenue_amount=float(row.revenue_amount) if row.revenue_amount else None,
                territory=row.territory,
                usage_date=str(row.usage_date),
                processing_status=row.processing_status,
                ingested_at=row.ingested_at.isoformat(),
            )
            for row in rows
        ]

        # Get total count
        count_query = text(f"""
            SELECT COUNT(*) as total FROM usage_events WHERE {where_sql}
        """)
        count_params = {k: v for k, v in params.items() if k not in ("skip", "limit")}
        count_result = await session.execute(count_query, count_params)
        total = count_result.scalar() or 0

    return UnmatchedListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/manual-match", response_model=ManualMatchResponse)
async def manual_match_event(request: ManualMatchRequest):
    """
    Manually match a usage event to a work.
    """
    from sqlalchemy import text

    async with async_session_maker() as session:
        # Verify usage event exists
        check_event = text("""
            SELECT id, processing_status FROM usage_events WHERE id = :event_id
        """)
        result = await session.execute(check_event, {"event_id": request.usage_event_id})
        event = result.fetchone()

        if not event:
            raise HTTPException(status_code=404, detail="Usage event not found")

        # Verify work exists
        check_work = text("""
            SELECT id FROM works WHERE id = :work_id
        """)
        result = await session.execute(check_work, {"work_id": request.work_id})
        work = result.fetchone()

        if not work:
            raise HTTPException(status_code=404, detail="Work not found")

        # Create matched_usage record
        insert_match = text("""
            INSERT INTO matched_usage (
                usage_event_id, work_id, recording_id, match_confidence,
                match_method, matched_by, is_confirmed, confirmed_at
            ) VALUES (
                :usage_event_id, :work_id, :recording_id, 1.0,
                'manual', 'api', true, NOW()
            )
            ON CONFLICT (usage_event_id, work_id) DO UPDATE SET
                match_confidence = 1.0,
                match_method = 'manual',
                is_confirmed = true,
                confirmed_at = NOW()
        """)

        await session.execute(insert_match, {
            "usage_event_id": request.usage_event_id,
            "work_id": request.work_id,
            "recording_id": request.recording_id,
        })

        # Update usage event status
        update_event = text("""
            UPDATE usage_events
            SET processing_status = 'matched', processed_at = NOW()
            WHERE id = :event_id
        """)
        await session.execute(update_event, {"event_id": request.usage_event_id})

        await session.commit()

    return ManualMatchResponse(
        message="Successfully matched usage event to work",
        usage_event_id=request.usage_event_id,
        work_id=request.work_id,
        match_method="manual",
    )


@router.get("/stats", response_model=UsageStatsResponse)
async def get_usage_stats():
    """
    Get usage statistics including match rates and breakdowns.
    """
    from sqlalchemy import text

    async with async_session_maker() as session:
        # Get counts by status
        status_query = text("""
            SELECT processing_status, COUNT(*) as count
            FROM usage_events
            GROUP BY processing_status
        """)
        result = await session.execute(status_query)
        status_counts = {row.processing_status: row.count for row in result.fetchall()}

        total = sum(status_counts.values())
        matched = status_counts.get("matched", 0)
        unmatched = status_counts.get("unmatched", 0)
        pending = status_counts.get("pending", 0)
        error = status_counts.get("error", 0)

        match_rate = (matched / total * 100) if total > 0 else 0

        # Get counts by source
        source_query = text("""
            SELECT source, COUNT(*) as count
            FROM usage_events
            GROUP BY source
        """)
        result = await session.execute(source_query)
        source_counts = {row.source: row.count for row in result.fetchall()}

    return UsageStatsResponse(
        total_events=total,
        matched_count=matched,
        unmatched_count=unmatched,
        pending_count=pending,
        error_count=error,
        match_rate=round(match_rate, 2),
        by_source=source_counts,
        by_status=status_counts,
    )


@router.get("/{event_id}", response_model=UsageEventResponse)
async def get_usage_event(event_id: str):
    """
    Get a specific usage event by ID.
    """
    from sqlalchemy import text

    async with async_session_maker() as session:
        query = text("""
            SELECT id, source, isrc, reported_title, reported_artist,
                   usage_type, play_count, revenue_amount, territory,
                   usage_date, processing_status, ingested_at
            FROM usage_events
            WHERE id = :event_id
        """)
        result = await session.execute(query, {"event_id": event_id})
        row = result.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Usage event not found")

        return UsageEventResponse(
            id=str(row.id),
            source=row.source,
            isrc=row.isrc,
            reported_title=row.reported_title,
            reported_artist=row.reported_artist,
            usage_type=row.usage_type,
            play_count=row.play_count,
            revenue_amount=float(row.revenue_amount) if row.revenue_amount else None,
            territory=row.territory,
            usage_date=str(row.usage_date),
            processing_status=row.processing_status,
            ingested_at=row.ingested_at.isoformat(),
        )
