"""Pydantic schemas for Kafka messages in the usage pipeline."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class UsageType(str, Enum):
    """Types of usage events."""

    STREAM = "stream"
    DOWNLOAD = "download"
    RADIO_PLAY = "radio_play"
    TV_BROADCAST = "tv_broadcast"
    PUBLIC_PERFORMANCE = "public_performance"
    SYNC = "sync"
    MECHANICAL = "mechanical"


class ProcessingStatus(str, Enum):
    """Processing status for usage events."""

    PENDING = "pending"
    PROCESSING = "processing"
    MATCHED = "matched"
    UNMATCHED = "unmatched"
    DISPUTED = "disputed"
    ERROR = "error"


class MatchMethod(str, Enum):
    """Methods used to match usage to works."""

    ISRC_EXACT = "isrc_exact"
    ISWC_EXACT = "iswc_exact"
    TITLE_ARTIST_EXACT = "title_artist_exact"
    FUZZY_TITLE = "fuzzy_title"
    AI_EMBEDDING = "ai_embedding"
    MANUAL = "manual"


# ============================================
# Raw Usage Events (from DSPs)
# ============================================


class RawUsageEvent(BaseModel):
    """Raw usage event as received from DSPs."""

    # Source identification
    source_event_id: str | None = None
    source: str  # spotify, apple_music, radio, etc.

    # Content identification (DSP-specific fields)
    isrc: str | None = None
    iswc: str | None = None
    title: str | None = None
    artist: str | None = None
    album: str | None = None

    # Usage details
    usage_type: str = "stream"
    play_count: int = 1
    revenue_amount: Decimal | None = None
    currency: str = "USD"

    # Geographic & temporal
    territory: str | None = None
    usage_date: date
    reporting_period: str | None = None  # Q1_2024, 2024_01, etc.

    # Raw payload for debugging
    raw_payload: dict[str, Any] | None = None


# ============================================
# Normalized Usage Events
# ============================================


class NormalizedUsageEvent(BaseModel):
    """Normalized usage event ready for matching."""

    # Event identification
    event_id: UUID
    source: str
    source_event_id: str | None = None

    # Content identification (standardized)
    isrc: str | None = None
    iswc: str | None = None
    reported_title: str | None = None
    reported_artist: str | None = None
    reported_album: str | None = None

    # Usage details
    usage_type: UsageType
    play_count: int = 1
    revenue_amount: Decimal | None = None
    currency: str = "USD"

    # Geographic & temporal
    territory: str | None = None
    usage_date: date
    reporting_period: str | None = None

    # Processing metadata
    ingested_at: datetime
    content_embedding: list[float] | None = None

    class Config:
        use_enum_values = True


# ============================================
# Match Results
# ============================================


class MatchResult(BaseModel):
    """Result of a matching attempt."""

    work_id: UUID
    recording_id: UUID | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    method: MatchMethod
    alternative_matches: list["MatchResult"] = []

    class Config:
        use_enum_values = True


class MatchedUsageEvent(BaseModel):
    """Usage event that has been successfully matched to a work."""

    # Original event reference
    usage_event_id: UUID
    source: str
    usage_date: date
    territory: str | None = None

    # Match details
    work_id: UUID
    recording_id: UUID | None = None
    match_confidence: float = Field(ge=0.0, le=1.0)
    match_method: MatchMethod

    # Usage details
    usage_type: UsageType
    play_count: int
    revenue_amount: Decimal | None = None
    currency: str = "USD"

    # Timestamps
    matched_at: datetime

    class Config:
        use_enum_values = True


class UnmatchedUsageEvent(BaseModel):
    """Usage event that could not be automatically matched."""

    # Event identification
    usage_event_id: UUID
    source: str
    source_event_id: str | None = None

    # Content identification
    isrc: str | None = None
    reported_title: str | None = None
    reported_artist: str | None = None
    reported_album: str | None = None

    # Usage details
    usage_type: UsageType
    play_count: int
    revenue_amount: Decimal | None = None
    currency: str = "USD"
    territory: str | None = None
    usage_date: date

    # Attempted matches with low confidence
    suggested_matches: list[MatchResult] = []

    # Reason for not matching
    reason: str = "no_match_found"

    # Timestamps
    queued_at: datetime

    class Config:
        use_enum_values = True


# ============================================
# API Request/Response schemas
# ============================================


class UsageIngestRequest(BaseModel):
    """Request to ingest raw usage events."""

    events: list[RawUsageEvent]
    source: str


class UsageStatsResponse(BaseModel):
    """Usage statistics response."""

    total_events: int
    matched_count: int
    unmatched_count: int
    pending_count: int
    match_rate: float
    by_source: dict[str, int]
    by_territory: dict[str, int]
    by_period: dict[str, int]


class ManualMatchRequest(BaseModel):
    """Request to manually match a usage event to a work."""

    usage_event_id: UUID
    work_id: UUID
    recording_id: UUID | None = None
