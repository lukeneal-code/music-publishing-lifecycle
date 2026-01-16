from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# Type Literals
# ============================================

PeriodType = Literal["monthly", "quarterly", "annual"]
PeriodStatus = Literal["open", "calculating", "calculated", "approved", "paid"]
StatementStatus = Literal["draft", "calculated", "approved", "sent", "paid"]
UsageType = Literal["stream", "download", "radio_play", "tv_broadcast", "public_performance", "sync", "mechanical"]


# ============================================
# Songwriter Schemas (read-only)
# ============================================


class SongwriterResponse(BaseModel):
    """Response schema for songwriter."""

    id: UUID
    legal_name: str
    stage_name: Optional[str] = None
    ipi_number: Optional[str] = None
    pro_affiliation: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# Work Schemas (read-only)
# ============================================


class WorkResponse(BaseModel):
    """Response schema for work."""

    id: UUID
    title: str
    iswc: Optional[str] = None
    genre: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


# ============================================
# Royalty Period Schemas
# ============================================


class RoyaltyPeriodCreate(BaseModel):
    """Request schema for creating a royalty period."""

    period_code: str = Field(..., max_length=20)
    period_type: PeriodType
    start_date: date
    end_date: date


class RoyaltyPeriodResponse(BaseModel):
    """Response schema for royalty period."""

    id: UUID
    period_code: str
    period_type: str
    start_date: date
    end_date: date
    status: str
    calculation_started_at: Optional[datetime] = None
    calculation_completed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    statements_count: int = 0
    total_net_payable: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class RoyaltyPeriodListResponse(BaseModel):
    """Response schema for paginated list of royalty periods."""

    items: list[RoyaltyPeriodResponse]
    total: int
    skip: int
    limit: int


# ============================================
# Royalty Statement Schemas
# ============================================


class RoyaltyStatementResponse(BaseModel):
    """Response schema for royalty statement."""

    id: UUID
    period_id: UUID
    songwriter_id: UUID
    gross_royalties: Decimal
    publisher_share: Decimal
    writer_share: Decimal
    advance_recoupment: Decimal
    withholding_tax: Decimal
    other_deductions: Decimal
    net_payable: Decimal
    status: str
    payment_date: Optional[date] = None
    payment_reference: Optional[str] = None
    statement_pdf_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    period: Optional[RoyaltyPeriodResponse] = None
    songwriter: Optional[SongwriterResponse] = None
    line_items_count: int = 0

    class Config:
        from_attributes = True


class RoyaltyStatementListResponse(BaseModel):
    """Response schema for paginated list of royalty statements."""

    items: list[RoyaltyStatementResponse]
    total: int
    skip: int
    limit: int


# ============================================
# Royalty Line Item Schemas
# ============================================


class RoyaltyLineItemResponse(BaseModel):
    """Response schema for royalty line item."""

    id: UUID
    statement_id: UUID
    deal_id: UUID
    work_id: UUID
    usage_type: str
    territory: Optional[str] = None
    source: Optional[str] = None
    usage_count: int
    gross_revenue: Decimal
    publisher_rate: Decimal
    calculated_royalty: Decimal
    work: Optional[WorkResponse] = None

    class Config:
        from_attributes = True


# ============================================
# Calculation Schemas
# ============================================


class CalculationResponse(BaseModel):
    """Response schema for calculation trigger."""

    message: str
    statements_count: int
    total_gross_royalties: Decimal
    total_net_payable: Decimal


# ============================================
# Summary Schemas
# ============================================


class MonthlyEarning(BaseModel):
    """Monthly earning data point."""

    month: str
    amount: Decimal


class RevenueBySource(BaseModel):
    """Revenue breakdown by source."""

    source: str
    amount: Decimal
    percentage: Decimal


class RoyaltySummaryResponse(BaseModel):
    """Response schema for songwriter royalty summary."""

    current_quarter_earnings: Decimal
    quarter_change: Optional[Decimal] = None
    ytd_earnings: Decimal
    active_works_count: int
    pending_payout: Decimal
    next_payment_date: Optional[date] = None
    monthly_earnings: list[MonthlyEarning]
    revenue_by_source: list[RevenueBySource]


class TopPerformingWorkResponse(BaseModel):
    """Response schema for top performing work."""

    id: UUID
    title: str
    iswc: Optional[str] = None
    genre: Optional[str] = None
    total_plays: int
    total_royalties: Decimal

    class Config:
        from_attributes = True
