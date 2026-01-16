"""
Royalties API Router

Endpoints for royalty management:
- Period CRUD and calculation
- Statement queries and PDF generation
- Songwriter royalties and summaries
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import (
    CalculationResponse,
    RoyaltyLineItemResponse,
    RoyaltyPeriodCreate,
    RoyaltyPeriodListResponse,
    RoyaltyPeriodResponse,
    RoyaltyStatementListResponse,
    RoyaltyStatementResponse,
    RoyaltySummaryResponse,
    SongwriterResponse,
    TopPerformingWorkResponse,
)
from ..services import RoyaltyService

router = APIRouter(tags=["royalties"])


def get_royalty_service(db: AsyncSession = Depends(get_db)) -> RoyaltyService:
    """Dependency to get royalty service."""
    return RoyaltyService(db)


# ============================================
# Period Endpoints
# ============================================


@router.get("/royalties/periods", response_model=RoyaltyPeriodListResponse)
async def list_periods(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltyPeriodListResponse:
    """List royalty periods with optional filtering and pagination."""
    periods, total = await service.list_periods(skip=skip, limit=limit, status=status)
    return RoyaltyPeriodListResponse(items=periods, total=total, skip=skip, limit=limit)


@router.get("/royalties/periods/{period_id}", response_model=RoyaltyPeriodResponse)
async def get_period(
    period_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltyPeriodResponse:
    """Get a specific royalty period."""
    period = await service.get_period(period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )
    return period


@router.post("/royalties/periods", response_model=RoyaltyPeriodResponse, status_code=status.HTTP_201_CREATED)
async def create_period(
    period_data: RoyaltyPeriodCreate,
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltyPeriodResponse:
    """Create a new royalty period."""
    # Check for duplicate period code
    existing = await service.get_period_by_code(period_data.period_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Period with code {period_data.period_code} already exists",
        )

    # Validate dates
    if period_data.end_date <= period_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    return await service.create_period(period_data)


@router.post("/royalties/periods/{period_id}/calculate", response_model=CalculationResponse)
async def calculate_period(
    period_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> CalculationResponse:
    """Trigger royalty calculation for a period."""
    period = await service.get_period(period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    try:
        result = await service.calculate_period(period_id)
        return CalculationResponse(
            message=f"Calculation completed for period {period.period_code}",
            statements_count=result["statements_count"],
            total_gross_royalties=result["total_gross_royalties"],
            total_net_payable=result["total_net_payable"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/royalties/periods/{period_id}/approve", response_model=RoyaltyPeriodResponse)
async def approve_period(
    period_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltyPeriodResponse:
    """Approve a calculated royalty period."""
    period = await service.get_period(period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Period not found",
        )

    try:
        return await service.approve_period(period_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ============================================
# Statement Endpoints
# ============================================


@router.get("/royalties/statements", response_model=RoyaltyStatementListResponse)
async def list_statements(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    songwriter_id: Optional[UUID] = Query(None),
    period_id: Optional[UUID] = Query(None),
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltyStatementListResponse:
    """List royalty statements with optional filtering and pagination."""
    statements, total = await service.list_statements(
        skip=skip,
        limit=limit,
        status=status,
        songwriter_id=songwriter_id,
        period_id=period_id,
    )
    return RoyaltyStatementListResponse(items=statements, total=total, skip=skip, limit=limit)


@router.get("/royalties/statements/{statement_id}", response_model=RoyaltyStatementResponse)
async def get_statement(
    statement_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltyStatementResponse:
    """Get a specific royalty statement."""
    statement = await service.get_statement(statement_id)
    if statement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement not found",
        )
    return statement


@router.get("/royalties/statements/{statement_id}/pdf")
async def get_statement_pdf(
    statement_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> Response:
    """Download PDF for a royalty statement."""
    statement = await service.get_statement(statement_id)
    if statement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement not found",
        )

    pdf_content = await service.generate_statement_pdf(statement_id)
    if pdf_content is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF",
        )

    # Generate filename
    songwriter_name = statement.songwriter.legal_name if statement.songwriter else "Unknown"
    period_code = statement.period.period_code if statement.period else "Unknown"
    filename = f"royalty_statement_{songwriter_name}_{period_code}.pdf".replace(" ", "_")

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/royalties/statements/{statement_id}/line-items", response_model=list[RoyaltyLineItemResponse])
async def get_statement_line_items(
    statement_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> list[RoyaltyLineItemResponse]:
    """Get line items for a royalty statement."""
    statement = await service.get_statement(statement_id)
    if statement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement not found",
        )

    return await service.get_statement_line_items(statement_id)


# ============================================
# Songwriter Endpoints
# ============================================


@router.get("/songwriters", response_model=list[SongwriterResponse])
async def list_songwriters(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    service: RoyaltyService = Depends(get_royalty_service),
) -> list[SongwriterResponse]:
    """List all songwriters."""
    songwriters, _ = await service.list_songwriters(skip=skip, limit=limit, search=search)
    return songwriters


@router.get("/songwriters/{songwriter_id}", response_model=SongwriterResponse)
async def get_songwriter(
    songwriter_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> SongwriterResponse:
    """Get a specific songwriter."""
    songwriter = await service.get_songwriter(songwriter_id)
    if songwriter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Songwriter not found",
        )
    return songwriter


@router.get("/songwriters/{songwriter_id}/royalties", response_model=RoyaltyStatementListResponse)
async def get_songwriter_royalties(
    songwriter_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltyStatementListResponse:
    """Get royalty statements for a songwriter."""
    # Verify songwriter exists
    songwriter = await service.get_songwriter(songwriter_id)
    if songwriter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Songwriter not found",
        )

    statements, total = await service.get_songwriter_royalties(
        songwriter_id=songwriter_id,
        skip=skip,
        limit=limit,
    )
    return RoyaltyStatementListResponse(items=statements, total=total, skip=skip, limit=limit)


@router.get("/songwriters/{songwriter_id}/royalties/summary", response_model=RoyaltySummaryResponse)
async def get_songwriter_summary(
    songwriter_id: UUID,
    service: RoyaltyService = Depends(get_royalty_service),
) -> RoyaltySummaryResponse:
    """Get royalty summary for a songwriter."""
    # Verify songwriter exists
    songwriter = await service.get_songwriter(songwriter_id)
    if songwriter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Songwriter not found",
        )

    return await service.get_songwriter_summary(songwriter_id)


@router.get("/songwriters/{songwriter_id}/works/top", response_model=list[TopPerformingWorkResponse])
async def get_top_performing_works(
    songwriter_id: UUID,
    limit: int = Query(10, ge=1, le=50),
    service: RoyaltyService = Depends(get_royalty_service),
) -> list[TopPerformingWorkResponse]:
    """Get top performing works for a songwriter."""
    # Verify songwriter exists
    songwriter = await service.get_songwriter(songwriter_id)
    if songwriter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Songwriter not found",
        )

    return await service.get_top_performing_works(songwriter_id, limit=limit)
