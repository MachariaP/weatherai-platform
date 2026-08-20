"""
In-process sliding-window limiter for uncached WeatherAI calls.

Process-local: multiple uvicorn workers do not share counters.
Cache HIT paths must never call this module.
"""
from __future__ import annotations

import math
import threading
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable

from fastapi import Request

from app.config import Settings, get_settings

Clock = Callable[[], float]


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int | None


class InMemoryRateLimiter:
    """Sliding window of monotonic timestamps per identity."""

    def __init__(
        self,
        *,
        limit: int,
        window_seconds: float,
        clock: Clock,
    ) -> None:
        if limit < 1:
            raise ValueError("rate limit must be >= 1")
        if window_seconds <= 0:
            raise ValueError("rate limit window must be > 0")
        self.limit = limit
        self.window_seconds = window_seconds
        self._clock = clock
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, identity: str) -> RateLimitDecision:
        """Reserve one slot if allowed. Consumes budget before upstream."""
        with self._lock:
            now = self._clock()
            window_start = now - self.window_seconds
            recent = [ts for ts in self._hits[identity] if ts > window_start]
            if len(recent) >= self.limit:
                retry_after = int(math.ceil(recent[0] + self.window_seconds - now))
                self._hits[identity] = recent
                return RateLimitDecision(False, max(retry_after, 1))
            recent.append(now)
            self._hits[identity] = recent
            return RateLimitDecision(True, None)

    def remaining(self, identity: str) -> int:
        with self._lock:
            now = self._clock()
            window_start = now - self.window_seconds
            used = sum(1 for ts in self._hits[identity] if ts > window_start)
            return max(self.limit - used, 0)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


def client_identity(request: Request) -> str:
    """Stable-enough key for a single process. Not a user account."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        if ip:
            return f"ip:{ip[:64]}"
    if request.client and request.client.host:
        return f"ip:{request.client.host[:64]}"
    return "ip:unknown"


_limiter: InMemoryRateLimiter | None = None
_limiter_lock = threading.Lock()


def get_weather_limiter(settings: Settings | None = None) -> InMemoryRateLimiter:
    global _limiter
    with _limiter_lock:
        if _limiter is None:
            s = settings or get_settings()
            _limiter = InMemoryRateLimiter(
                limit=s.rate_limit_requests,
                window_seconds=s.rate_limit_window_seconds,
                clock=time.monotonic,
            )
        return _limiter


def reset_weather_limiter(instance: InMemoryRateLimiter | None = None) -> None:
    global _limiter
    with _limiter_lock:
        _limiter = instance
