"""SQLAlchemy models for Usage Processor Worker."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, BigInteger, Date, DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class UsageEvent(Base):
    """Usage event from streaming platforms and other sources."""

    __tablename__ = "usage_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Source Information
    source: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Content Identification
    isrc: Mapped[Optional[str]] = mapped_column(String(12), nullable=True, index=True)
    reported_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reported_artist: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reported_album: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Usage Details
    usage_type: Mapped[str] = mapped_column(String(50), nullable=False)
    play_count: Mapped[int] = mapped_column(BigInteger, default=1)
    revenue_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 6), nullable=True
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Geographic & Temporal
    territory: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    usage_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    reporting_period: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, index=True
    )

    # Processing Status
    processing_status: Mapped[str] = mapped_column(
        String(50), default="pending", index=True
    )

    # Raw Data
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Timestamps
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Embedding for fuzzy matching
    content_embedding = mapped_column(Vector(1536), nullable=True)

    def __repr__(self) -> str:
        return f"<UsageEvent(id={self.id}, source={self.source}, title={self.reported_title})>"


class Recording(Base):
    """Recording model (read-only reference for ISRC lookups)."""

    __tablename__ = "recordings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    work_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    isrc: Mapped[Optional[str]] = mapped_column(
        String(12), unique=True, nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    artist_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    version_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(nullable=True)
    release_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extra_metadata: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSONB, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Recording(id={self.id}, isrc={self.isrc}, title={self.title})>"


class Work(Base):
    """Work model (read-only reference for matching)."""

    __tablename__ = "works"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    alternate_titles: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    iswc: Mapped[Optional[str]] = mapped_column(
        String(15), unique=True, nullable=True, index=True
    )
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    release_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(nullable=True)
    lyrics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_metadata: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSONB, default=dict
    )
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Vector embeddings for AI matching
    title_embedding = mapped_column(Vector(1536), nullable=True)
    metadata_embedding = mapped_column(Vector(1536), nullable=True)

    def __repr__(self) -> str:
        return f"<Work(id={self.id}, title={self.title})>"
