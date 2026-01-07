"""DSP-specific normalizers for usage data."""

from .base import BaseNormalizer
from .spotify import SpotifyNormalizer
from .apple_music import AppleMusicNormalizer
from .generic import GenericNormalizer

# Registry of normalizers by source name
NORMALIZERS: dict[str, type[BaseNormalizer]] = {
    "spotify": SpotifyNormalizer,
    "apple_music": AppleMusicNormalizer,
    "generic": GenericNormalizer,
    "radio": GenericNormalizer,  # Use generic for radio initially
}


def get_normalizer(source: str) -> BaseNormalizer:
    """Get the appropriate normalizer for a source."""
    normalizer_class = NORMALIZERS.get(source, GenericNormalizer)
    return normalizer_class()


__all__ = [
    "BaseNormalizer",
    "SpotifyNormalizer",
    "AppleMusicNormalizer",
    "GenericNormalizer",
    "get_normalizer",
    "NORMALIZERS",
]
