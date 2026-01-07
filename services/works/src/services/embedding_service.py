from typing import Optional

from openai import AsyncOpenAI

from ..config import settings


class EmbeddingService:
    """Service for generating text embeddings using OpenAI."""

    def __init__(self):
        self.client: Optional[AsyncOpenAI] = None
        if settings.openai_api_key:
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for text using OpenAI text-embedding-3-large."""
        if self.client is None:
            raise RuntimeError("OpenAI API key not configured")

        response = await self.client.embeddings.create(
            model="text-embedding-3-large",
            input=text,
            dimensions=1536,
        )

        return response.data[0].embedding

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        if self.client is None:
            raise RuntimeError("OpenAI API key not configured")

        response = await self.client.embeddings.create(
            model="text-embedding-3-large",
            input=texts,
            dimensions=1536,
        )

        return [item.embedding for item in response.data]
