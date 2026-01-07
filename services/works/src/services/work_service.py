from typing import Optional
from uuid import UUID

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import Recording, Songwriter, Work, WorkWriter
from ..schemas import (
    RecordingCreate,
    RecordingResponse,
    RecordingUpdate,
    WorkCreate,
    WorkResponse,
    WorkUpdate,
    WorkWithDetails,
    WorkWriterCreate,
    WorkWriterResponse,
)


class WorkService:
    """Service for work-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_works(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        search: Optional[str] = None,
        genre: Optional[str] = None,
    ) -> tuple[list[WorkResponse], int]:
        """List works with filtering and pagination."""
        # Build query
        query = select(Work)

        # Apply filters
        if status:
            query = query.where(Work.status == status)
        if genre:
            query = query.where(Work.genre == genre)
        if search:
            query = query.where(Work.title.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Work.created_at.desc()).offset(skip).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        works = result.scalars().all()

        # Convert to response models with counts
        work_responses = []
        for work in works:
            response = WorkResponse(
                id=work.id,
                title=work.title,
                alternate_titles=work.alternate_titles,
                iswc=work.iswc,
                language=work.language,
                genre=work.genre,
                release_date=work.release_date,
                duration_seconds=work.duration_seconds,
                status=work.status,
                extra_data=work.extra_data,
                created_at=work.created_at,
                updated_at=work.updated_at,
                recordings_count=len(work.recordings) if work.recordings else 0,
                writers_count=len(work.writers) if work.writers else 0,
            )
            work_responses.append(response)

        return work_responses, total

    async def search_works(
        self,
        query: str,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[WorkResponse], int]:
        """Full-text search for works using PostgreSQL text search."""
        # Use trigram similarity for fuzzy search
        sql = text(
            """
            SELECT w.*, similarity(w.title, :query) as sim
            FROM works w
            WHERE similarity(w.title, :query) > 0.3
               OR w.title ILIKE :like_query
            ORDER BY sim DESC
            LIMIT :limit OFFSET :skip
        """
        )

        result = await self.db.execute(sql, {"query": query, "like_query": f"%{query}%", "limit": limit, "skip": skip})
        rows = result.fetchall()

        # Get IDs and fetch full works
        work_ids = [row[0] for row in rows]  # First column is id
        if not work_ids:
            return [], 0

        works_query = select(Work).where(Work.id.in_(work_ids))
        works_result = await self.db.execute(works_query)
        works = works_result.scalars().all()

        # Convert to response models
        work_responses = []
        for work in works:
            response = WorkResponse(
                id=work.id,
                title=work.title,
                alternate_titles=work.alternate_titles,
                iswc=work.iswc,
                language=work.language,
                genre=work.genre,
                release_date=work.release_date,
                duration_seconds=work.duration_seconds,
                status=work.status,
                extra_data=work.extra_data,
                created_at=work.created_at,
                updated_at=work.updated_at,
                recordings_count=len(work.recordings) if work.recordings else 0,
                writers_count=len(work.writers) if work.writers else 0,
            )
            work_responses.append(response)

        return work_responses, len(work_responses)

    async def search_similar(
        self,
        query_embedding: list[float],
        limit: int = 10,
        threshold: float = 0.7,
    ) -> list[WorkResponse]:
        """Vector similarity search for works."""
        # Use pgvector for similarity search
        sql = text(
            """
            SELECT w.id, w.title, w.iswc, w.language, w.genre, w.release_date,
                   w.duration_seconds, w.status, w.metadata, w.created_at, w.updated_at,
                   w.alternate_titles,
                   1 - (w.title_embedding <=> :embedding::vector) as similarity
            FROM works w
            WHERE w.title_embedding IS NOT NULL
              AND 1 - (w.title_embedding <=> :embedding::vector) > :threshold
            ORDER BY w.title_embedding <=> :embedding::vector
            LIMIT :limit
        """
        )

        result = await self.db.execute(
            sql,
            {"embedding": str(query_embedding), "threshold": threshold, "limit": limit},
        )
        rows = result.fetchall()

        # Convert to response models
        work_responses = []
        for row in rows:
            response = WorkResponse(
                id=row.id,
                title=row.title,
                alternate_titles=row.alternate_titles,
                iswc=row.iswc,
                language=row.language,
                genre=row.genre,
                release_date=row.release_date,
                duration_seconds=row.duration_seconds,
                status=row.status,
                extra_data=row.metadata,
                created_at=row.created_at,
                updated_at=row.updated_at,
                recordings_count=0,
                writers_count=0,
            )
            work_responses.append(response)

        return work_responses

    async def get_work(self, work_id: UUID) -> Optional[WorkWithDetails]:
        """Get a work by ID with all details."""
        query = (
            select(Work)
            .where(Work.id == work_id)
            .options(
                selectinload(Work.writers).selectinload(WorkWriter.songwriter),
                selectinload(Work.recordings),
            )
        )
        result = await self.db.execute(query)
        work = result.scalar_one_or_none()

        if work is None:
            return None

        return WorkWithDetails(
            id=work.id,
            title=work.title,
            alternate_titles=work.alternate_titles,
            iswc=work.iswc,
            language=work.language,
            genre=work.genre,
            release_date=work.release_date,
            duration_seconds=work.duration_seconds,
            status=work.status,
            extra_data=work.extra_data,
            created_at=work.created_at,
            updated_at=work.updated_at,
            lyrics=work.lyrics,
            recordings_count=len(work.recordings),
            writers_count=len(work.writers),
            writers=[WorkWriterResponse.model_validate(w) for w in work.writers],
            recordings=[RecordingResponse.model_validate(r) for r in work.recordings],
        )

    async def get_work_by_iswc(self, iswc: str) -> Optional[Work]:
        """Get a work by ISWC."""
        result = await self.db.execute(select(Work).where(Work.iswc == iswc))
        return result.scalar_one_or_none()

    async def create_work(
        self,
        work_data: WorkCreate,
        title_embedding: Optional[list[float]] = None,
    ) -> WorkResponse:
        """Create a new work."""
        work = Work(
            title=work_data.title,
            alternate_titles=work_data.alternate_titles,
            iswc=work_data.iswc,
            language=work_data.language,
            genre=work_data.genre,
            release_date=work_data.release_date,
            duration_seconds=work_data.duration_seconds,
            lyrics=work_data.lyrics,
            extra_data=work_data.extra_data or {},
            title_embedding=title_embedding,
        )

        self.db.add(work)
        await self.db.flush()
        await self.db.refresh(work)

        return WorkResponse(
            id=work.id,
            title=work.title,
            alternate_titles=work.alternate_titles,
            iswc=work.iswc,
            language=work.language,
            genre=work.genre,
            release_date=work.release_date,
            duration_seconds=work.duration_seconds,
            status=work.status,
            extra_data=work.extra_data,
            created_at=work.created_at,
            updated_at=work.updated_at,
            recordings_count=0,
            writers_count=0,
        )

    async def update_work(
        self,
        work_id: UUID,
        work_update: WorkUpdate,
        title_embedding: Optional[list[float]] = None,
    ) -> WorkResponse:
        """Update a work."""
        result = await self.db.execute(select(Work).where(Work.id == work_id))
        work = result.scalar_one_or_none()

        if work is None:
            raise ValueError("Work not found")

        # Update fields
        update_data = work_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work, field, value)

        if title_embedding:
            work.title_embedding = title_embedding

        await self.db.flush()
        await self.db.refresh(work)

        return WorkResponse(
            id=work.id,
            title=work.title,
            alternate_titles=work.alternate_titles,
            iswc=work.iswc,
            language=work.language,
            genre=work.genre,
            release_date=work.release_date,
            duration_seconds=work.duration_seconds,
            status=work.status,
            extra_data=work.extra_data,
            created_at=work.created_at,
            updated_at=work.updated_at,
            recordings_count=len(work.recordings) if work.recordings else 0,
            writers_count=len(work.writers) if work.writers else 0,
        )

    async def delete_work(self, work_id: UUID) -> None:
        """Delete a work."""
        await self.db.execute(delete(Work).where(Work.id == work_id))
        await self.db.flush()

    # ============================================
    # Work Writers
    # ============================================

    async def get_work_writers(self, work_id: UUID) -> list[WorkWriterResponse]:
        """Get all writers for a work."""
        query = (
            select(WorkWriter)
            .where(WorkWriter.work_id == work_id)
            .options(selectinload(WorkWriter.songwriter))
        )
        result = await self.db.execute(query)
        writers = result.scalars().all()
        return [WorkWriterResponse.model_validate(w) for w in writers]

    async def get_work_writer(self, work_id: UUID, songwriter_id: UUID) -> Optional[WorkWriter]:
        """Get a specific work-writer association."""
        result = await self.db.execute(
            select(WorkWriter).where(
                WorkWriter.work_id == work_id,
                WorkWriter.songwriter_id == songwriter_id,
            )
        )
        return result.scalar_one_or_none()

    async def add_work_writer(self, work_id: UUID, writer_data: WorkWriterCreate) -> WorkWriterResponse:
        """Add a writer to a work."""
        work_writer = WorkWriter(
            work_id=work_id,
            songwriter_id=writer_data.songwriter_id,
            writer_role=writer_data.writer_role,
            ownership_share=writer_data.ownership_share,
        )

        self.db.add(work_writer)
        await self.db.flush()

        # Fetch with songwriter details
        query = (
            select(WorkWriter)
            .where(WorkWriter.id == work_writer.id)
            .options(selectinload(WorkWriter.songwriter))
        )
        result = await self.db.execute(query)
        work_writer = result.scalar_one()

        return WorkWriterResponse.model_validate(work_writer)

    async def remove_work_writer(self, work_id: UUID, songwriter_id: UUID) -> None:
        """Remove a writer from a work."""
        await self.db.execute(
            delete(WorkWriter).where(
                WorkWriter.work_id == work_id,
                WorkWriter.songwriter_id == songwriter_id,
            )
        )
        await self.db.flush()

    # ============================================
    # Recordings
    # ============================================

    async def get_work_recordings(self, work_id: UUID) -> list[RecordingResponse]:
        """Get all recordings for a work."""
        result = await self.db.execute(select(Recording).where(Recording.work_id == work_id))
        recordings = result.scalars().all()
        return [RecordingResponse.model_validate(r) for r in recordings]

    async def get_recording(self, recording_id: UUID) -> Optional[Recording]:
        """Get a recording by ID."""
        result = await self.db.execute(select(Recording).where(Recording.id == recording_id))
        return result.scalar_one_or_none()

    async def get_recording_by_isrc(self, isrc: str) -> Optional[Recording]:
        """Get a recording by ISRC."""
        result = await self.db.execute(select(Recording).where(Recording.isrc == isrc))
        return result.scalar_one_or_none()

    async def create_recording(self, work_id: UUID, recording_data: RecordingCreate) -> RecordingResponse:
        """Create a new recording."""
        recording = Recording(
            work_id=work_id,
            isrc=recording_data.isrc,
            title=recording_data.title,
            artist_name=recording_data.artist_name,
            version_type=recording_data.version_type,
            duration_seconds=recording_data.duration_seconds,
            release_date=recording_data.release_date,
            label=recording_data.label,
            extra_data=recording_data.extra_data or {},
        )

        self.db.add(recording)
        await self.db.flush()
        await self.db.refresh(recording)

        return RecordingResponse.model_validate(recording)

    async def update_recording(self, recording_id: UUID, recording_update: RecordingUpdate) -> RecordingResponse:
        """Update a recording."""
        result = await self.db.execute(select(Recording).where(Recording.id == recording_id))
        recording = result.scalar_one_or_none()

        if recording is None:
            raise ValueError("Recording not found")

        update_data = recording_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(recording, field, value)

        await self.db.flush()
        await self.db.refresh(recording)

        return RecordingResponse.model_validate(recording)

    async def delete_recording(self, recording_id: UUID) -> None:
        """Delete a recording."""
        await self.db.execute(delete(Recording).where(Recording.id == recording_id))
        await self.db.flush()
