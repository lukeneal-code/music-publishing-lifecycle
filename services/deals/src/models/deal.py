import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Songwriter(Base):
    """Songwriter model (read-only in deals service)."""

    __tablename__ = "songwriters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stage_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ipi_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    pro_affiliation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    deals: Mapped[list["Deal"]] = relationship("Deal", back_populates="songwriter")

    def __repr__(self) -> str:
        return f"<Songwriter(id={self.id}, legal_name={self.legal_name})>"


class Work(Base):
    """Work model (read-only in deals service)."""

    __tablename__ = "works"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    iswc: Mapped[Optional[str]] = mapped_column(String(15), unique=True, nullable=True, index=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    deal_works: Mapped[list["DealWork"]] = relationship("DealWork", back_populates="work")

    def __repr__(self) -> str:
        return f"<Work(id={self.id}, title={self.title})>"


class Deal(Base):
    """Deal/Agreement model for music publishing contracts."""

    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    deal_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    songwriter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("songwriters.id"),
        nullable=False,
        index=True,
    )
    deal_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")

    # Financial Terms
    advance_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    advance_recouped: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    publisher_share: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    writer_share: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    # Term Details
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    term_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retention_period_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Scope
    territories: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), default=["WORLD"])
    rights_granted: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), default=["ALL"])
    excluded_rights: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)

    # Contract Details
    contract_document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    contract_embedding = mapped_column(Vector(1536), nullable=True)
    special_terms: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Audit Trail
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    songwriter: Mapped["Songwriter"] = relationship("Songwriter", back_populates="deals", lazy="selectin")
    deal_works: Mapped[list["DealWork"]] = relationship(
        "DealWork", back_populates="deal", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Deal(id={self.id}, deal_number={self.deal_number}, status={self.status})>"


class DealWork(Base):
    """Association between deals and works."""

    __tablename__ = "deal_works"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    deal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("works.id"),
        nullable=False,
        index=True,
    )
    included_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    excluded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    deal: Mapped["Deal"] = relationship("Deal", back_populates="deal_works")
    work: Mapped["Work"] = relationship("Work", back_populates="deal_works", lazy="selectin")

    def __repr__(self) -> str:
        return f"<DealWork(deal_id={self.deal_id}, work_id={self.work_id})>"
