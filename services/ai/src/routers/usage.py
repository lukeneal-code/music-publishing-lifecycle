"""Usage data API endpoints for the AI service."""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usage", tags=["usage"])

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
