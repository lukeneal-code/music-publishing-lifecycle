from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import (
    SimilarSearchRequest,
    WorkCreate,
    WorkListResponse,
    WorkResponse,
    WorkUpdate,
    WorkWithDetails,
    WorkWriterCreate,
    WorkWriterResponse,
)
from ..services.embedding_service import EmbeddingService
from ..services.work_service import WorkService

router = APIRouter(prefix="/works", tags=["works"])


def get_work_service(db: AsyncSession = Depends(get_db)) -> WorkService:
    """Dependency to get work service."""
    return WorkService(db)


def get_embedding_service() -> EmbeddingService:
    """Dependency to get embedding service."""
    return EmbeddingService()


@router.get("", response_model=WorkListResponse)
async def list_works(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    service: WorkService = Depends(get_work_service),
) -> WorkListResponse:
    """List works with optional filtering and pagination."""
    works, total = await service.list_works(
        skip=skip,
        limit=limit,
        status=status,
        search=search,
        genre=genre,
    )
    return WorkListResponse(items=works, total=total, skip=skip, limit=limit)


@router.post("", response_model=WorkResponse, status_code=status.HTTP_201_CREATED)
async def create_work(
    work: WorkCreate,
    service: WorkService = Depends(get_work_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> WorkResponse:
    """Create a new work."""
    # Check for duplicate ISWC
    if work.iswc:
        existing = await service.get_work_by_iswc(work.iswc)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Work with ISWC {work.iswc} already exists",
            )

    # Generate embedding for the title
    title_embedding = None
    try:
        title_embedding = await embedding_service.generate_embedding(work.title)
    except Exception:
        # Continue without embedding if it fails
        pass

    created_work = await service.create_work(work, title_embedding=title_embedding)
    return created_work


@router.get("/search", response_model=WorkListResponse)
async def search_works(
    q: str = Query(..., min_length=1, max_length=500),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: WorkService = Depends(get_work_service),
) -> WorkListResponse:
    """Full-text search for works."""
    works, total = await service.search_works(query=q, skip=skip, limit=limit)
    return WorkListResponse(items=works, total=total, skip=skip, limit=limit)


@router.post("/search/similar", response_model=list[WorkResponse])
async def search_similar_works(
    request: SimilarSearchRequest,
    service: WorkService = Depends(get_work_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> list[WorkResponse]:
    """Vector similarity search for works."""
    # Generate embedding for the query
    try:
        query_embedding = await embedding_service.generate_embedding(request.query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Embedding service unavailable: {str(e)}",
        )

    works = await service.search_similar(
        query_embedding=query_embedding,
        limit=request.limit,
        threshold=request.threshold,
    )
    return works


@router.get("/{work_id}", response_model=WorkWithDetails)
async def get_work(
    work_id: UUID,
    service: WorkService = Depends(get_work_service),
) -> WorkWithDetails:
    """Get a specific work with all details."""
    work = await service.get_work(work_id)
    if work is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found",
        )
    return work


@router.put("/{work_id}", response_model=WorkResponse)
async def update_work(
    work_id: UUID,
    work_update: WorkUpdate,
    service: WorkService = Depends(get_work_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> WorkResponse:
    """Update a work."""
    existing = await service.get_work(work_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found",
        )

    # Check for duplicate ISWC if being updated
    if work_update.iswc and work_update.iswc != existing.iswc:
        duplicate = await service.get_work_by_iswc(work_update.iswc)
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Work with ISWC {work_update.iswc} already exists",
            )

    # Regenerate embedding if title changed
    title_embedding = None
    if work_update.title and work_update.title != existing.title:
        try:
            title_embedding = await embedding_service.generate_embedding(work_update.title)
        except Exception:
            pass

    updated = await service.update_work(work_id, work_update, title_embedding=title_embedding)
    return updated


@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work(
    work_id: UUID,
    service: WorkService = Depends(get_work_service),
) -> None:
    """Delete a work."""
    existing = await service.get_work(work_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found",
        )

    await service.delete_work(work_id)


# ============================================
# Work Writers Endpoints
# ============================================


@router.get("/{work_id}/writers", response_model=list[WorkWriterResponse])
async def get_work_writers(
    work_id: UUID,
    service: WorkService = Depends(get_work_service),
) -> list[WorkWriterResponse]:
    """Get all writers for a work."""
    work = await service.get_work(work_id)
    if work is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found",
        )

    writers = await service.get_work_writers(work_id)
    return writers


@router.post("/{work_id}/writers", response_model=WorkWriterResponse, status_code=status.HTTP_201_CREATED)
async def add_work_writer(
    work_id: UUID,
    writer: WorkWriterCreate,
    service: WorkService = Depends(get_work_service),
) -> WorkWriterResponse:
    """Add a writer to a work."""
    work = await service.get_work(work_id)
    if work is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found",
        )

    # Check if writer already exists on this work
    existing = await service.get_work_writer(work_id, writer.songwriter_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Writer already associated with this work",
        )

    created = await service.add_work_writer(work_id, writer)
    return created


@router.delete("/{work_id}/writers/{songwriter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_work_writer(
    work_id: UUID,
    songwriter_id: UUID,
    service: WorkService = Depends(get_work_service),
) -> None:
    """Remove a writer from a work."""
    existing = await service.get_work_writer(work_id, songwriter_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writer not found on this work",
        )

    await service.remove_work_writer(work_id, songwriter_id)
