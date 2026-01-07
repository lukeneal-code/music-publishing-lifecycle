"""Generic normalizer for usage data from various sources."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from .base import BaseNormalizer

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'shared'))
from shared.schemas import NormalizedUsageEvent, UsageType


class GenericNormalizer(BaseNormalizer):
    """
    Generic normalizer for usage data from various sources.

    This normalizer handles common field names and can be used as a fallback
    for DSPs without specific normalizers.
    """

    @property
    def source_name(self) -> str:
        return "generic"

    def normalize(self, raw_data: dict[str, Any]) -> NormalizedUsageEvent:
        """
        Normalize generic usage data.

        Attempts to extract data from common field names:
        - title, track_name, song_name, name
        - artist, artist_name, performer
        - album, album_name, release_name
        - isrc
        - plays, play_count, streams, quantity
        - revenue, amount, earnings, royalty
        - country, territory, region
        - date, usage_date, period_date
        """
        # Extract content identification - try multiple common field names
        isrc = self._clean_isrc(
            raw_data.get("isrc")
            or raw_data.get("ISRC")
            or raw_data.get("recording_code")
        )

        title = self._clean_string(
            raw_data.get("title")
            or raw_data.get("track_name")
            or raw_data.get("song_name")
            or raw_data.get("name")
            or raw_data.get("track_title")
            or raw_data.get("reported_title")
        )

        artist = self._clean_string(
            raw_data.get("artist")
            or raw_data.get("artist_name")
            or raw_data.get("performer")
            or raw_data.get("main_artist")
            or raw_data.get("reported_artist")
        )

        album = self._clean_string(
            raw_data.get("album")
            or raw_data.get("album_name")
            or raw_data.get("release_name")
            or raw_data.get("album_title")
            or raw_data.get("reported_album")
        )

        # Extract usage details
        play_count = self._extract_play_count(raw_data)

        # Usage type
        raw_type = (
            raw_data.get("usage_type")
            or raw_data.get("type")
            or raw_data.get("transaction_type")
        )
        usage_type = self._parse_usage_type(raw_type)

        # Revenue handling
        revenue = self._extract_revenue(raw_data)
        revenue_amount = Decimal(str(revenue)) if revenue else None

        currency = (
            raw_data.get("currency")
            or raw_data.get("currency_code")
            or raw_data.get("royalty_currency")
            or "USD"
        )

        # Geographic & temporal
        territory = (
            raw_data.get("country")
            or raw_data.get("territory")
            or raw_data.get("region")
            or raw_data.get("country_code")
        )

        usage_date = self._parse_date(
            raw_data.get("date")
            or raw_data.get("usage_date")
            or raw_data.get("period_date")
            or raw_data.get("transaction_date")
        )

        reporting_period = (
            raw_data.get("reporting_period")
            or raw_data.get("period")
            or raw_data.get("period_code")
        )
        if not reporting_period and usage_date:
            reporting_period = usage_date.strftime("%Y_%m")

        # Source event ID
        source_event_id = (
            raw_data.get("source_event_id")
            or raw_data.get("event_id")
            or raw_data.get("transaction_id")
            or raw_data.get("id")
        )

        # Get actual source from data or use generic
        actual_source = raw_data.get("source", self.source_name)

        return NormalizedUsageEvent(
            event_id=self._generate_event_id(),
            source=actual_source,
            source_event_id=str(source_event_id) if source_event_id else None,
            isrc=isrc,
            iswc=raw_data.get("iswc") or raw_data.get("ISWC"),
            reported_title=title,
            reported_artist=artist,
            reported_album=album,
            usage_type=usage_type,
            play_count=play_count,
            revenue_amount=revenue_amount,
            currency=currency,
            territory=territory[:5] if territory else None,
            usage_date=usage_date,
            reporting_period=reporting_period,
            ingested_at=datetime.utcnow(),
            content_embedding=None,
        )

    def _extract_play_count(self, raw_data: dict[str, Any]) -> int:
        """Extract play count from various field names."""
        count_fields = [
            "plays",
            "play_count",
            "streams",
            "quantity",
            "units",
            "count",
            "total_plays",
            "stream_count",
        ]

        for field in count_fields:
            value = raw_data.get(field)
            if value is not None:
                try:
                    return int(value)
                except (ValueError, TypeError):
                    continue

        return 1

    def _extract_revenue(self, raw_data: dict[str, Any]) -> float | None:
        """Extract revenue from various field names."""
        revenue_fields = [
            "revenue",
            "revenue_amount",
            "amount",
            "earnings",
            "royalty",
            "royalty_amount",
            "net_revenue",
            "gross_revenue",
            "payment",
        ]

        for field in revenue_fields:
            value = raw_data.get(field)
            if value is not None:
                try:
                    return float(value)
                except (ValueError, TypeError):
                    continue

        return None
