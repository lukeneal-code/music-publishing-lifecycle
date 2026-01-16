"""
Royalty Service

Main service for royalty-related operations including:
- Period management (CRUD, calculate, approve)
- Statement queries
- Line item queries
- Songwriter summary and top works
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import (
    Deal,
    DealWork,
    MatchedUsage,
    RoyaltyLineItem,
    RoyaltyPeriod,
    RoyaltyStatement,
    Songwriter,
    UsageEvent,
    Work,
)
from ..schemas import (
    MonthlyEarning,
    RevenueBySource,
    RoyaltyLineItemResponse,
    RoyaltyPeriodCreate,
    RoyaltyPeriodResponse,
    RoyaltyStatementResponse,
    RoyaltySummaryResponse,
    SongwriterResponse,
    TopPerformingWorkResponse,
    WorkResponse,
)
from .calculation_engine import CalculationEngine
from .pdf_service import PDFService


class RoyaltyService:
    """Service for royalty-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.calculation_engine = CalculationEngine(db)
        self.pdf_service = PDFService()

    # ============================================
    # Period Operations
    # ============================================

    async def list_periods(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
    ) -> tuple[list[RoyaltyPeriodResponse], int]:
        """List royalty periods with filtering and pagination."""
        query = select(RoyaltyPeriod).options(selectinload(RoyaltyPeriod.statements))

        if status:
            query = query.where(RoyaltyPeriod.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(RoyaltyPeriod.start_date.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        periods = result.scalars().all()

        # Convert to response models
        responses = []
        for period in periods:
            total_net_payable = sum(s.net_payable for s in period.statements) if period.statements else Decimal("0")
            responses.append(
                RoyaltyPeriodResponse(
                    id=period.id,
                    period_code=period.period_code,
                    period_type=period.period_type,
                    start_date=period.start_date,
                    end_date=period.end_date,
                    status=period.status,
                    calculation_started_at=period.calculation_started_at,
                    calculation_completed_at=period.calculation_completed_at,
                    approved_at=period.approved_at,
                    created_at=period.created_at,
                    statements_count=len(period.statements) if period.statements else 0,
                    total_net_payable=total_net_payable,
                )
            )

        return responses, total

    async def get_period(self, period_id: UUID) -> Optional[RoyaltyPeriodResponse]:
        """Get a period by ID."""
        query = (
            select(RoyaltyPeriod)
            .where(RoyaltyPeriod.id == period_id)
            .options(selectinload(RoyaltyPeriod.statements))
        )
        result = await self.db.execute(query)
        period = result.scalar_one_or_none()

        if period is None:
            return None

        total_net_payable = sum(s.net_payable for s in period.statements) if period.statements else Decimal("0")

        return RoyaltyPeriodResponse(
            id=period.id,
            period_code=period.period_code,
            period_type=period.period_type,
            start_date=period.start_date,
            end_date=period.end_date,
            status=period.status,
            calculation_started_at=period.calculation_started_at,
            calculation_completed_at=period.calculation_completed_at,
            approved_at=period.approved_at,
            created_at=period.created_at,
            statements_count=len(period.statements) if period.statements else 0,
            total_net_payable=total_net_payable,
        )

    async def get_period_by_code(self, period_code: str) -> Optional[RoyaltyPeriod]:
        """Get a period by code."""
        result = await self.db.execute(
            select(RoyaltyPeriod).where(RoyaltyPeriod.period_code == period_code)
        )
        return result.scalar_one_or_none()

    async def create_period(self, period_data: RoyaltyPeriodCreate) -> RoyaltyPeriodResponse:
        """Create a new royalty period."""
        period = RoyaltyPeriod(
            period_code=period_data.period_code,
            period_type=period_data.period_type,
            start_date=period_data.start_date,
            end_date=period_data.end_date,
            status="open",
        )

        self.db.add(period)
        await self.db.flush()
        await self.db.refresh(period)

        return RoyaltyPeriodResponse(
            id=period.id,
            period_code=period.period_code,
            period_type=period.period_type,
            start_date=period.start_date,
            end_date=period.end_date,
            status=period.status,
            calculation_started_at=period.calculation_started_at,
            calculation_completed_at=period.calculation_completed_at,
            approved_at=period.approved_at,
            created_at=period.created_at,
            statements_count=0,
            total_net_payable=Decimal("0"),
        )

    async def calculate_period(self, period_id: UUID) -> dict:
        """Trigger calculation for a period."""
        return await self.calculation_engine.calculate_period(period_id)

    async def approve_period(self, period_id: UUID) -> RoyaltyPeriodResponse:
        """Approve a calculated period."""
        result = await self.db.execute(
            select(RoyaltyPeriod)
            .where(RoyaltyPeriod.id == period_id)
            .options(selectinload(RoyaltyPeriod.statements))
        )
        period = result.scalar_one_or_none()

        if period is None:
            raise ValueError("Period not found")

        if period.status != "calculated":
            raise ValueError(f"Period must be in 'calculated' status to approve (current: {period.status})")

        period.status = "approved"
        period.approved_at = datetime.utcnow()

        # Also update all statements to approved
        for statement in period.statements:
            statement.status = "approved"

        await self.db.flush()

        total_net_payable = sum(s.net_payable for s in period.statements) if period.statements else Decimal("0")

        return RoyaltyPeriodResponse(
            id=period.id,
            period_code=period.period_code,
            period_type=period.period_type,
            start_date=period.start_date,
            end_date=period.end_date,
            status=period.status,
            calculation_started_at=period.calculation_started_at,
            calculation_completed_at=period.calculation_completed_at,
            approved_at=period.approved_at,
            created_at=period.created_at,
            statements_count=len(period.statements) if period.statements else 0,
            total_net_payable=total_net_payable,
        )

    # ============================================
    # Statement Operations
    # ============================================

    async def list_statements(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        songwriter_id: Optional[UUID] = None,
        period_id: Optional[UUID] = None,
    ) -> tuple[list[RoyaltyStatementResponse], int]:
        """List royalty statements with filtering and pagination."""
        query = select(RoyaltyStatement).options(
            selectinload(RoyaltyStatement.period),
            selectinload(RoyaltyStatement.songwriter),
            selectinload(RoyaltyStatement.line_items),
        )

        if status:
            query = query.where(RoyaltyStatement.status == status)
        if songwriter_id:
            query = query.where(RoyaltyStatement.songwriter_id == songwriter_id)
        if period_id:
            query = query.where(RoyaltyStatement.period_id == period_id)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(RoyaltyStatement.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        statements = result.scalars().all()

        return [self._statement_to_response(s) for s in statements], total

    async def get_statement(self, statement_id: UUID) -> Optional[RoyaltyStatementResponse]:
        """Get a statement by ID."""
        query = (
            select(RoyaltyStatement)
            .where(RoyaltyStatement.id == statement_id)
            .options(
                selectinload(RoyaltyStatement.period),
                selectinload(RoyaltyStatement.songwriter),
                selectinload(RoyaltyStatement.line_items).selectinload(RoyaltyLineItem.work),
            )
        )
        result = await self.db.execute(query)
        statement = result.scalar_one_or_none()

        if statement is None:
            return None

        return self._statement_to_response(statement)

    async def get_statement_line_items(self, statement_id: UUID) -> list[RoyaltyLineItemResponse]:
        """Get all line items for a statement."""
        query = (
            select(RoyaltyLineItem)
            .where(RoyaltyLineItem.statement_id == statement_id)
            .options(selectinload(RoyaltyLineItem.work))
            .order_by(RoyaltyLineItem.calculated_royalty.desc())
        )
        result = await self.db.execute(query)
        line_items = result.scalars().all()

        return [self._line_item_to_response(li) for li in line_items]

    async def generate_statement_pdf(self, statement_id: UUID) -> Optional[bytes]:
        """Generate PDF for a statement."""
        statement = await self.get_statement(statement_id)
        if statement is None:
            return None

        line_items = await self.get_statement_line_items(statement_id)
        return self.pdf_service.generate_statement_pdf(statement, line_items)

    # ============================================
    # Songwriter Operations
    # ============================================

    async def list_songwriters(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
    ) -> tuple[list[SongwriterResponse], int]:
        """List songwriters with filtering and pagination."""
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
        result = await self.db.execute(
            select(Songwriter).where(Songwriter.id == songwriter_id)
        )
        songwriter = result.scalar_one_or_none()

        if songwriter is None:
            return None

        return SongwriterResponse.model_validate(songwriter)

    async def get_songwriter_royalties(
        self,
        songwriter_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[RoyaltyStatementResponse], int]:
        """Get royalty statements for a songwriter."""
        return await self.list_statements(
            skip=skip,
            limit=limit,
            songwriter_id=songwriter_id,
        )

    async def get_songwriter_summary(self, songwriter_id: UUID) -> RoyaltySummaryResponse:
        """Get royalty summary for a songwriter."""
        current_year = datetime.utcnow().year
        current_quarter = (datetime.utcnow().month - 1) // 3 + 1

        # Get all statements for this songwriter
        statements_result = await self.db.execute(
            select(RoyaltyStatement)
            .join(RoyaltyPeriod)
            .where(RoyaltyStatement.songwriter_id == songwriter_id)
            .options(selectinload(RoyaltyStatement.period))
        )
        all_statements = statements_result.scalars().all()

        # Calculate current quarter earnings
        current_quarter_earnings = Decimal("0")
        prev_quarter_earnings = Decimal("0")

        for statement in all_statements:
            period = statement.period
            if period:
                period_year = period.start_date.year
                period_quarter = (period.start_date.month - 1) // 3 + 1

                if period_year == current_year and period_quarter == current_quarter:
                    current_quarter_earnings += statement.net_payable
                elif (period_year == current_year and period_quarter == current_quarter - 1) or \
                     (current_quarter == 1 and period_year == current_year - 1 and period_quarter == 4):
                    prev_quarter_earnings += statement.net_payable

        # Calculate YTD earnings
        ytd_earnings = sum(
            s.net_payable for s in all_statements
            if s.period and s.period.start_date.year == current_year
        )

        # Calculate quarter change
        quarter_change = None
        if prev_quarter_earnings > 0:
            quarter_change = ((current_quarter_earnings - prev_quarter_earnings) / prev_quarter_earnings) * 100

        # Get active works count
        works_result = await self.db.execute(
            select(func.count(func.distinct(DealWork.work_id)))
            .join(Deal, DealWork.deal_id == Deal.id)
            .where(
                and_(
                    Deal.songwriter_id == songwriter_id,
                    Deal.status == "active",
                    DealWork.excluded_at.is_(None),
                )
            )
        )
        active_works_count = works_result.scalar() or 0

        # Get pending payout (approved but not paid statements)
        pending_payout = sum(
            s.net_payable for s in all_statements
            if s.status == "approved"
        )

        # Monthly earnings for the last 12 months
        monthly_earnings = []
        today = datetime.utcnow()
        for i in range(11, -1, -1):
            month = today.month - i
            year = today.year
            while month <= 0:
                month += 12
                year -= 1

            month_total = Decimal("0")
            for statement in all_statements:
                if statement.period:
                    if statement.period.start_date.year == year and statement.period.start_date.month == month:
                        month_total += statement.net_payable

            monthly_earnings.append(MonthlyEarning(
                month=f"{year}-{month:02d}",
                amount=month_total,
            ))

        # Revenue by source - aggregate from line items
        source_totals = {}
        for statement in all_statements:
            line_items_result = await self.db.execute(
                select(RoyaltyLineItem)
                .where(RoyaltyLineItem.statement_id == statement.id)
            )
            line_items = line_items_result.scalars().all()
            for item in line_items:
                source = item.source or "Unknown"
                if source not in source_totals:
                    source_totals[source] = Decimal("0")
                source_totals[source] += item.calculated_royalty

        total_from_sources = sum(source_totals.values()) or Decimal("1")  # Avoid division by zero
        revenue_by_source = [
            RevenueBySource(
                source=source,
                amount=amount,
                percentage=(amount / total_from_sources) * 100,
            )
            for source, amount in sorted(source_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        # Next payment date (simplified - would be configurable in production)
        next_payment_date = None
        if pending_payout > 0:
            # Assume payment on the 15th of next month
            next_month = today.month + 1
            next_year = today.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            next_payment_date = date(next_year, next_month, 15)

        return RoyaltySummaryResponse(
            current_quarter_earnings=current_quarter_earnings,
            quarter_change=quarter_change,
            ytd_earnings=ytd_earnings,
            active_works_count=active_works_count,
            pending_payout=pending_payout,
            next_payment_date=next_payment_date,
            monthly_earnings=monthly_earnings,
            revenue_by_source=revenue_by_source,
        )

    async def get_top_performing_works(
        self,
        songwriter_id: UUID,
        limit: int = 10,
    ) -> list[TopPerformingWorkResponse]:
        """Get top performing works for a songwriter by total royalties."""
        # Get works through deals
        works_result = await self.db.execute(
            select(Work, func.sum(RoyaltyLineItem.usage_count).label("total_plays"),
                   func.sum(RoyaltyLineItem.calculated_royalty).label("total_royalties"))
            .join(RoyaltyLineItem, RoyaltyLineItem.work_id == Work.id)
            .join(RoyaltyStatement, RoyaltyLineItem.statement_id == RoyaltyStatement.id)
            .where(RoyaltyStatement.songwriter_id == songwriter_id)
            .group_by(Work.id)
            .order_by(func.sum(RoyaltyLineItem.calculated_royalty).desc())
            .limit(limit)
        )

        results = works_result.all()

        return [
            TopPerformingWorkResponse(
                id=work.id,
                title=work.title,
                iswc=work.iswc,
                genre=work.genre,
                total_plays=total_plays or 0,
                total_royalties=total_royalties or Decimal("0"),
            )
            for work, total_plays, total_royalties in results
        ]

    # ============================================
    # Helper Methods
    # ============================================

    def _statement_to_response(self, statement: RoyaltyStatement) -> RoyaltyStatementResponse:
        """Convert a statement model to response schema."""
        period_response = None
        if statement.period:
            period_response = RoyaltyPeriodResponse(
                id=statement.period.id,
                period_code=statement.period.period_code,
                period_type=statement.period.period_type,
                start_date=statement.period.start_date,
                end_date=statement.period.end_date,
                status=statement.period.status,
                calculation_started_at=statement.period.calculation_started_at,
                calculation_completed_at=statement.period.calculation_completed_at,
                approved_at=statement.period.approved_at,
                created_at=statement.period.created_at,
                statements_count=0,
                total_net_payable=Decimal("0"),
            )

        songwriter_response = None
        if statement.songwriter:
            songwriter_response = SongwriterResponse.model_validate(statement.songwriter)

        return RoyaltyStatementResponse(
            id=statement.id,
            period_id=statement.period_id,
            songwriter_id=statement.songwriter_id,
            gross_royalties=statement.gross_royalties,
            publisher_share=statement.publisher_share,
            writer_share=statement.writer_share,
            advance_recoupment=statement.advance_recoupment,
            withholding_tax=statement.withholding_tax,
            other_deductions=statement.other_deductions,
            net_payable=statement.net_payable,
            status=statement.status,
            payment_date=statement.payment_date,
            payment_reference=statement.payment_reference,
            statement_pdf_url=statement.statement_pdf_url,
            created_at=statement.created_at,
            updated_at=statement.updated_at,
            period=period_response,
            songwriter=songwriter_response,
            line_items_count=len(statement.line_items) if statement.line_items else 0,
        )

    def _line_item_to_response(self, line_item: RoyaltyLineItem) -> RoyaltyLineItemResponse:
        """Convert a line item model to response schema."""
        work_response = None
        if line_item.work:
            work_response = WorkResponse.model_validate(line_item.work)

        return RoyaltyLineItemResponse(
            id=line_item.id,
            statement_id=line_item.statement_id,
            deal_id=line_item.deal_id,
            work_id=line_item.work_id,
            usage_type=line_item.usage_type,
            territory=line_item.territory,
            source=line_item.source,
            usage_count=line_item.usage_count,
            gross_revenue=line_item.gross_revenue,
            publisher_rate=line_item.publisher_rate,
            calculated_royalty=line_item.calculated_royalty,
            work=work_response,
        )
