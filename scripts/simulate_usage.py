#!/usr/bin/env python3
"""
Usage Simulation Script

Generates test usage data and publishes to Kafka for end-to-end pipeline testing.

Usage:
    python scripts/simulate_usage.py --count 100 --source spotify
    python scripts/simulate_usage.py --count 50 --source apple_music --include-unmatchable
    python scripts/simulate_usage.py --count 200 --mixed

Environment variables:
    KAFKA_BROKERS: Kafka broker addresses (default: localhost:9092)
    DATABASE_URL: Database connection string for fetching existing works
"""

import argparse
import asyncio
import json
import logging
import os
import random
import sys
from datetime import datetime, timedelta
from uuid import uuid4

try:
    import asyncpg
    from aiokafka import AIOKafkaProducer
except ImportError:
    print("Required dependencies not installed.")
    print("Run: pip install aiokafka asyncpg")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://musicpub:musicpub_dev@localhost:5432/musicpub"
)

# Topic mapping
TOPIC_MAP = {
    "spotify": "usage.raw.spotify",
    "apple_music": "usage.raw.apple_music",
    "radio": "usage.raw.radio",
    "generic": "usage.raw.generic",
}

# Sample data for generating unmatchable events
FAKE_TITLES = [
    "Unknown Song Title XYZ",
    "Mystery Track 2024",
    "Untitled Demo #42",
    "Lost Recording Alpha",
    "Missing Metadata Test",
    "Corrupted Data Entry",
    "Placeholder Song Name",
]

FAKE_ARTISTS = [
    "Unknown Artist",
    "Various Artists",
    "Test Performer",
    "Demo Singer",
    "Placeholder Band",
    "Anonymous Musician",
]

TERRITORIES = ["US", "GB", "DE", "FR", "JP", "AU", "CA", "BR", "MX", "ES"]
USAGE_TYPES = ["stream", "download", "radio_play"]


async def fetch_existing_works(pool: asyncpg.Pool) -> list[dict]:
    """Fetch existing works and recordings from the database."""
    query = """
        SELECT
            w.id as work_id,
            w.title,
            w.iswc,
            r.id as recording_id,
            r.isrc,
            r.title as recording_title,
            r.artist_name
        FROM works w
        LEFT JOIN recordings r ON r.work_id = w.id
        ORDER BY RANDOM()
        LIMIT 100
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]


def generate_matchable_event(work: dict, source: str) -> dict:
    """Generate an event that should match to an existing work."""
    usage_date = datetime.now() - timedelta(days=random.randint(1, 90))

    # Use real ISRC if available (high confidence match)
    isrc = work.get("isrc")

    # Sometimes add slight variations to test fuzzy matching
    title = work.get("recording_title") or work.get("title")
    artist = work.get("artist_name") or "Various Artists"

    if random.random() < 0.3:  # 30% chance of slight variation
        variations = [
            lambda t: t.lower(),
            lambda t: t.upper(),
            lambda t: t + " ",
            lambda t: " " + t,
            lambda t: t.replace("the ", "The "),
        ]
        title = random.choice(variations)(title)

    return {
        "source": source,
        "source_event_id": str(uuid4()),
        "isrc": isrc,
        "reported_title": title,
        "reported_artist": artist,
        "reported_album": None,
        "usage_type": random.choice(USAGE_TYPES),
        "play_count": random.randint(1, 10000),
        "revenue_amount": round(random.uniform(0.0001, 0.01), 6),
        "currency": "USD",
        "territory": random.choice(TERRITORIES),
        "usage_date": usage_date.strftime("%Y-%m-%d"),
        "reporting_period": usage_date.strftime("%Y_%m"),
        "ingested_at": datetime.utcnow().isoformat(),
    }


def generate_unmatchable_event(source: str) -> dict:
    """Generate an event that should NOT match any existing work."""
    usage_date = datetime.now() - timedelta(days=random.randint(1, 90))

    # Generate a fake/invalid ISRC or none
    fake_isrc = None
    if random.random() < 0.3:  # 30% chance of fake ISRC
        fake_isrc = f"XX{''.join(random.choices('0123456789', k=10))}"

    return {
        "source": source,
        "source_event_id": str(uuid4()),
        "isrc": fake_isrc,
        "reported_title": random.choice(FAKE_TITLES) + f" #{random.randint(1, 999)}",
        "reported_artist": random.choice(FAKE_ARTISTS),
        "reported_album": f"Fake Album {random.randint(1, 100)}",
        "usage_type": random.choice(USAGE_TYPES),
        "play_count": random.randint(1, 1000),
        "revenue_amount": round(random.uniform(0.0001, 0.005), 6),
        "currency": "USD",
        "territory": random.choice(TERRITORIES),
        "usage_date": usage_date.strftime("%Y-%m-%d"),
        "reporting_period": usage_date.strftime("%Y_%m"),
        "ingested_at": datetime.utcnow().isoformat(),
    }


async def publish_events(events: list[dict], topic: str) -> int:
    """Publish events to Kafka."""
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BROKERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
    )

    await producer.start()
    published = 0

    try:
        for event in events:
            key = event.get("isrc") or event.get("source_event_id")
            await producer.send_and_wait(topic, value=event, key=key)
            published += 1

            if published % 10 == 0:
                logger.info(f"Published {published}/{len(events)} events to {topic}")
    finally:
        await producer.stop()

    return published


async def main():
    parser = argparse.ArgumentParser(
        description="Generate and publish test usage events to Kafka"
    )
    parser.add_argument(
        "--count", "-c",
        type=int,
        default=50,
        help="Number of events to generate (default: 50)"
    )
    parser.add_argument(
        "--source", "-s",
        type=str,
        default="spotify",
        choices=["spotify", "apple_music", "radio", "generic"],
        help="Usage source (default: spotify)"
    )
    parser.add_argument(
        "--include-unmatchable",
        action="store_true",
        help="Include events that won't match any existing works"
    )
    parser.add_argument(
        "--unmatchable-ratio",
        type=float,
        default=0.2,
        help="Ratio of unmatchable events when --include-unmatchable is set (default: 0.2)"
    )
    parser.add_argument(
        "--mixed",
        action="store_true",
        help="Use mixed sources (spotify, apple_music, radio)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print events without publishing to Kafka"
    )

    args = parser.parse_args()

    logger.info(f"Connecting to database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")

    # Connect to database and fetch existing works
    try:
        pool = await asyncpg.create_pool(DATABASE_URL)
        works = await fetch_existing_works(pool)
        await pool.close()

        if not works:
            logger.warning("No works found in database. All events will be unmatchable.")
            works = []
    except Exception as e:
        logger.warning(f"Could not connect to database: {e}")
        logger.info("Generating unmatchable events only.")
        works = []

    # Determine sources to use
    if args.mixed:
        sources = ["spotify", "apple_music", "radio"]
    else:
        sources = [args.source]

    # Generate events
    events_by_topic: dict[str, list[dict]] = {topic: [] for topic in TOPIC_MAP.values()}

    for i in range(args.count):
        source = random.choice(sources)
        topic = TOPIC_MAP[source]

        # Decide if this event should be matchable or not
        should_match = (
            works and
            not args.include_unmatchable or
            (args.include_unmatchable and random.random() > args.unmatchable_ratio)
        )

        if should_match and works:
            work = random.choice(works)
            event = generate_matchable_event(work, source)
        else:
            event = generate_unmatchable_event(source)

        events_by_topic[topic].append(event)

    # Summary
    total_events = sum(len(e) for e in events_by_topic.values())
    logger.info(f"Generated {total_events} events across {len([t for t, e in events_by_topic.items() if e])} topics")

    for topic, events in events_by_topic.items():
        if events:
            logger.info(f"  {topic}: {len(events)} events")

    if args.dry_run:
        logger.info("DRY RUN - Printing first 5 events:")
        sample_events = []
        for events in events_by_topic.values():
            sample_events.extend(events[:5])
        for event in sample_events[:5]:
            print(json.dumps(event, indent=2))
        return

    # Publish to Kafka
    logger.info(f"Publishing to Kafka at {KAFKA_BROKERS}...")

    total_published = 0
    for topic, events in events_by_topic.items():
        if not events:
            continue
        try:
            published = await publish_events(events, topic)
            total_published += published
            logger.info(f"Published {published} events to {topic}")
        except Exception as e:
            logger.error(f"Failed to publish to {topic}: {e}")

    logger.info(f"Done! Published {total_published} events total.")
    logger.info("Check Kafka UI at http://localhost:8080 to verify messages.")
    logger.info("Watch worker logs: docker-compose logs -f usage-processor matching-worker")


if __name__ == "__main__":
    asyncio.run(main())
