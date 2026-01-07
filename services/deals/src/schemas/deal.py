from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ============================================
# Deal Type Literals
# ============================================

DealType = Literal[
    "publishing",
    "co_publishing",
    "administration",
    "sub_publishing",
    "sync_license",
    "mechanical_license",
]

DealStatus = Literal["draft", "pending_signature", "active", "expired", "terminated"]


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
# Work Schemas (read-only in deals service)
# ============================================


class WorkResponse(BaseModel):
    """Response schema for work (simplified for deals)."""

    id: UUID
    title: str
    iswc: Optional[str] = None
    genre: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Deal Work Schemas
# ============================================


class DealWorkCreate(BaseModel):
    """Request schema for adding a work to a deal."""

    work_id: UUID
    notes: Optional[str] = None


class DealWorkResponse(BaseModel):
    """Response schema for deal-work association."""

    id: UUID
    deal_id: UUID
    work_id: UUID
    included_at: datetime
    excluded_at: Optional[datetime] = None
    notes: Optional[str] = None
    work: Optional[WorkResponse] = None

    class Config:
        from_attributes = True


# ============================================
# Deal Schemas
# ============================================


class DealBase(BaseModel):
    """Base schema for deal."""

    deal_number: str = Field(..., max_length=50)
    songwriter_id: UUID
    deal_type: DealType
    advance_amount: Decimal = Field(default=Decimal("0"), ge=0)
    publisher_share: Decimal = Field(..., ge=0, le=100)
    writer_share: Decimal = Field(..., ge=0, le=100)
    effective_date: date
    expiration_date: Optional[date] = None
    term_months: Optional[int] = Field(None, ge=1)
    retention_period_months: Optional[int] = Field(None, ge=0)
    territories: Optional[list[str]] = Field(default=["WORLD"])
    rights_granted: Optional[list[str]] = Field(default=["ALL"])
    excluded_rights: Optional[list[str]] = None
    special_terms: Optional[dict] = Field(default_factory=dict)

    @field_validator("writer_share")
    @classmethod
    def validate_shares(cls, writer_share: Decimal, info) -> Decimal:
        """Validate that publisher_share + writer_share = 100."""
        publisher_share = info.data.get("publisher_share")
        if publisher_share is not None and publisher_share + writer_share != 100:
            raise ValueError("publisher_share + writer_share must equal 100")
        return writer_share


class DealCreate(DealBase):
    """Request schema for creating a deal."""

    pass


class DealUpdate(BaseModel):
    """Request schema for updating a deal."""

    deal_number: Optional[str] = Field(None, max_length=50)
    deal_type: Optional[DealType] = None
    status: Optional[DealStatus] = None
    advance_amount: Optional[Decimal] = Field(None, ge=0)
    advance_recouped: Optional[Decimal] = Field(None, ge=0)
    publisher_share: Optional[Decimal] = Field(None, ge=0, le=100)
    writer_share: Optional[Decimal] = Field(None, ge=0, le=100)
    effective_date: Optional[date] = None
    expiration_date: Optional[date] = None
    term_months: Optional[int] = Field(None, ge=1)
    retention_period_months: Optional[int] = Field(None, ge=0)
    territories: Optional[list[str]] = None
    rights_granted: Optional[list[str]] = None
    excluded_rights: Optional[list[str]] = None
    special_terms: Optional[dict] = None
    contract_document_url: Optional[str] = Field(None, max_length=500)


class DealResponse(BaseModel):
    """Response schema for deal."""

    id: UUID
    deal_number: str
    songwriter_id: UUID
    deal_type: str
    status: str
    advance_amount: Decimal
    advance_recouped: Decimal
    publisher_share: Decimal
    writer_share: Decimal
    effective_date: date
    expiration_date: Optional[date] = None
    term_months: Optional[int] = None
    retention_period_months: Optional[int] = None
    territories: list[str] = []
    rights_granted: list[str] = []
    excluded_rights: Optional[list[str]] = None
    contract_document_url: Optional[str] = None
    special_terms: dict = Field(default_factory=dict)
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    songwriter: Optional[SongwriterResponse] = None
    works_count: int = 0

    class Config:
        from_attributes = True


class DealWithDetails(DealResponse):
    """Response schema for deal with full details."""

    works: list[DealWorkResponse] = []


class DealListResponse(BaseModel):
    """Response schema for paginated list of deals."""

    items: list[DealResponse]
    total: int
    skip: int
    limit: int


# ============================================
# Contract Generation Schemas
# ============================================


class ContractGenerateResponse(BaseModel):
    """Response schema for contract generation."""

    content: str
    contract_url: Optional[str] = None
    suggested_special_terms: list[str] = []
