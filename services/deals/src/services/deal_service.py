from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import Deal, DealWork, Songwriter, Work
from ..schemas import (
    DealCreate,
    DealResponse,
    DealUpdate,
    DealWithDetails,
    DealWorkCreate,
    DealWorkResponse,
    SongwriterResponse,
)


class DealService:
    """Service for deal-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_deals(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        deal_type: Optional[str] = None,
        songwriter_id: Optional[UUID] = None,
        effective_date_from: Optional[date] = None,
        effective_date_to: Optional[date] = None,
        search: Optional[str] = None,
    ) -> tuple[list[DealResponse], int]:
        """List deals with filtering and pagination."""
        # Build query
        query = select(Deal).options(selectinload(Deal.songwriter), selectinload(Deal.deal_works))

        # Apply filters
        if status:
            query = query.where(Deal.status == status)
        if deal_type:
            query = query.where(Deal.deal_type == deal_type)
        if songwriter_id:
            query = query.where(Deal.songwriter_id == songwriter_id)
        if effective_date_from:
            query = query.where(Deal.effective_date >= effective_date_from)
        if effective_date_to:
            query = query.where(Deal.effective_date <= effective_date_to)
        if search:
            query = query.where(Deal.deal_number.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Deal.created_at.desc()).offset(skip).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        deals = result.scalars().all()

        # Convert to response models with counts
        deal_responses = []
        for deal in deals:
            response = DealResponse(
                id=deal.id,
                deal_number=deal.deal_number,
                songwriter_id=deal.songwriter_id,
                deal_type=deal.deal_type,
                status=deal.status,
                advance_amount=deal.advance_amount,
                advance_recouped=deal.advance_recouped,
                publisher_share=deal.publisher_share,
                writer_share=deal.writer_share,
                effective_date=deal.effective_date,
                expiration_date=deal.expiration_date,
                term_months=deal.term_months,
                retention_period_months=deal.retention_period_months,
                territories=deal.territories or [],
                rights_granted=deal.rights_granted or [],
                excluded_rights=deal.excluded_rights,
                contract_document_url=deal.contract_document_url,
                special_terms=deal.special_terms or {},
                signed_at=deal.signed_at,
                created_at=deal.created_at,
                updated_at=deal.updated_at,
                songwriter=SongwriterResponse.model_validate(deal.songwriter) if deal.songwriter else None,
                works_count=len(deal.deal_works) if deal.deal_works else 0,
            )
            deal_responses.append(response)

        return deal_responses, total

    async def get_deal(self, deal_id: UUID) -> Optional[DealWithDetails]:
        """Get a deal by ID with all details."""
        query = (
            select(Deal)
            .where(Deal.id == deal_id)
            .options(
                selectinload(Deal.songwriter),
                selectinload(Deal.deal_works).selectinload(DealWork.work),
            )
        )
        result = await self.db.execute(query)
        deal = result.scalar_one_or_none()

        if deal is None:
            return None

        return DealWithDetails(
            id=deal.id,
            deal_number=deal.deal_number,
            songwriter_id=deal.songwriter_id,
            deal_type=deal.deal_type,
            status=deal.status,
            advance_amount=deal.advance_amount,
            advance_recouped=deal.advance_recouped,
            publisher_share=deal.publisher_share,
            writer_share=deal.writer_share,
            effective_date=deal.effective_date,
            expiration_date=deal.expiration_date,
            term_months=deal.term_months,
            retention_period_months=deal.retention_period_months,
            territories=deal.territories or [],
            rights_granted=deal.rights_granted or [],
            excluded_rights=deal.excluded_rights,
            contract_document_url=deal.contract_document_url,
            special_terms=deal.special_terms or {},
            signed_at=deal.signed_at,
            created_at=deal.created_at,
            updated_at=deal.updated_at,
            songwriter=SongwriterResponse.model_validate(deal.songwriter) if deal.songwriter else None,
            works_count=len(deal.deal_works),
            works=[DealWorkResponse.model_validate(dw) for dw in deal.deal_works],
        )

    async def get_deal_by_number(self, deal_number: str) -> Optional[Deal]:
        """Get a deal by deal number."""
        result = await self.db.execute(select(Deal).where(Deal.deal_number == deal_number))
        return result.scalar_one_or_none()

    async def create_deal(self, deal_data: DealCreate) -> DealResponse:
        """Create a new deal."""
        deal = Deal(
            deal_number=deal_data.deal_number,
            songwriter_id=deal_data.songwriter_id,
            deal_type=deal_data.deal_type,
            advance_amount=deal_data.advance_amount,
            publisher_share=deal_data.publisher_share,
            writer_share=deal_data.writer_share,
            effective_date=deal_data.effective_date,
            expiration_date=deal_data.expiration_date,
            term_months=deal_data.term_months,
            retention_period_months=deal_data.retention_period_months,
            territories=deal_data.territories or ["WORLD"],
            rights_granted=deal_data.rights_granted or ["ALL"],
            excluded_rights=deal_data.excluded_rights,
            special_terms=deal_data.special_terms or {},
        )

        self.db.add(deal)
        await self.db.flush()
        await self.db.refresh(deal)

        return DealResponse(
            id=deal.id,
            deal_number=deal.deal_number,
            songwriter_id=deal.songwriter_id,
            deal_type=deal.deal_type,
            status=deal.status,
            advance_amount=deal.advance_amount,
            advance_recouped=deal.advance_recouped,
            publisher_share=deal.publisher_share,
            writer_share=deal.writer_share,
            effective_date=deal.effective_date,
            expiration_date=deal.expiration_date,
            term_months=deal.term_months,
            retention_period_months=deal.retention_period_months,
            territories=deal.territories or [],
            rights_granted=deal.rights_granted or [],
            excluded_rights=deal.excluded_rights,
            contract_document_url=deal.contract_document_url,
            special_terms=deal.special_terms or {},
            signed_at=deal.signed_at,
            created_at=deal.created_at,
            updated_at=deal.updated_at,
            songwriter=None,
            works_count=0,
        )

    async def update_deal(self, deal_id: UUID, deal_update: DealUpdate) -> DealResponse:
        """Update a deal."""
        result = await self.db.execute(
            select(Deal)
            .where(Deal.id == deal_id)
            .options(selectinload(Deal.songwriter), selectinload(Deal.deal_works))
        )
        deal = result.scalar_one_or_none()

        if deal is None:
            raise ValueError("Deal not found")

        # Update fields
        update_data = deal_update.model_dump(exclude_unset=True)

        # Validate shares if both are being updated
        if "publisher_share" in update_data and "writer_share" in update_data:
            if update_data["publisher_share"] + update_data["writer_share"] != 100:
                raise ValueError("publisher_share + writer_share must equal 100")
        elif "publisher_share" in update_data:
            if update_data["publisher_share"] + deal.writer_share != 100:
                raise ValueError("publisher_share + writer_share must equal 100")
        elif "writer_share" in update_data:
            if deal.publisher_share + update_data["writer_share"] != 100:
                raise ValueError("publisher_share + writer_share must equal 100")

        for field, value in update_data.items():
            setattr(deal, field, value)

        await self.db.flush()
        await self.db.refresh(deal)

        return DealResponse(
            id=deal.id,
            deal_number=deal.deal_number,
            songwriter_id=deal.songwriter_id,
            deal_type=deal.deal_type,
            status=deal.status,
            advance_amount=deal.advance_amount,
            advance_recouped=deal.advance_recouped,
            publisher_share=deal.publisher_share,
            writer_share=deal.writer_share,
            effective_date=deal.effective_date,
            expiration_date=deal.expiration_date,
            term_months=deal.term_months,
            retention_period_months=deal.retention_period_months,
            territories=deal.territories or [],
            rights_granted=deal.rights_granted or [],
            excluded_rights=deal.excluded_rights,
            contract_document_url=deal.contract_document_url,
            special_terms=deal.special_terms or {},
            signed_at=deal.signed_at,
            created_at=deal.created_at,
            updated_at=deal.updated_at,
            songwriter=SongwriterResponse.model_validate(deal.songwriter) if deal.songwriter else None,
            works_count=len(deal.deal_works) if deal.deal_works else 0,
        )

    async def delete_deal(self, deal_id: UUID) -> None:
        """Delete a deal."""
        await self.db.execute(delete(Deal).where(Deal.id == deal_id))
        await self.db.flush()

    async def sign_deal(self, deal_id: UUID) -> DealResponse:
        """Sign a deal, setting status to active and recording signed_at timestamp."""
        result = await self.db.execute(
            select(Deal)
            .where(Deal.id == deal_id)
            .options(selectinload(Deal.songwriter), selectinload(Deal.deal_works))
        )
        deal = result.scalar_one_or_none()

        if deal is None:
            raise ValueError("Deal not found")

        if deal.status not in ["draft", "pending_signature"]:
            raise ValueError(f"Cannot sign deal with status '{deal.status}'")

        deal.status = "active"
        deal.signed_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(deal)

        return DealResponse(
            id=deal.id,
            deal_number=deal.deal_number,
            songwriter_id=deal.songwriter_id,
            deal_type=deal.deal_type,
            status=deal.status,
            advance_amount=deal.advance_amount,
            advance_recouped=deal.advance_recouped,
            publisher_share=deal.publisher_share,
            writer_share=deal.writer_share,
            effective_date=deal.effective_date,
            expiration_date=deal.expiration_date,
            term_months=deal.term_months,
            retention_period_months=deal.retention_period_months,
            territories=deal.territories or [],
            rights_granted=deal.rights_granted or [],
            excluded_rights=deal.excluded_rights,
            contract_document_url=deal.contract_document_url,
            special_terms=deal.special_terms or {},
            signed_at=deal.signed_at,
            created_at=deal.created_at,
            updated_at=deal.updated_at,
            songwriter=SongwriterResponse.model_validate(deal.songwriter) if deal.songwriter else None,
            works_count=len(deal.deal_works) if deal.deal_works else 0,
        )

    # ============================================
    # Deal Works
    # ============================================

    async def get_deal_works(self, deal_id: UUID) -> list[DealWorkResponse]:
        """Get all works for a deal."""
        query = (
            select(DealWork)
            .where(DealWork.deal_id == deal_id)
            .options(selectinload(DealWork.work))
        )
        result = await self.db.execute(query)
        deal_works = result.scalars().all()
        return [DealWorkResponse.model_validate(dw) for dw in deal_works]

    async def get_deal_work(self, deal_id: UUID, work_id: UUID) -> Optional[DealWork]:
        """Get a specific deal-work association."""
        result = await self.db.execute(
            select(DealWork).where(
                DealWork.deal_id == deal_id,
                DealWork.work_id == work_id,
            )
        )
        return result.scalar_one_or_none()

    async def add_work_to_deal(self, deal_id: UUID, work_data: DealWorkCreate) -> DealWorkResponse:
        """Add a work to a deal."""
        deal_work = DealWork(
            deal_id=deal_id,
            work_id=work_data.work_id,
            notes=work_data.notes,
        )

        self.db.add(deal_work)
        await self.db.flush()

        # Fetch with work details
        query = (
            select(DealWork)
            .where(DealWork.id == deal_work.id)
            .options(selectinload(DealWork.work))
        )
        result = await self.db.execute(query)
        deal_work = result.scalar_one()

        return DealWorkResponse.model_validate(deal_work)

    async def remove_work_from_deal(self, deal_id: UUID, work_id: UUID) -> None:
        """Remove a work from a deal."""
        await self.db.execute(
            delete(DealWork).where(
                DealWork.deal_id == deal_id,
                DealWork.work_id == work_id,
            )
        )
        await self.db.flush()

    # ============================================
    # Songwriters (read-only)
    # ============================================

    async def list_songwriters(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
    ) -> tuple[list[SongwriterResponse], int]:
        """List songwriters for deal creation."""
        query = select(Songwriter)

        if search:
            query = query.where(
                Songwriter.legal_name.ilike(f"%{search}%")
                | Songwriter.stage_name.ilike(f"%{search}%")
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        query = query.order_by(Songwriter.legal_name).offset(skip).limit(limit)

        result = await self.db.execute(query)
        songwriters = result.scalars().all()

        return [SongwriterResponse.model_validate(s) for s in songwriters], total

    async def get_songwriter(self, songwriter_id: UUID) -> Optional[SongwriterResponse]:
        """Get a songwriter by ID."""
        result = await self.db.execute(select(Songwriter).where(Songwriter.id == songwriter_id))
        songwriter = result.scalar_one_or_none()
        if songwriter is None:
            return None
        return SongwriterResponse.model_validate(songwriter)
