"""Embedding service for generating content embeddings for usage events."""

import logging
from typing import Any

from openai import AsyncOpenAI

from .config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating embeddings using OpenAI."""

    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        """Get or create the OpenAI client."""
        if self._client is None:
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY is not configured")
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    def _build_content_text(
        self,
        title: str | None,
        artist: str | None,
        album: str | None = None,
    ) -> str:
        """
        Build text content for embedding from title, artist, and album.

        Args:
            title: Song title
            artist: Artist name
            album: Album name (optional)

        Returns:
            Formatted text for embedding
        """
        parts = []

        if title:
            parts.append(f"Title: {title}")
        if artist:
            parts.append(f"Artist: {artist}")
        if album:
            parts.append(f"Album: {album}")

        if not parts:
            return ""

        return " | ".join(parts)

    async def generate_embedding(
        self,
        title: str | None,
        artist: str | None,
        album: str | None = None,
    ) -> list[float] | None:
        """
        Generate an embedding for a single usage event.

        Args:
            title: Song title
            artist: Artist name
            album: Album name (optional)

        Returns:
            Embedding vector or None if content is empty
        """
        content = self._build_content_text(title, artist, album)

        if not content:
            logger.warning("Cannot generate embedding for empty content")
            return None

        try:
            response = await self.client.embeddings.create(
                model=settings.embedding_model,
                input=content,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    async def generate_embeddings_batch(
        self,
        items: list[dict[str, Any]],
    ) -> list[list[float] | None]:
        """
        Generate embeddings for a batch of items.

        Args:
            items: List of dicts with 'title', 'artist', and optionally 'album' keys

        Returns:
            List of embedding vectors (or None for items that failed)
        """
        # Build content texts
        contents = [
            self._build_content_text(
                item.get("title"),
                item.get("artist"),
                item.get("album"),
            )
            for item in items
        ]

        # Filter out empty contents and track their indices
        non_empty_indices = []
        non_empty_contents = []
        for i, content in enumerate(contents):
            if content:
                non_empty_indices.append(i)
                non_empty_contents.append(content)

        if not non_empty_contents:
            return [None] * len(items)

        # Generate embeddings in batches
        embeddings: list[list[float] | None] = [None] * len(items)
        batch_size = settings.embedding_batch_size

        for batch_start in range(0, len(non_empty_contents), batch_size):
            batch_end = min(batch_start + batch_size, len(non_empty_contents))
            batch_contents = non_empty_contents[batch_start:batch_end]
            batch_indices = non_empty_indices[batch_start:batch_end]

            try:
                response = await self.client.embeddings.create(
                    model=settings.embedding_model,
                    input=batch_contents,
                )

                for i, embedding_data in enumerate(response.data):
                    original_index = batch_indices[i]
                    embeddings[original_index] = embedding_data.embedding

            except Exception as e:
                logger.error(f"Failed to generate batch embeddings: {e}")
                # Leave None for failed items

        return embeddings


# Singleton instance
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the embedding service singleton."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


async def generate_content_embedding(
    title: str | None,
    artist: str | None,
    album: str | None = None,
) -> list[float] | None:
    """
    Convenience function to generate a single content embedding.

    Args:
        title: Song title
        artist: Artist name
        album: Album name (optional)

    Returns:
        Embedding vector or None
    """
    service = get_embedding_service()
    return await service.generate_embedding(title, artist, album)
