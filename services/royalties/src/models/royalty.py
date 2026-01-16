import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import ARRAY, Date, DateTime, ForeignKey, Numeric, String, Text, BigInteger, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Songwriter(Base):
    """Songwriter model (read-only in royalties service)."""

    __tablename__ = "songwriters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stage_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ipi_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    pro_affiliation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    statements: Mapped[list["RoyaltyStatement"]] = relationship("RoyaltyStatement", back_populates="songwriter")
    deals: Mapped[list["Deal"]] = relationship("Deal", back_populates="songwriter")

    def __repr__(self) -> str:
        return f"<Songwriter(id={self.id}, legal_name={self.legal_name})>"


class Work(Base):
    """Work model (read-only in royalties service)."""

    __tablename__ = "works"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    iswc: Mapped[Optional[str]] = mapped_column(String(15), unique=True, nullable=True, index=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    line_items: Mapped[list["RoyaltyLineItem"]] = relationship("RoyaltyLineItem", back_populates="work")
    deal_works: Mapped[list["DealWork"]] = relationship("DealWork", back_populates="work")
    matched_usages: Mapped[list["MatchedUsage"]] = relationship("MatchedUsage", back_populates="work")

    def __repr__(self) -> str:
        return f"<Work(id={self.id}, title={self.title})>"


class Deal(Base):
    """Deal model (read-only in royalties service)."""

    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
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

    # Scope
    territories: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), default=["WORLD"])

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    songwriter: Mapped["Songwriter"] = relationship("Songwriter", back_populates="deals", lazy="selectin")
    deal_works: Mapped[list["DealWork"]] = relationship("DealWork", back_populates="deal", lazy="selectin")
    line_items: Mapped[list["RoyaltyLineItem"]] = relationship("RoyaltyLineItem", back_populates="deal")

    def __repr__(self) -> str:
        return f"<Deal(id={self.id}, deal_number={self.deal_number})>"


class DealWork(Base):
    """Association between deals and works (read-only)."""

    __tablename__ = "deal_works"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
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

    # Relationships
    deal: Mapped["Deal"] = relationship("Deal", back_populates="deal_works")
    work: Mapped["Work"] = relationship("Work", back_populates="deal_works", lazy="selectin")


class UsageEvent(Base):
    """Usage event model (read-only)."""

    __tablename__ = "usage_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    reported_title: Mapped[str] = mapped_column(String(500), nullable=False)
    reported_artist: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    usage_type: Mapped[str] = mapped_column(String(50), nullable=False)
    play_count: Mapped[int] = mapped_column(BigInteger, default=1)
    revenue_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 6), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    territory: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    usage_date: Mapped[date] = mapped_column(Date, nullable=False)
    processing_status: Mapped[str] = mapped_column(String(50), default="pending")

    # Relationships
    matched_usages: Mapped[list["MatchedUsage"]] = relationship("MatchedUsage", back_populates="usage_event")


class MatchedUsage(Base):
    """Matched usage model (read-only)."""

    __tablename__ = "matched_usage"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
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
    match_confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.0"))
    is_confirmed: Mapped[bool] = mapped_column(default=True)
    matched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    usage_event: Mapped["UsageEvent"] = relationship("UsageEvent", back_populates="matched_usages", lazy="selectin")
    work: Mapped["Work"] = relationship("Work", back_populates="matched_usages", lazy="selectin")


class RoyaltyPeriod(Base):
    """Royalty period for calculating royalties."""

    __tablename__ = "royalty_periods"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    period_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)  # monthly, quarterly, annual
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open")  # open, calculating, calculated, approved, paid

    # Calculation tracking
    calculation_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    calculation_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Approval
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    statements: Mapped[list["RoyaltyStatement"]] = relationship(
        "RoyaltyStatement", back_populates="period", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<RoyaltyPeriod(id={self.id}, period_code={self.period_code}, status={self.status})>"


class RoyaltyStatement(Base):
    """Royalty statement for a songwriter for a period."""

    __tablename__ = "royalty_statements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("royalty_periods.id"),
        nullable=False,
        index=True,
    )
    songwriter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("songwriters.id"),
        nullable=False,
        index=True,
    )

    # Summary Amounts
    gross_royalties: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    publisher_share: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    writer_share: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))

    # Deductions
    advance_recoupment: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    withholding_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    other_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))

    # Net Payable
    net_payable: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))

    # Status
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, calculated, approved, sent, paid

    # Payment Info
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Document
    statement_pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    period: Mapped["RoyaltyPeriod"] = relationship("RoyaltyPeriod", back_populates="statements")
    songwriter: Mapped["Songwriter"] = relationship("Songwriter", back_populates="statements", lazy="selectin")
    line_items: Mapped[list["RoyaltyLineItem"]] = relationship(
        "RoyaltyLineItem", back_populates="statement", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<RoyaltyStatement(id={self.id}, period_id={self.period_id}, songwriter_id={self.songwriter_id})>"


class RoyaltyLineItem(Base):
    """Detailed royalty line item for a statement."""

    __tablename__ = "royalty_line_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    statement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("royalty_statements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    deal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.id"),
        nullable=False,
        index=True,
    )
    work_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("works.id"),
        nullable=False,
        index=True,
    )

    # Source Breakdown
    usage_type: Mapped[str] = mapped_column(String(50), nullable=False)
    territory: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Amounts
    usage_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    gross_revenue: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False, default=Decimal("0"))
    publisher_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    calculated_royalty: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False, default=Decimal("0"))

    # Audit
    calculation_details: Mapped[dict] = mapped_column(JSONB, default=dict)
    matched_usage_ids: Mapped[Optional[list[uuid.UUID]]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)

    # Relationships
    statement: Mapped["RoyaltyStatement"] = relationship("RoyaltyStatement", back_populates="line_items")
    deal: Mapped["Deal"] = relationship("Deal", back_populates="line_items", lazy="selectin")
    work: Mapped["Work"] = relationship("Work", back_populates="line_items", lazy="selectin")

    def __repr__(self) -> str:
        return f"<RoyaltyLineItem(id={self.id}, work_id={self.work_id}, calculated_royalty={self.calculated_royalty})>"
