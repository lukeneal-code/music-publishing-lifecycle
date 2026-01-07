"""Matching Worker - Kafka consumer for matching usage events to works."""

import asyncio
import logging
import signal
import sys
import os
from datetime import datetime
from typing import Any

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'shared'))

from .config import settings
from .database import init_db
from .agents import run_matching_agent

from shared.kafka_utils import KafkaConsumerClient, KafkaProducerClient, Topics
from shared.schemas import MatchedUsageEvent, UnmatchedUsageEvent, MatchResult, MatchMethod, UsageType

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


class MatchingWorker:
    """Main worker for matching usage events to works."""

    def __init__(self):
        self.consumer: KafkaConsumerClient | None = None
        self.producer: KafkaProducerClient | None = None

    async def start(self):
        """Start the worker."""
        logger.info("Starting Matching Worker...")
        logger.info(f"Kafka brokers: {settings.kafka_brokers}")
        logger.info(f"Consumer group: {settings.kafka_consumer_group}")

        # Initialize database
        await init_db()

        # Create Kafka clients
        self.consumer = KafkaConsumerClient(
            bootstrap_servers=settings.kafka_brokers,
            group_id=settings.kafka_consumer_group,
            topics=[Topics.NORMALIZED],
        )
        self.producer = KafkaProducerClient(
            bootstrap_servers=settings.kafka_brokers,
        )

        # Start clients
        await self.consumer.start()
        await self.producer.start()

        logger.info(f"Subscribed to topic: {Topics.NORMALIZED}")

    async def stop(self):
        """Stop the worker."""
        logger.info("Stopping Matching Worker...")

        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()

        logger.info("Matching Worker stopped")

    async def process_event(
        self,
        topic: str,
        key: str | None,
        event_data: dict[str, Any],
    ) -> None:
        """
        Process a normalized usage event through the matching agent.

        Args:
            topic: Kafka topic (should be usage.normalized)
            key: Message key (event ID)
            event_data: Normalized usage event data
        """
        event_id = event_data.get("event_id", key)
        logger.info(f"Processing event: {event_id}")

        try:
            # Run the matching agent
            result = await run_matching_agent(event_data)

            # Handle the outcome
            if result["outcome"] == "matched":
                await self._publish_matched(event_data, result)
            elif result["outcome"] == "unmatched":
                await self._publish_unmatched(event_data, result)
            else:
                # Error case
                await self._send_to_dlq(event_data, result.get("error", "Unknown error"))

        except Exception as e:
            logger.error(f"Error processing event {event_id}: {e}", exc_info=True)
            await self._send_to_dlq(event_data, str(e))

    async def _publish_matched(
        self,
        event_data: dict[str, Any],
        result: dict[str, Any],
    ) -> None:
        """Publish successfully matched event."""
        if not self.producer:
            raise RuntimeError("Producer not initialized")

        matched_event = MatchedUsageEvent(
            usage_event_id=event_data["event_id"],
            source=event_data["source"],
            usage_date=event_data["usage_date"],
            territory=event_data.get("territory"),
            work_id=result["work_id"],
            recording_id=result.get("recording_id"),
            match_confidence=result["confidence"],
            match_method=result["match_method"],
            usage_type=event_data.get("usage_type", "stream"),
            play_count=event_data.get("play_count", 1),
            revenue_amount=event_data.get("revenue_amount"),
            currency=event_data.get("currency", "USD"),
            matched_at=datetime.utcnow(),
        )

        await self.producer.send(
            topic=Topics.MATCHED,
            value=matched_event.model_dump(mode="json"),
            key=str(event_data["event_id"]),
        )

        logger.info(
            f"Published matched event: {event_data['event_id']} -> "
            f"work={result['work_id']}, method={result['match_method']}, "
            f"confidence={result['confidence']:.2f}"
        )

    async def _publish_unmatched(
        self,
        event_data: dict[str, Any],
        result: dict[str, Any],
    ) -> None:
        """Publish unmatched event for manual review."""
        if not self.producer:
            raise RuntimeError("Producer not initialized")

        # Convert suggested matches to MatchResult format
        suggested_matches = [
            MatchResult(
                work_id=s["work_id"],
                recording_id=s.get("recording_id"),
                confidence=s["confidence"],
                method=s["method"],
            )
            for s in result.get("suggested_matches", [])
        ]

        unmatched_event = UnmatchedUsageEvent(
            usage_event_id=event_data["event_id"],
            source=event_data["source"],
            source_event_id=event_data.get("source_event_id"),
            isrc=event_data.get("isrc"),
            reported_title=event_data.get("reported_title"),
            reported_artist=event_data.get("reported_artist"),
            reported_album=event_data.get("reported_album"),
            usage_type=event_data.get("usage_type", "stream"),
            play_count=event_data.get("play_count", 1),
            revenue_amount=event_data.get("revenue_amount"),
            currency=event_data.get("currency", "USD"),
            territory=event_data.get("territory"),
            usage_date=event_data["usage_date"],
            suggested_matches=suggested_matches,
            reason="no_confident_match",
            queued_at=datetime.utcnow(),
        )

        await self.producer.send(
            topic=Topics.UNMATCHED,
            value=unmatched_event.model_dump(mode="json"),
            key=str(event_data["event_id"]),
        )

        logger.info(
            f"Published unmatched event: {event_data['event_id']} "
            f"(title={event_data.get('reported_title')}, "
            f"suggestions={len(suggested_matches)})"
        )

    async def _send_to_dlq(
        self,
        event_data: dict[str, Any],
        error: str,
    ) -> None:
        """Send failed event to dead letter queue."""
        if not self.producer:
            return

        dlq_event = {
            "event_data": event_data,
            "error": error,
            "failed_at": datetime.utcnow().isoformat(),
        }

        try:
            await self.producer.send(
                topic=Topics.DLQ_MATCHING,
                value=dlq_event,
                key=str(event_data.get("event_id", "")),
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

    worker = MatchingWorker()

    try:
        await worker.start()
        await worker.run()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise
    finally:
        await worker.stop()


if __name__ == "__main__":
    asyncio.run(main())
