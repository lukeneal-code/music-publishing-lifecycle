"""Usage Processor Worker - Kafka consumer for processing raw usage data."""

import asyncio
import logging
import signal
import sys
import os
from datetime import datetime
from typing import Any

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'shared'))

from sqlalchemy import select

from .config import settings
from .database import async_session_maker, init_db
from .models import UsageEvent
from .normalizers import get_normalizer
from .embedding_service import generate_content_embedding

from shared.kafka_utils import KafkaConsumerClient, KafkaProducerClient, Topics
from shared.schemas import NormalizedUsageEvent

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global flag for graceful shutdown
running = True


def signal_handler(sig, frame):
    """Handle shutdown signals."""
    global running
    logger.info(f"Received signal {sig}, initiating graceful shutdown...")
    running = False


class UsageProcessor:
    """Main processor for usage events."""

    def __init__(self):
        self.consumer: KafkaConsumerClient | None = None
        self.producer: KafkaProducerClient | None = None

    async def start(self):
        """Start the processor."""
        logger.info("Starting Usage Processor Worker...")
        logger.info(f"Kafka brokers: {settings.kafka_brokers}")
        logger.info(f"Consumer group: {settings.kafka_consumer_group}")

        # Initialize database
        await init_db()

        # Create Kafka clients
        self.consumer = KafkaConsumerClient(
            bootstrap_servers=settings.kafka_brokers,
            group_id=settings.kafka_consumer_group,
            topics=Topics.raw_topics(),
        )
        self.producer = KafkaProducerClient(
            bootstrap_servers=settings.kafka_brokers,
        )

        # Start clients
        await self.consumer.start()
        await self.producer.start()

        logger.info(f"Subscribed to topics: {Topics.raw_topics()}")

    async def stop(self):
        """Stop the processor."""
        logger.info("Stopping Usage Processor Worker...")

        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()

        logger.info("Usage Processor Worker stopped")

    async def process_event(
        self,
        topic: str,
        key: str | None,
        raw_data: dict[str, Any],
    ) -> None:
        """
        Process a single raw usage event.

        Args:
            topic: Kafka topic the message came from
            key: Message key
            raw_data: Raw event data
        """
        try:
            # Determine source from topic
            source = Topics.source_from_topic(topic)
            logger.debug(f"Processing event from {source}: {key}")

            # Get appropriate normalizer
            normalizer = get_normalizer(source)

            # Normalize the event
            normalized = normalizer.normalize(raw_data)

            # Generate embedding if we have enough content
            if normalized.reported_title or normalized.reported_artist:
                try:
                    embedding = await generate_content_embedding(
                        title=normalized.reported_title,
                        artist=normalized.reported_artist,
                        album=normalized.reported_album,
                    )
                    normalized.content_embedding = embedding
                except Exception as e:
                    logger.warning(f"Failed to generate embedding: {e}")

            # Persist to database
            await self._persist_event(normalized)

            # Publish to normalized topic for matching
            await self._publish_normalized(normalized)

            logger.info(
                f"Processed event: source={source}, "
                f"title={normalized.reported_title}, "
                f"artist={normalized.reported_artist}"
            )

        except Exception as e:
            logger.error(f"Error processing event: {e}", exc_info=True)
            # Send to DLQ
            await self._send_to_dlq(topic, raw_data, str(e))

    async def _persist_event(self, normalized: NormalizedUsageEvent) -> None:
        """Persist normalized event to database."""
        async with async_session_maker() as session:
            usage_event = UsageEvent(
                id=normalized.event_id,
                source=normalized.source,
                source_event_id=normalized.source_event_id,
                isrc=normalized.isrc,
                reported_title=normalized.reported_title,
                reported_artist=normalized.reported_artist,
                reported_album=normalized.reported_album,
                usage_type=normalized.usage_type,
                play_count=normalized.play_count,
                revenue_amount=normalized.revenue_amount,
                currency=normalized.currency,
                territory=normalized.territory,
                usage_date=normalized.usage_date,
                reporting_period=normalized.reporting_period,
                processing_status="pending",
                ingested_at=normalized.ingested_at,
                content_embedding=normalized.content_embedding,
            )

            session.add(usage_event)
            await session.commit()

            logger.debug(f"Persisted event {normalized.event_id} to database")

    async def _publish_normalized(self, normalized: NormalizedUsageEvent) -> None:
        """Publish normalized event to Kafka for matching."""
        if not self.producer:
            raise RuntimeError("Producer not initialized")

        # Convert to dict for Kafka
        event_data = normalized.model_dump(mode="json")

        await self.producer.send(
            topic=Topics.NORMALIZED,
            value=event_data,
            key=str(normalized.event_id),
        )

        logger.debug(f"Published event {normalized.event_id} to {Topics.NORMALIZED}")

    async def _send_to_dlq(
        self,
        original_topic: str,
        raw_data: dict[str, Any],
        error: str,
    ) -> None:
        """Send failed event to dead letter queue."""
        if not self.producer:
            return

        dlq_event = {
            "original_topic": original_topic,
            "raw_data": raw_data,
            "error": error,
            "failed_at": datetime.utcnow().isoformat(),
        }

        try:
            await self.producer.send(
                topic=Topics.DLQ_PROCESSING,
                value=dlq_event,
            )
            logger.warning(f"Sent failed event to DLQ: {error}")
        except Exception as e:
            logger.error(f"Failed to send to DLQ: {e}")

    async def run(self):
        """Main processing loop."""
        if not self.consumer:
            raise RuntimeError("Consumer not initialized")

        logger.info("Starting main processing loop...")

        async for topic, key, value in self.consumer.consume():
            if not running:
                break

            await self.process_event(topic, key, value)

        logger.info("Processing loop ended")


async def main():
    """Main entry point."""
    global running

    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    processor = UsageProcessor()

    try:
        await processor.start()
        await processor.run()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise
    finally:
        await processor.stop()


if __name__ == "__main__":
    asyncio.run(main())
