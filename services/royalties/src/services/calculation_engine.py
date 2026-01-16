"""
Royalty Calculation Engine

Core logic for calculating royalties:
1. Query matched usage events for the period date range
2. Group by songwriter (via work_writers -> deals)
3. For each songwriter:
   - Get active deals with royalty rates
   - Calculate gross royalties from usage revenue
   - Apply publisher/writer split from deal terms
   - Calculate advance recoupment (if advance not fully recouped)
   - Apply withholding tax (based on territory)
   - Calculate net payable
4. Create/update royalty_statements and royalty_line_items
"""

import uuid
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import and_, func, select, update
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


class CalculationEngine:
    """Engine for calculating royalties for a period."""

    # Default withholding tax rate (can be territory-specific in production)
    DEFAULT_WITHHOLDING_TAX_RATE = Decimal("0.00")  # 0% default
    US_WITHHOLDING_TAX_RATE = Decimal("0.30")  # 30% for non-US

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_period(self, period_id: uuid.UUID) -> dict:
        """
        Calculate royalties for all songwriters in a period.

        Returns summary of calculation results.
        """
        # Get the period
        period_result = await self.db.execute(
            select(RoyaltyPeriod).where(RoyaltyPeriod.id == period_id)
        )
        period = period_result.scalar_one_or_none()

        if period is None:
            raise ValueError(f"Period {period_id} not found")

        if period.status not in ("open", "calculated"):
            raise ValueError(f"Period {period.period_code} cannot be calculated (status: {period.status})")

        # Update period status to calculating
        period.status = "calculating"
        period.calculation_started_at = datetime.utcnow()
        await self.db.flush()

        try:
            # Clear existing statements and line items for recalculation
            await self._clear_existing_statements(period_id)

            # Get all matched usage for the period
            usage_data = await self._get_matched_usage_for_period(period.start_date, period.end_date)

            # Group usage by songwriter through deals
            songwriter_usage = await self._group_usage_by_songwriter(usage_data)

            # Calculate and create statements for each songwriter
            statements_created = 0
            total_gross = Decimal("0")
            total_net = Decimal("0")

            for songwriter_id, usage_items in songwriter_usage.items():
                statement = await self._create_statement_for_songwriter(
                    period_id=period_id,
                    songwriter_id=songwriter_id,
                    usage_items=usage_items,
                )
                if statement:
                    statements_created += 1
                    total_gross += statement.gross_royalties
                    total_net += statement.net_payable

            # Update period status to calculated
            period.status = "calculated"
            period.calculation_completed_at = datetime.utcnow()
            await self.db.flush()

            return {
                "statements_count": statements_created,
                "total_gross_royalties": total_gross,
                "total_net_payable": total_net,
            }

        except Exception as e:
            # Revert period status on error
            period.status = "open"
            period.calculation_started_at = None
            await self.db.flush()
            raise e

    async def _clear_existing_statements(self, period_id: uuid.UUID) -> None:
        """Clear existing statements for a period (for recalculation)."""
        # Get existing statements
        result = await self.db.execute(
            select(RoyaltyStatement).where(RoyaltyStatement.period_id == period_id)
        )
        statements = result.scalars().all()

        for statement in statements:
            await self.db.delete(statement)

        await self.db.flush()

    async def _get_matched_usage_for_period(
        self, start_date, end_date
    ) -> list[tuple[MatchedUsage, UsageEvent]]:
        """Get all matched usage events within the period date range."""
        query = (
            select(MatchedUsage, UsageEvent)
            .join(UsageEvent, MatchedUsage.usage_event_id == UsageEvent.id)
            .where(
                and_(
                    UsageEvent.usage_date >= start_date,
                    UsageEvent.usage_date <= end_date,
                    UsageEvent.processing_status == "matched",
                    MatchedUsage.is_confirmed == True,
                )
            )
            .options(
                selectinload(MatchedUsage.work),
            )
        )

        result = await self.db.execute(query)
        return result.all()

    async def _group_usage_by_songwriter(
        self, usage_data: list[tuple[MatchedUsage, UsageEvent]]
    ) -> dict[uuid.UUID, list[dict]]:
        """
        Group usage items by songwriter through their deals.

        Returns dict mapping songwriter_id to list of usage items with deal info.
        """
        # Get all work IDs from the usage data
        work_ids = list(set(mu.work_id for mu, _ in usage_data))

        if not work_ids:
            return {}

        # Get all deal-work associations for these works with active deals
        deal_works_result = await self.db.execute(
            select(DealWork)
            .join(Deal)
            .where(
                and_(
                    DealWork.work_id.in_(work_ids),
                    DealWork.excluded_at.is_(None),
                    Deal.status == "active",
                )
            )
            .options(
                selectinload(DealWork.deal).selectinload(Deal.songwriter),
                selectinload(DealWork.work),
            )
        )
        deal_works = deal_works_result.scalars().all()

        # Build mapping of work_id -> list of deals
        work_to_deals: dict[uuid.UUID, list[DealWork]] = defaultdict(list)
        for dw in deal_works:
            work_to_deals[dw.work_id].append(dw)

        # Group usage by songwriter
        songwriter_usage: dict[uuid.UUID, list[dict]] = defaultdict(list)

        for matched_usage, usage_event in usage_data:
            work_id = matched_usage.work_id
            deals_for_work = work_to_deals.get(work_id, [])

            for deal_work in deals_for_work:
                deal = deal_work.deal
                songwriter_id = deal.songwriter_id

                songwriter_usage[songwriter_id].append({
                    "matched_usage": matched_usage,
                    "usage_event": usage_event,
                    "deal": deal,
                    "work": deal_work.work,
                })

        return songwriter_usage

    async def _create_statement_for_songwriter(
        self,
        period_id: uuid.UUID,
        songwriter_id: uuid.UUID,
        usage_items: list[dict],
    ) -> Optional[RoyaltyStatement]:
        """Create a royalty statement for a songwriter."""
        if not usage_items:
            return None

        # Get songwriter for potential tax calculations
        songwriter_result = await self.db.execute(
            select(Songwriter).where(Songwriter.id == songwriter_id)
        )
        songwriter = songwriter_result.scalar_one_or_none()

        if songwriter is None:
            return None

        # Group usage by deal, work, usage_type, territory, and source for line items
        line_item_groups: dict[tuple, dict] = defaultdict(lambda: {
            "usage_count": 0,
            "gross_revenue": Decimal("0"),
            "matched_usage_ids": [],
            "deal": None,
            "work": None,
        })

        for item in usage_items:
            usage_event: UsageEvent = item["usage_event"]
            matched_usage: MatchedUsage = item["matched_usage"]
            deal: Deal = item["deal"]
            work: Work = item["work"]

            key = (
                deal.id,
                work.id,
                usage_event.usage_type,
                usage_event.territory or "WORLD",
                usage_event.source,
            )

            group = line_item_groups[key]
            group["usage_count"] += usage_event.play_count
            group["gross_revenue"] += usage_event.revenue_amount or Decimal("0")
            group["matched_usage_ids"].append(matched_usage.id)
            group["deal"] = deal
            group["work"] = work

        # Create statement
        statement = RoyaltyStatement(
            period_id=period_id,
            songwriter_id=songwriter_id,
            gross_royalties=Decimal("0"),
            publisher_share=Decimal("0"),
            writer_share=Decimal("0"),
            advance_recoupment=Decimal("0"),
            withholding_tax=Decimal("0"),
            other_deductions=Decimal("0"),
            net_payable=Decimal("0"),
            status="calculated",
        )
        self.db.add(statement)
        await self.db.flush()

        # Create line items and accumulate totals
        total_gross = Decimal("0")
        total_writer_share = Decimal("0")

        for (deal_id, work_id, usage_type, territory, source), group in line_item_groups.items():
            deal: Deal = group["deal"]

            # Calculate royalty for this line item
            gross_revenue = group["gross_revenue"]
            writer_rate = deal.writer_share / Decimal("100")  # Convert percentage to decimal

            # Writer share of the gross revenue
            calculated_royalty = gross_revenue * writer_rate

            line_item = RoyaltyLineItem(
                statement_id=statement.id,
                deal_id=deal_id,
                work_id=work_id,
                usage_type=usage_type,
                territory=territory,
                source=source,
                usage_count=group["usage_count"],
                gross_revenue=gross_revenue,
                publisher_rate=deal.publisher_share / Decimal("100"),
                calculated_royalty=calculated_royalty,
                calculation_details={
                    "deal_number": deal.deal_number,
                    "writer_share_pct": float(deal.writer_share),
                    "publisher_share_pct": float(deal.publisher_share),
                },
                matched_usage_ids=group["matched_usage_ids"],
            )
            self.db.add(line_item)

            total_gross += gross_revenue
            total_writer_share += calculated_royalty

        # Calculate deductions
        total_publisher_share = total_gross - total_writer_share

        # Advance recoupment: check if songwriter has unrecouped advances
        advance_recoupment = await self._calculate_advance_recoupment(
            songwriter_id, total_writer_share, usage_items
        )

        # Withholding tax (simplified - would be territory-specific in production)
        post_recoupment = total_writer_share - advance_recoupment
        withholding_tax = Decimal("0")  # Default no withholding

        # Calculate net payable
        net_payable = post_recoupment - withholding_tax

        # Update statement totals
        statement.gross_royalties = total_gross
        statement.publisher_share = total_publisher_share
        statement.writer_share = total_writer_share
        statement.advance_recoupment = advance_recoupment
        statement.withholding_tax = withholding_tax
        statement.net_payable = max(net_payable, Decimal("0"))  # Can't be negative

        await self.db.flush()

        return statement

    async def _calculate_advance_recoupment(
        self,
        songwriter_id: uuid.UUID,
        available_for_recoupment: Decimal,
        usage_items: list[dict],
    ) -> Decimal:
        """
        Calculate how much to recoup from advances.

        Returns the amount to deduct from writer share for advance recoupment.
        """
        # Get all active deals for this songwriter with unrecouped advances
        deals_result = await self.db.execute(
            select(Deal).where(
                and_(
                    Deal.songwriter_id == songwriter_id,
                    Deal.status == "active",
                    Deal.advance_amount > Deal.advance_recouped,
                )
            )
        )
        deals_with_advances = deals_result.scalars().all()

        if not deals_with_advances:
            return Decimal("0")

        total_recoupment = Decimal("0")
        remaining_available = available_for_recoupment

        for deal in deals_with_advances:
            if remaining_available <= Decimal("0"):
                break

            unrecouped = deal.advance_amount - deal.advance_recouped
            recoup_amount = min(unrecouped, remaining_available)

            if recoup_amount > Decimal("0"):
                # Update deal's recouped amount
                deal.advance_recouped += recoup_amount
                total_recoupment += recoup_amount
                remaining_available -= recoup_amount

        await self.db.flush()
        return total_recoupment
