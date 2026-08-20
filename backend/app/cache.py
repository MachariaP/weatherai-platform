"""
Cache abstraction and in-memory TTL implementation.

The interface (WeatherCache protocol) is deliberately simple so the
implementation can be swapped to Redis when horizontal scaling requires
shared cache state. The selected production topology is one FastAPI
process with one worker, so Redis is deferred — see DOCS/deployment.md.
"""
from __future__ import annotations

import time
from typing import Any, Protocol


class WeatherCache(Protocol):
    """Minimal cache interface — get/set with TTL."""

    def get(self, key: str) -> Any | None: ...
    def set(self, key: str, value: Any, ttl_seconds: float) -> None: ...


class InMemoryCache:
    """
    Dict-backed cache with per-entry TTL.

    Not thread-safe across multiple processes, but sufficient for a
    single uvicorn worker.  Expired entries are cleaned lazily on get().
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: float) -> None:
        self._store[key] = (value, time.monotonic() + ttl_seconds)

    def clear(self) -> None:
        self._store.clear()

    @property
    def size(self) -> int:
        return len(self._store)


def make_cache_key(
    *,
    lat: float,
    lon: float,
    days: int,
    units: str,
    ai: bool,
    lang: str,
) -> str:
    """
    Deterministic cache key from request parameters.

    Different parameter values MUST produce different keys because they
    affect the upstream response.  Parameter order does not matter
    because we use named arguments, not positional.
    """
    return f"weather:{lat}:{lon}:{days}:{units}:{ai}:{lang}"


DEFAULT_TTL_SECONDS: float = 300.0  # 5 minutes
