from datetime import date
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..schemas import (
    ContractGenerateResponse,
    DealCreate,
    DealListResponse,
    DealResponse,
    DealUpdate,
    DealWithDetails,
    DealWorkCreate,
    DealWorkResponse,
    SongwriterResponse,
)
from ..services.deal_service import DealService

router = APIRouter(prefix="/deals", tags=["deals"])


def get_deal_service(db: AsyncSession = Depends(get_db)) -> DealService:
    """Dependency to get deal service."""
    return DealService(db)


# ============================================
# Deal Endpoints
# ============================================


@router.get("", response_model=DealListResponse)
async def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    deal_type: Optional[str] = Query(None),
    songwriter_id: Optional[UUID] = Query(None),
    effective_date_from: Optional[date] = Query(None),
    effective_date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    service: DealService = Depends(get_deal_service),
) -> DealListResponse:
    """List deals with optional filtering and pagination."""
    deals, total = await service.list_deals(
        skip=skip,
        limit=limit,
        status=status,
        deal_type=deal_type,
        songwriter_id=songwriter_id,
        effective_date_from=effective_date_from,
        effective_date_to=effective_date_to,
        search=search,
    )
    return DealListResponse(items=deals, total=total, skip=skip, limit=limit)


@router.post("", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
async def create_deal(
    deal: DealCreate,
    service: DealService = Depends(get_deal_service),
) -> DealResponse:
    """Create a new deal."""
    # Check for duplicate deal number
    existing = await service.get_deal_by_number(deal.deal_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Deal with number {deal.deal_number} already exists",
        )

    # Verify songwriter exists
    songwriter = await service.get_songwriter(deal.songwriter_id)
    if songwriter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Songwriter with ID {deal.songwriter_id} not found",
        )

    created_deal = await service.create_deal(deal)
    return created_deal


@router.get("/{deal_id}", response_model=DealWithDetails)
async def get_deal(
    deal_id: UUID,
    service: DealService = Depends(get_deal_service),
) -> DealWithDetails:
    """Get a specific deal with all details."""
    deal = await service.get_deal(deal_id)
    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )
    return deal


@router.put("/{deal_id}", response_model=DealResponse)
async def update_deal(
    deal_id: UUID,
    deal_update: DealUpdate,
    service: DealService = Depends(get_deal_service),
) -> DealResponse:
    """Update a deal."""
    existing = await service.get_deal(deal_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    # Check for duplicate deal number if being updated
    if deal_update.deal_number and deal_update.deal_number != existing.deal_number:
        duplicate = await service.get_deal_by_number(deal_update.deal_number)
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Deal with number {deal_update.deal_number} already exists",
            )

    try:
        updated = await service.update_deal(deal_id, deal_update)
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: UUID,
    service: DealService = Depends(get_deal_service),
) -> None:
    """Delete a deal."""
    existing = await service.get_deal(deal_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    await service.delete_deal(deal_id)


@router.post("/{deal_id}/sign", response_model=DealResponse)
async def sign_deal(
    deal_id: UUID,
    service: DealService = Depends(get_deal_service),
) -> DealResponse:
    """Sign a deal, setting status to active."""
    existing = await service.get_deal(deal_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    try:
        signed = await service.sign_deal(deal_id)
        return signed
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ============================================
# Deal Works Endpoints
# ============================================


@router.get("/{deal_id}/works", response_model=list[DealWorkResponse])
async def get_deal_works(
    deal_id: UUID,
    service: DealService = Depends(get_deal_service),
) -> list[DealWorkResponse]:
    """Get all works for a deal."""
    deal = await service.get_deal(deal_id)
    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    works = await service.get_deal_works(deal_id)
    return works


@router.post("/{deal_id}/works", response_model=DealWorkResponse, status_code=status.HTTP_201_CREATED)
async def add_work_to_deal(
    deal_id: UUID,
    work_data: DealWorkCreate,
    service: DealService = Depends(get_deal_service),
) -> DealWorkResponse:
    """Add a work to a deal."""
    deal = await service.get_deal(deal_id)
    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    # Check if work already exists on this deal
    existing = await service.get_deal_work(deal_id, work_data.work_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Work already associated with this deal",
        )

    created = await service.add_work_to_deal(deal_id, work_data)
    return created


@router.delete("/{deal_id}/works/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_work_from_deal(
    deal_id: UUID,
    work_id: UUID,
    service: DealService = Depends(get_deal_service),
) -> None:
    """Remove a work from a deal."""
    existing = await service.get_deal_work(deal_id, work_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found on this deal",
        )

    await service.remove_work_from_deal(deal_id, work_id)


# ============================================
# Contract Generation Endpoints
# ============================================


@router.post("/{deal_id}/generate-contract", response_model=ContractGenerateResponse)
async def generate_contract(
    deal_id: UUID,
    service: DealService = Depends(get_deal_service),
) -> ContractGenerateResponse:
    """Generate a contract for a deal using AI.

    This endpoint calls the AI service to generate a contract
    based on the deal details and templates.
    """
    deal = await service.get_deal(deal_id)
    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    # Call AI service to generate contract
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.ai_service_url}/contracts/generate",
                json={"deal_id": str(deal_id)},
                timeout=30.0,
            )
            response.raise_for_status()
            result = response.json()

            if not result.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=result.get("error", "Contract generation failed"),
                )

            # Parse suggested terms into list
            suggested_terms = []
            if result.get("suggested_terms"):
                # Extract bullet points from the AI response
                for line in result["suggested_terms"].split("\n"):
                    line = line.strip()
                    if line and (line.startswith("-") or line.startswith("•")):
                        suggested_terms.append(line.lstrip("-•").strip())

            return ContractGenerateResponse(
                content=result.get("contract", ""),
                contract_url=None,
                suggested_special_terms=suggested_terms,
            )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is unavailable",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {e.response.text}",
        )


@router.get("/{deal_id}/contract")
async def get_contract(
    deal_id: UUID,
    service: DealService = Depends(get_deal_service),
) -> dict:
    """Get the generated contract for a deal."""
    deal = await service.get_deal(deal_id)
    if deal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    if deal.contract_document_url:
        return {"content": None, "url": deal.contract_document_url}

    return {"content": "No contract generated yet.", "url": None}


# ============================================
# Songwriter Endpoints (for deal creation)
# ============================================


@router.get("/songwriters/", response_model=list[SongwriterResponse])
async def list_songwriters(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    service: DealService = Depends(get_deal_service),
) -> list[SongwriterResponse]:
    """List songwriters for deal creation."""
    songwriters, _ = await service.list_songwriters(skip=skip, limit=limit, search=search)
    return songwriters
