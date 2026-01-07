"""Spotify-specific normalizer for usage data."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from .base import BaseNormalizer

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'shared'))
from shared.schemas import NormalizedUsageEvent, UsageType


class SpotifyNormalizer(BaseNormalizer):
    """Normalizer for Spotify streaming data."""

    @property
    def source_name(self) -> str:
        return "spotify"

    def normalize(self, raw_data: dict[str, Any]) -> NormalizedUsageEvent:
        """
        Normalize Spotify streaming report data.

        Spotify reports typically include:
        - track_name: Song title
        - artist_name: Artist name
        - album_name: Album name
        - isrc: ISRC code
        - streams: Number of streams
        - date: Usage date
        - country: Territory code
        - earnings: Revenue amount
        """
        # Extract content identification
        isrc = self._clean_isrc(raw_data.get("isrc"))
        title = self._clean_string(
            raw_data.get("track_name") or raw_data.get("title")
        )
        artist = self._clean_string(
            raw_data.get("artist_name") or raw_data.get("artist")
        )
        album = self._clean_string(
            raw_data.get("album_name") or raw_data.get("album")
        )

        # Extract usage details
        play_count = int(raw_data.get("streams") or raw_data.get("play_count") or 1)

        # Revenue handling
        revenue = raw_data.get("earnings") or raw_data.get("revenue_amount")
        revenue_amount = Decimal(str(revenue)) if revenue else None

        currency = raw_data.get("currency", "USD")

        # Geographic & temporal
        territory = raw_data.get("country") or raw_data.get("territory")
        usage_date = self._parse_date(
            raw_data.get("date") or raw_data.get("usage_date")
        )

        # Reporting period (Spotify usually provides monthly)
        reporting_period = raw_data.get("reporting_period")
        if not reporting_period and usage_date:
            reporting_period = usage_date.strftime("%Y_%m")

        return NormalizedUsageEvent(
            event_id=self._generate_event_id(),
            source=self.source_name,
            source_event_id=raw_data.get("spotify_id") or raw_data.get("source_event_id"),
            isrc=isrc,
            iswc=raw_data.get("iswc"),
            reported_title=title,
            reported_artist=artist,
            reported_album=album,
            usage_type=UsageType.STREAM,
            play_count=play_count,
            revenue_amount=revenue_amount,
            currency=currency,
            territory=territory[:5] if territory else None,
            usage_date=usage_date,
            reporting_period=reporting_period,
            ingested_at=datetime.utcnow(),
            content_embedding=None,  # Will be populated later
        )
