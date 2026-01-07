from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


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
# Work Writer Schemas
# ============================================


class WorkWriterCreate(BaseModel):
    """Request schema for adding a writer to a work."""

    songwriter_id: UUID
    writer_role: Optional[Literal["composer", "lyricist", "composer_lyricist", "arranger", "adapter"]] = None
    ownership_share: Decimal = Field(..., gt=0, le=100)


class WorkWriterResponse(BaseModel):
    """Response schema for work writer association."""

    id: UUID
    songwriter_id: UUID
    writer_role: Optional[str] = None
    ownership_share: Decimal
    created_at: datetime
    songwriter: Optional[SongwriterResponse] = None

    class Config:
        from_attributes = True


# ============================================
# Recording Schemas
# ============================================


class RecordingCreate(BaseModel):
    """Request schema for creating a recording."""

    isrc: Optional[str] = Field(None, max_length=12)
    title: str = Field(..., max_length=500)
    artist_name: Optional[str] = Field(None, max_length=255)
    version_type: Optional[Literal["original", "remix", "live", "acoustic"]] = None
    duration_seconds: Optional[int] = None
    release_date: Optional[date] = None
    label: Optional[str] = Field(None, max_length=255)
    extra_data: Optional[dict] = Field(default_factory=dict)


class RecordingUpdate(BaseModel):
    """Request schema for updating a recording."""

    isrc: Optional[str] = Field(None, max_length=12)
    title: Optional[str] = Field(None, max_length=500)
    artist_name: Optional[str] = Field(None, max_length=255)
    version_type: Optional[str] = None
    duration_seconds: Optional[int] = None
    release_date: Optional[date] = None
    label: Optional[str] = Field(None, max_length=255)
    extra_data: Optional[dict] = None


class RecordingResponse(BaseModel):
    """Response schema for recording."""

    id: UUID
    work_id: UUID
    isrc: Optional[str] = None
    title: str
    artist_name: Optional[str] = None
    version_type: Optional[str] = None
    duration_seconds: Optional[int] = None
    release_date: Optional[date] = None
    label: Optional[str] = None
    extra_data: dict = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Work Schemas
# ============================================


class WorkBase(BaseModel):
    """Base schema for work."""

    title: str = Field(..., max_length=500)
    alternate_titles: Optional[list[str]] = None
    iswc: Optional[str] = Field(None, max_length=15)
    language: Optional[str] = Field(None, max_length=10)
    genre: Optional[str] = Field(None, max_length=100)
    release_date: Optional[date] = None
    duration_seconds: Optional[int] = None
    lyrics: Optional[str] = None
    extra_data: Optional[dict] = Field(default_factory=dict)


class WorkCreate(WorkBase):
    """Request schema for creating a work."""

    pass


class WorkUpdate(BaseModel):
    """Request schema for updating a work."""

    title: Optional[str] = Field(None, max_length=500)
    alternate_titles: Optional[list[str]] = None
    iswc: Optional[str] = Field(None, max_length=15)
    language: Optional[str] = Field(None, max_length=10)
    genre: Optional[str] = Field(None, max_length=100)
    release_date: Optional[date] = None
    duration_seconds: Optional[int] = None
    lyrics: Optional[str] = None
    extra_data: Optional[dict] = None
    status: Optional[Literal["active", "inactive", "disputed"]] = None


class WorkResponse(BaseModel):
    """Response schema for work."""

    id: UUID
    title: str
    alternate_titles: Optional[list[str]] = None
    iswc: Optional[str] = None
    language: Optional[str] = None
    genre: Optional[str] = None
    release_date: Optional[date] = None
    duration_seconds: Optional[int] = None
    status: str
    extra_data: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    recordings_count: int = 0
    writers_count: int = 0

    class Config:
        from_attributes = True


class WorkWithDetails(WorkResponse):
    """Response schema for work with full details."""

    lyrics: Optional[str] = None
    writers: list[WorkWriterResponse] = []
    recordings: list[RecordingResponse] = []


class WorkListResponse(BaseModel):
    """Response schema for paginated list of works."""

    items: list[WorkResponse]
    total: int
    skip: int
    limit: int


class SimilarSearchRequest(BaseModel):
    """Request schema for similar work search."""

    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(10, ge=1, le=50)
    threshold: float = Field(0.7, ge=0, le=1)
