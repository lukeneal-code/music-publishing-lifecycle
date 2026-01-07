from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import RecordingCreate, RecordingResponse, RecordingUpdate
from ..services.work_service import WorkService

router = APIRouter(prefix="/works", tags=["recordings"])


def get_work_service(db: AsyncSession = Depends(get_db)) -> WorkService:
    """Dependency to get work service."""
    return WorkService(db)


@router.get("/{work_id}/recordings", response_model=list[RecordingResponse])
async def get_work_recordings(
    work_id: UUID,
    service: WorkService = Depends(get_work_service),
) -> list[RecordingResponse]:
    """Get all recordings for a work."""
    work = await service.get_work(work_id)
    if work is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found",
        )

    recordings = await service.get_work_recordings(work_id)
    return recordings


@router.post("/{work_id}/recordings", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def create_recording(
    work_id: UUID,
    recording: RecordingCreate,
    service: WorkService = Depends(get_work_service),
) -> RecordingResponse:
    """Create a new recording for a work."""
    work = await service.get_work(work_id)
    if work is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work not found",
        )

    # Check for duplicate ISRC
    if recording.isrc:
        existing = await service.get_recording_by_isrc(recording.isrc)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Recording with ISRC {recording.isrc} already exists",
            )

    created = await service.create_recording(work_id, recording)
    return created


@router.get("/{work_id}/recordings/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    work_id: UUID,
    recording_id: UUID,
    service: WorkService = Depends(get_work_service),
) -> RecordingResponse:
    """Get a specific recording."""
    recording = await service.get_recording(recording_id)
    if recording is None or recording.work_id != work_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found",
        )
    return recording


@router.put("/{work_id}/recordings/{recording_id}", response_model=RecordingResponse)
async def update_recording(
    work_id: UUID,
    recording_id: UUID,
    recording_update: RecordingUpdate,
    service: WorkService = Depends(get_work_service),
) -> RecordingResponse:
    """Update a recording."""
    recording = await service.get_recording(recording_id)
    if recording is None or recording.work_id != work_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found",
        )

    # Check for duplicate ISRC if being updated
    if recording_update.isrc and recording_update.isrc != recording.isrc:
        duplicate = await service.get_recording_by_isrc(recording_update.isrc)
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Recording with ISRC {recording_update.isrc} already exists",
            )

    updated = await service.update_recording(recording_id, recording_update)
    return updated


@router.delete("/{work_id}/recordings/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording(
    work_id: UUID,
    recording_id: UUID,
    service: WorkService = Depends(get_work_service),
) -> None:
    """Delete a recording."""
    recording = await service.get_recording(recording_id)
    if recording is None or recording.work_id != work_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found",
        )

    await service.delete_recording(recording_id)
