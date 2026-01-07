"""Configuration settings for the Matching Worker."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://musicpub:musicpub_dev@localhost:5432/musicpub"

    @property
    def async_database_url(self) -> str:
        """Get database URL with asyncpg driver."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Kafka
    kafka_brokers: str = "localhost:9092"
    kafka_consumer_group: str = "matching-worker-group"

    # OpenAI (for embeddings if needed)
    openai_api_key: str = ""

    # Matching thresholds
    isrc_confidence: float = 1.0  # ISRC exact match confidence
    fuzzy_match_threshold: float = 0.85  # Minimum similarity for fuzzy matching
    embedding_match_threshold: float = 0.80  # Minimum cosine similarity for embeddings
    manual_review_threshold: float = 0.60  # Below this, queue for manual review

    # Processing
    max_alternative_matches: int = 5  # Max suggestions for manual review

    # AI Service
    ai_service_url: str = "http://ai-service:8005"

    # Environment
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
