"""Embedding-based matching tool using pgvector similarity search."""

import logging
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Work
from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Result of a matching attempt."""

    work_id: UUID
    recording_id: UUID | None
    confidence: float
    method: str


class EmbeddingMatcher:
    """
    Matcher that uses pgvector for semantic similarity matching.

    Uses cosine similarity between content embeddings of usage events
    and work title embeddings to find semantically similar works.
    """

    async def match(
        self,
        session: AsyncSession,
        embedding: list[float] | None,
        limit: int = 5,
    ) -> list[MatchResult]:
        """
        Find works similar to the given embedding using vector search.

        Args:
            session: Database session
            embedding: Content embedding from usage event
            limit: Maximum number of results to return

        Returns:
            List of MatchResults ordered by similarity (highest first)
        """
        if not embedding:
            logger.debug("No embedding provided, skipping embedding matching")
            return []

        # Convert embedding to PostgreSQL array format
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        # Query using pgvector cosine similarity
        # Note: 1 - cosine distance = cosine similarity
        # pgvector's <=> operator returns cosine distance
        similarity_sql = text("""
            SELECT
                w.id as work_id,
                w.title,
                1 - (w.title_embedding <=> :embedding::vector) as similarity
            FROM works w
            WHERE w.title_embedding IS NOT NULL
                AND w.status = 'active'
            ORDER BY w.title_embedding <=> :embedding::vector
            LIMIT :limit
        """)

        result = await session.execute(
            similarity_sql,
            {
                "embedding": embedding_str,
                "limit": limit,
            }
        )

        matches = []
        for row in result:
            similarity = float(row.similarity)

            # Only include if above minimum threshold
            if similarity >= settings.manual_review_threshold:
                matches.append(MatchResult(
                    work_id=row.work_id,
                    recording_id=None,
                    confidence=similarity,
                    method="ai_embedding",
                ))
                logger.debug(f"Embedding match: {row.title} (similarity={similarity:.3f})")

        if matches:
            logger.info(f"Embedding matches found: {len(matches)} results")
        else:
            logger.debug("No embedding matches above threshold")

        return matches

    async def get_best_match(
        self,
        session: AsyncSession,
        embedding: list[float] | None,
    ) -> MatchResult | None:
        """
        Get the single best embedding match if it exceeds threshold.

        Args:
            session: Database session
            embedding: Content embedding

        Returns:
            Best MatchResult if above threshold, None otherwise
        """
        matches = await self.match(session, embedding, limit=1)

        if matches and matches[0].confidence >= settings.embedding_match_threshold:
            return matches[0]

        return None

    async def get_suggestions(
        self,
        session: AsyncSession,
        embedding: list[float] | None,
        limit: int = 5,
    ) -> list[MatchResult]:
        """
        Get embedding-based suggestions for manual review.

        Returns matches even if below the automatic matching threshold,
        but above the manual review threshold.

        Args:
            session: Database session
            embedding: Content embedding
            limit: Maximum suggestions to return

        Returns:
            List of suggested matches for human review
        """
        return await self.match(session, embedding, limit=limit)
