"""Base normalizer class for DSP usage data."""

import uuid
from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Any

import sys
import os

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'shared'))

from shared.schemas import NormalizedUsageEvent, RawUsageEvent, UsageType


class BaseNormalizer(ABC):
    """Abstract base class for DSP-specific normalizers."""

    @property
    @abstractmethod
    def source_name(self) -> str:
        """The name of the source this normalizer handles."""
        pass

    @abstractmethod
    def normalize(self, raw_data: dict[str, Any]) -> NormalizedUsageEvent:
        """
        Normalize raw DSP data into a standard format.

        Args:
            raw_data: Raw data from the DSP

        Returns:
            Normalized usage event
        """
        pass

    def normalize_batch(
        self, raw_events: list[dict[str, Any]]
    ) -> list[NormalizedUsageEvent]:
        """
        Normalize a batch of raw events.

        Args:
            raw_events: List of raw events from the DSP

        Returns:
            List of normalized events
        """
        return [self.normalize(event) for event in raw_events]

    def _parse_usage_type(self, raw_type: str | None) -> UsageType:
        """Parse raw usage type string into enum."""
        if not raw_type:
            return UsageType.STREAM

        type_mapping = {
            "stream": UsageType.STREAM,
            "streaming": UsageType.STREAM,
            "play": UsageType.STREAM,
            "download": UsageType.DOWNLOAD,
            "purchase": UsageType.DOWNLOAD,
            "radio": UsageType.RADIO_PLAY,
            "radio_play": UsageType.RADIO_PLAY,
            "broadcast": UsageType.TV_BROADCAST,
            "tv": UsageType.TV_BROADCAST,
            "tv_broadcast": UsageType.TV_BROADCAST,
            "performance": UsageType.PUBLIC_PERFORMANCE,
            "public_performance": UsageType.PUBLIC_PERFORMANCE,
            "sync": UsageType.SYNC,
            "synchronization": UsageType.SYNC,
            "mechanical": UsageType.MECHANICAL,
        }

        return type_mapping.get(raw_type.lower(), UsageType.STREAM)

    def _parse_date(self, date_str: str | None, default: date | None = None) -> date:
        """Parse date string into date object."""
        if not date_str:
            return default or date.today()

        # Try common date formats
        formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y%m%d",
            "%m/%d/%Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return default or date.today()

    def _clean_isrc(self, isrc: str | None) -> str | None:
        """Clean and validate ISRC format."""
        if not isrc:
            return None

        # Remove spaces, dashes, and convert to uppercase
        cleaned = isrc.replace(" ", "").replace("-", "").upper()

        # ISRC should be 12 characters
        if len(cleaned) == 12:
            return cleaned

        return None

    def _clean_string(self, value: str | None) -> str | None:
        """Clean string value."""
        if not value:
            return None

        cleaned = value.strip()
        return cleaned if cleaned else None

    def _generate_event_id(self) -> uuid.UUID:
        """Generate a new event ID."""
        return uuid.uuid4()
