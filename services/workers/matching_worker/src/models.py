"""SQLAlchemy models for Matching Worker."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, BigInteger, Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UsageEvent(Base):
    """Usage event model for reading and updating status."""

    __tablename__ = "usage_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
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
    revenue_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 6), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    # Geographic & Temporal
    territory: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    usage_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    reporting_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)

    # Processing Status
    processing_status: Mapped[str] = mapped_column(String(50), default="pending", index=True)

    # Timestamps
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Embedding for matching
    content_embedding = mapped_column(Vector(1536), nullable=True)

    def __repr__(self) -> str:
        return f"<UsageEvent(id={self.id}, title={self.reported_title})>"


class MatchedUsage(Base):
    """Matched usage - links usage events to works."""

    __tablename__ = "matched_usage"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    usage_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usage_events.id"),
        nullable=False,
        index=True,
    )
    work_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("works.id"),
        nullable=False,
        index=True,
    )
    recording_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recordings.id"),
        nullable=True,
    )

    # Matching Details
    match_confidence: Mapped[Decimal] = mapped_column(
        Numeric(5, 4),
        nullable=False,
    )
    match_method: Mapped[str] = mapped_column(String(50), nullable=False)
    matched_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Confirmation
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Timestamps
    matched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    def __repr__(self) -> str:
        return f"<MatchedUsage(usage={self.usage_event_id}, work={self.work_id}, confidence={self.match_confidence})>"


class Work(Base):
    """Work model for matching queries."""

    __tablename__ = "works"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    alternate_titles: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    iswc: Mapped[Optional[str]] = mapped_column(String(15), unique=True, nullable=True, index=True)
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Embeddings
    title_embedding = mapped_column(Vector(1536), nullable=True)
    metadata_embedding = mapped_column(Vector(1536), nullable=True)

    # Relationships
    recordings: Mapped[list["Recording"]] = relationship("Recording", back_populates="work", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Work(id={self.id}, title={self.title})>"


class Recording(Base):
    """Recording model for ISRC lookups."""

    __tablename__ = "recordings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    work_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("works.id"),
        nullable=False,
        index=True,
    )
    isrc: Mapped[Optional[str]] = mapped_column(String(12), unique=True, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    artist_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    version_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationship
    work: Mapped["Work"] = relationship("Work", back_populates="recordings")

    def __repr__(self) -> str:
        return f"<Recording(id={self.id}, isrc={self.isrc})>"
