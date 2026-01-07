"""Kafka producer and consumer utilities for worker services."""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, AsyncIterator, Callable

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from aiokafka.errors import KafkaError

logger = logging.getLogger(__name__)


@dataclass
class Topics:
    """Kafka topic names for the usage pipeline."""

    # Raw ingestion topics (from DSPs)
    RAW_SPOTIFY = "usage.raw.spotify"
    RAW_APPLE_MUSIC = "usage.raw.apple_music"
    RAW_RADIO = "usage.raw.radio"
    RAW_GENERIC = "usage.raw.generic"

    # Processing topics
    NORMALIZED = "usage.normalized"
    MATCHED = "usage.matched"
    UNMATCHED = "usage.unmatched"

    # Dead letter queues
    DLQ_PROCESSING = "dlq.usage.processing"
    DLQ_MATCHING = "dlq.matching"

    @classmethod
    def raw_topics(cls) -> list[str]:
        """Get all raw ingestion topics."""
        return [
            cls.RAW_SPOTIFY,
            cls.RAW_APPLE_MUSIC,
            cls.RAW_RADIO,
            cls.RAW_GENERIC,
        ]

    @classmethod
    def source_from_topic(cls, topic: str) -> str:
        """Extract the source name from a raw topic."""
        mapping = {
            cls.RAW_SPOTIFY: "spotify",
            cls.RAW_APPLE_MUSIC: "apple_music",
            cls.RAW_RADIO: "radio",
            cls.RAW_GENERIC: "generic",
        }
        return mapping.get(topic, "unknown")


class KafkaProducerClient:
    """Async Kafka producer with JSON serialization."""

    def __init__(self, bootstrap_servers: str):
        self.bootstrap_servers = bootstrap_servers
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        """Start the producer."""
        self._producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
        )
        await self._producer.start()
        logger.info(f"Kafka producer connected to {self.bootstrap_servers}")

    async def stop(self) -> None:
        """Stop the producer."""
        if self._producer:
            await self._producer.stop()
            logger.info("Kafka producer stopped")

    async def send(
        self,
        topic: str,
        value: dict[str, Any],
        key: str | None = None,
    ) -> None:
        """Send a message to a topic."""
        if not self._producer:
            raise RuntimeError("Producer not started")

        try:
            await self._producer.send_and_wait(topic, value=value, key=key)
            logger.debug(f"Sent message to {topic}: key={key}")
        except KafkaError as e:
            logger.error(f"Failed to send message to {topic}: {e}")
            raise

    async def send_batch(
        self,
        topic: str,
        messages: list[tuple[str | None, dict[str, Any]]],
    ) -> None:
        """Send multiple messages to a topic."""
        if not self._producer:
            raise RuntimeError("Producer not started")

        for key, value in messages:
            await self._producer.send(topic, value=value, key=key)

        await self._producer.flush()
        logger.debug(f"Sent batch of {len(messages)} messages to {topic}")

    async def __aenter__(self) -> "KafkaProducerClient":
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.stop()


class KafkaConsumerClient:
    """Async Kafka consumer with JSON deserialization and error handling."""

    def __init__(
        self,
        bootstrap_servers: str,
        group_id: str,
        topics: list[str],
        auto_offset_reset: str = "earliest",
    ):
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.topics = topics
        self.auto_offset_reset = auto_offset_reset
        self._consumer: AIOKafkaConsumer | None = None
        self._running = False

    async def start(self) -> None:
        """Start the consumer."""
        self._consumer = AIOKafkaConsumer(
            *self.topics,
            bootstrap_servers=self.bootstrap_servers,
            group_id=self.group_id,
            auto_offset_reset=self.auto_offset_reset,
            enable_auto_commit=True,
        )
        await self._consumer.start()
        self._running = True
        logger.info(
            f"Kafka consumer connected to {self.bootstrap_servers}, "
            f"group={self.group_id}, topics={self.topics}"
        )

    async def stop(self) -> None:
        """Stop the consumer."""
        self._running = False
        if self._consumer:
            await self._consumer.stop()
            logger.info("Kafka consumer stopped")

    async def consume(self) -> AsyncIterator[tuple[str, str | None, dict[str, Any]]]:
        """
        Consume messages from subscribed topics.

        Yields:
            Tuple of (topic, key, value)
        """
        if not self._consumer:
            raise RuntimeError("Consumer not started")

        while self._running:
            try:
                msg = await asyncio.wait_for(
                    self._consumer.getone(),
                    timeout=1.0,
                )
                key = msg.key.decode("utf-8") if msg.key else None

                # Deserialize JSON with error handling
                try:
                    value = json.loads(msg.value.decode("utf-8"))
                except json.JSONDecodeError as e:
                    logger.warning(
                        f"Skipping malformed JSON message from {msg.topic}: {e}. "
                        f"Raw: {msg.value[:200] if msg.value else 'empty'}"
                    )
                    continue

                yield msg.topic, key, value
            except asyncio.TimeoutError:
                continue
            except KafkaError as e:
                logger.error(f"Kafka consumer error: {e}")
                await asyncio.sleep(1)

    async def consume_with_handler(
        self,
        handler: Callable[[str, str | None, dict[str, Any]], Any],
        error_handler: Callable[[Exception, str, dict[str, Any]], Any] | None = None,
    ) -> None:
        """
        Consume messages and process them with a handler function.

        Args:
            handler: Async function to process (topic, key, value)
            error_handler: Optional handler for processing errors
        """
        async for topic, key, value in self.consume():
            try:
                result = handler(topic, key, value)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error(f"Error processing message from {topic}: {e}")
                if error_handler:
                    try:
                        err_result = error_handler(e, topic, value)
                        if asyncio.iscoroutine(err_result):
                            await err_result
                    except Exception as handler_error:
                        logger.error(f"Error in error handler: {handler_error}")

    async def __aenter__(self) -> "KafkaConsumerClient":
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.stop()
