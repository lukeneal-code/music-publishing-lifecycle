"""Fuzzy text matching tool using PostgreSQL trigram similarity."""

import logging
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Work, Recording
from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Result of a matching attempt."""

    work_id: UUID
    recording_id: UUID | None
    confidence: float
    method: str


class FuzzyMatcher:
    """
    Matcher that uses PostgreSQL trigram similarity for fuzzy text matching.

    Uses pg_trgm extension for efficient similarity matching on
    title and artist name combinations.
    """

    async def match(
        self,
        session: AsyncSession,
        title: str | None,
        artist: str | None,
        limit: int = 5,
    ) -> list[MatchResult]:
        """
        Attempt to match usage to works via fuzzy title/artist matching.

        Args:
            session: Database session
            title: Reported title from usage event
            artist: Reported artist from usage event
            limit: Maximum number of results to return

        Returns:
            List of MatchResults ordered by confidence (highest first)
        """
        if not title:
            logger.debug("No title provided, skipping fuzzy matching")
            return []

        # Build search text combining title and artist
        search_text = title
        if artist:
            search_text = f"{title} {artist}"

        # First try matching against recordings (which have artist info)
        recording_matches = await self._match_recordings(session, title, artist, limit)

        # Also try matching against works directly
        work_matches = await self._match_works(session, title, limit)

        # Combine and deduplicate by work_id
        all_matches: dict[UUID, MatchResult] = {}

        for match in recording_matches:
            if match.work_id not in all_matches or match.confidence > all_matches[match.work_id].confidence:
                all_matches[match.work_id] = match

        for match in work_matches:
            if match.work_id not in all_matches or match.confidence > all_matches[match.work_id].confidence:
                all_matches[match.work_id] = match

        # Sort by confidence and apply limit
        results = sorted(all_matches.values(), key=lambda x: x.confidence, reverse=True)[:limit]

        if results:
            logger.info(f"Fuzzy matches found for '{title}': {len(results)} results")
        else:
            logger.debug(f"No fuzzy matches found for: {title}")

        return results

    async def _match_recordings(
        self,
        session: AsyncSession,
        title: str,
        artist: str | None,
        limit: int,
    ) -> list[MatchResult]:
        """Match against recordings table using title and artist."""
        # Build combined search string
        if artist:
            # Match on combined title + artist similarity
            similarity_sql = text("""
                SELECT
                    r.id as recording_id,
                    r.work_id,
                    r.title,
                    r.artist_name,
                    similarity(
                        LOWER(r.title || ' ' || COALESCE(r.artist_name, '')),
                        LOWER(:search_text)
                    ) as sim_score
                FROM recordings r
                WHERE similarity(
                    LOWER(r.title || ' ' || COALESCE(r.artist_name, '')),
                    LOWER(:search_text)
                ) > :threshold
                ORDER BY sim_score DESC
                LIMIT :limit
            """)
            search_text = f"{title} {artist}"
        else:
            # Match on title only
            similarity_sql = text("""
                SELECT
                    r.id as recording_id,
                    r.work_id,
                    r.title,
                    r.artist_name,
                    similarity(LOWER(r.title), LOWER(:search_text)) as sim_score
                FROM recordings r
                WHERE similarity(LOWER(r.title), LOWER(:search_text)) > :threshold
                ORDER BY sim_score DESC
                LIMIT :limit
            """)
            search_text = title

        result = await session.execute(
            similarity_sql,
            {
                "search_text": search_text,
                "threshold": settings.fuzzy_match_threshold - 0.1,  # Slightly lower threshold to get candidates
                "limit": limit,
            }
        )

        matches = []
        for row in result:
            confidence = float(row.sim_score)
            if confidence >= settings.fuzzy_match_threshold:
                matches.append(MatchResult(
                    work_id=row.work_id,
                    recording_id=row.recording_id,
                    confidence=confidence,
                    method="fuzzy_title",
                ))

        return matches

    async def _match_works(
        self,
        session: AsyncSession,
        title: str,
        limit: int,
    ) -> list[MatchResult]:
        """Match directly against works table title."""
        similarity_sql = text("""
            SELECT
                w.id as work_id,
                w.title,
                similarity(LOWER(w.title), LOWER(:title)) as sim_score
            FROM works w
            WHERE w.status = 'active'
                AND similarity(LOWER(w.title), LOWER(:title)) > :threshold
            ORDER BY sim_score DESC
            LIMIT :limit
        """)

        result = await session.execute(
            similarity_sql,
            {
                "title": title,
                "threshold": settings.fuzzy_match_threshold - 0.1,
                "limit": limit,
            }
        )

        matches = []
        for row in result:
            confidence = float(row.sim_score)
            if confidence >= settings.fuzzy_match_threshold:
                matches.append(MatchResult(
                    work_id=row.work_id,
                    recording_id=None,
                    confidence=confidence,
                    method="fuzzy_title",
                ))

        return matches

    async def get_best_match(
        self,
        session: AsyncSession,
        title: str | None,
        artist: str | None,
    ) -> MatchResult | None:
        """
        Get the single best fuzzy match if it exceeds threshold.

        Args:
            session: Database session
            title: Reported title
            artist: Reported artist

        Returns:
            Best MatchResult if above threshold, None otherwise
        """
        matches = await self.match(session, title, artist, limit=1)

        if matches and matches[0].confidence >= settings.fuzzy_match_threshold:
            return matches[0]

        return None
