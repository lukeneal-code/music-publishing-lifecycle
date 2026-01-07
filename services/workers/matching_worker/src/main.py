import asyncio
import logging
import os
import signal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "kafka:29092")

running = True


def signal_handler(sig, frame):
    global running
    logger.info("Shutdown signal received")
    running = False


async def main():
    logger.info("Matching Worker starting...")
    logger.info(f"Kafka brokers: {KAFKA_BROKERS}")

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Placeholder - will be replaced with actual Kafka consumer and LangGraph agent
    while running:
        logger.info("Matching worker running... (waiting for implementation)")
        await asyncio.sleep(30)

    logger.info("Matching Worker stopped")


if __name__ == "__main__":
    asyncio.run(main())
