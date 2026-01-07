"""Apple Music-specific normalizer for usage data."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from .base import BaseNormalizer

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'shared'))
from shared.schemas import NormalizedUsageEvent, UsageType


class AppleMusicNormalizer(BaseNormalizer):
    """Normalizer for Apple Music streaming data."""

    @property
    def source_name(self) -> str:
        return "apple_music"

    def normalize(self, raw_data: dict[str, Any]) -> NormalizedUsageEvent:
        """
        Normalize Apple Music streaming report data.

        Apple Music reports typically include:
        - song_name / content_name: Song title
        - artist_name: Artist name
        - container_name: Album name
        - apple_identifier / isrc: ISRC code
        - play_count: Number of plays
        - storefront: Territory
        - begin_date / end_date: Reporting period
        - royalty_amount: Revenue
        """
        # Extract content identification
        isrc = self._clean_isrc(
            raw_data.get("isrc") or raw_data.get("apple_identifier")
        )
        title = self._clean_string(
            raw_data.get("song_name")
            or raw_data.get("content_name")
            or raw_data.get("title")
        )
        artist = self._clean_string(
            raw_data.get("artist_name") or raw_data.get("artist")
        )
        album = self._clean_string(
            raw_data.get("container_name")
            or raw_data.get("album_name")
            or raw_data.get("album")
        )

        # Extract usage details
        play_count = int(raw_data.get("play_count") or raw_data.get("quantity") or 1)

        # Determine usage type from Apple's product type
        product_type = raw_data.get("product_type_identifier", "").lower()
        if "download" in product_type or "purchase" in product_type:
            usage_type = UsageType.DOWNLOAD
        else:
            usage_type = UsageType.STREAM

        # Revenue handling
        revenue = raw_data.get("royalty_amount") or raw_data.get("revenue_amount")
        revenue_amount = Decimal(str(revenue)) if revenue else None

        currency = raw_data.get("royalty_currency") or raw_data.get("currency", "USD")

        # Geographic & temporal
        territory = raw_data.get("storefront") or raw_data.get("territory")

        # Apple often provides begin_date for the reporting period
        usage_date = self._parse_date(
            raw_data.get("begin_date")
            or raw_data.get("usage_date")
            or raw_data.get("date")
        )

        # Reporting period
        reporting_period = raw_data.get("reporting_period")
        if not reporting_period:
            begin = raw_data.get("begin_date")
            end = raw_data.get("end_date")
            if begin and end:
                begin_date = self._parse_date(begin)
                reporting_period = begin_date.strftime("%Y_%m")
            elif usage_date:
                reporting_period = usage_date.strftime("%Y_%m")

        return NormalizedUsageEvent(
            event_id=self._generate_event_id(),
            source=self.source_name,
            source_event_id=raw_data.get("vendor_identifier") or raw_data.get("source_event_id"),
            isrc=isrc,
            iswc=raw_data.get("iswc"),
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
