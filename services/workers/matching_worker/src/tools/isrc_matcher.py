"""ISRC-based exact matching tool."""

import logging
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Recording, Work
from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Result of a matching attempt."""

    work_id: UUID
    recording_id: UUID | None
    confidence: float
    method: str


class IsrcMatcher:
    """
    Matcher that uses ISRC codes for exact matching.

    ISRC (International Standard Recording Code) uniquely identifies
    a recording. If we find an exact ISRC match, we have 100% confidence.
    """

    async def match(
        self,
        session: AsyncSession,
        isrc: str | None,
    ) -> MatchResult | None:
        """
        Attempt to match usage to a work via ISRC.

        Args:
            session: Database session
            isrc: ISRC code from usage event

        Returns:
            MatchResult if found, None otherwise
        """
        if not isrc:
            logger.debug("No ISRC provided, skipping ISRC matching")
            return None

        # Clean ISRC
        cleaned_isrc = isrc.replace(" ", "").replace("-", "").upper()

        if len(cleaned_isrc) != 12:
            logger.debug(f"Invalid ISRC format: {isrc}")
            return None

        # Query for recording with this ISRC
        query = (
            select(Recording)
            .where(Recording.isrc == cleaned_isrc)
            .limit(1)
        )

        result = await session.execute(query)
        recording = result.scalar_one_or_none()

        if recording:
            logger.info(f"ISRC match found: {cleaned_isrc} -> Work {recording.work_id}")
            return MatchResult(
                work_id=recording.work_id,
                recording_id=recording.id,
                confidence=settings.isrc_confidence,
                method="isrc_exact",
            )

        logger.debug(f"No ISRC match found for: {cleaned_isrc}")
        return None


class IswcMatcher:
    """
    Matcher that uses ISWC codes for exact matching.

    ISWC (International Standard Musical Work Code) uniquely identifies
    a musical work. If we find an exact ISWC match, we have 100% confidence.
    """

    async def match(
        self,
        session: AsyncSession,
        iswc: str | None,
    ) -> MatchResult | None:
        """
        Attempt to match usage to a work via ISWC.

        Args:
            session: Database session
            iswc: ISWC code from usage event

        Returns:
            MatchResult if found, None otherwise
        """
        if not iswc:
            logger.debug("No ISWC provided, skipping ISWC matching")
            return None

        # Clean ISWC (format: T-123.456.789-C)
        cleaned_iswc = iswc.replace(" ", "").upper()

        # Query for work with this ISWC
        query = (
            select(Work)
            .where(Work.iswc == cleaned_iswc)
            .limit(1)
        )

        result = await session.execute(query)
        work = result.scalar_one_or_none()

        if work:
            logger.info(f"ISWC match found: {cleaned_iswc} -> Work {work.id}")
            return MatchResult(
                work_id=work.id,
                recording_id=None,
                confidence=1.0,
                method="iswc_exact",
            )

        logger.debug(f"No ISWC match found for: {cleaned_iswc}")
        return None
