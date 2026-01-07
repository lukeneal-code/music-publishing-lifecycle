import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Date, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Songwriter(Base):
    """Songwriter model (read-only in works service)."""

    __tablename__ = "songwriters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stage_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ipi_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    pro_affiliation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    work_writers: Mapped[list["WorkWriter"]] = relationship("WorkWriter", back_populates="songwriter")

    def __repr__(self) -> str:
        return f"<Songwriter(id={self.id}, legal_name={self.legal_name})>"


class Work(Base):
    """Work (musical composition) model."""

    __tablename__ = "works"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    alternate_titles: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    iswc: Mapped[Optional[str]] = mapped_column(String(15), unique=True, nullable=True, index=True)
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    release_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    lyrics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_data: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Vector embeddings for AI matching
    title_embedding = mapped_column(Vector(1536), nullable=True)
    metadata_embedding = mapped_column(Vector(1536), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    writers: Mapped[list["WorkWriter"]] = relationship("WorkWriter", back_populates="work", lazy="selectin")
    recordings: Mapped[list["Recording"]] = relationship("Recording", back_populates="work", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Work(id={self.id}, title={self.title})>"


class WorkWriter(Base):
    """Association between works and songwriters."""

    __tablename__ = "work_writers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    work_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    songwriter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    writer_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ownership_share: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    work: Mapped["Work"] = relationship("Work", back_populates="writers")
    songwriter: Mapped["Songwriter"] = relationship("Songwriter", back_populates="work_writers", lazy="selectin")

    def __repr__(self) -> str:
        return f"<WorkWriter(work_id={self.work_id}, songwriter_id={self.songwriter_id})>"


class Recording(Base):
    """Recording linked to a work."""

    __tablename__ = "recordings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    work_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    isrc: Mapped[Optional[str]] = mapped_column(String(12), unique=True, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    artist_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    version_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    release_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extra_data: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    work: Mapped["Work"] = relationship("Work", back_populates="recordings")

    def __repr__(self) -> str:
        return f"<Recording(id={self.id}, title={self.title}, isrc={self.isrc})>"
