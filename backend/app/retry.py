"""
Retry wrapper for upstream WeatherAI calls.

Composed around the client — not embedded inside it.

Policy:
  - Retry on 500, 503 (transient server errors) with exponential backoff.
  - Do NOT retry on 400, 401, 403 (client/config errors — retrying won't help).
  - Do NOT retry on 429 (quota exhausted — retrying burns nothing, wait for reset).
  - Do NOT retry on timeout by default (already waited once; caller decides).
"""
from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.errors import (
    WeatherAIServerError,
    WeatherAIUnavailableError,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")

RETRYABLE = (WeatherAIServerError, WeatherAIUnavailableError)
BACKOFF_BASE_SECONDS = 0.2


async def with_retry(
    fn: Callable[[], Awaitable[T]],
    *,
    max_attempts: int = 3,
    backoff_base: float = BACKOFF_BASE_SECONDS,
) -> T:
    """
    Call *fn* up to *max_attempts* times, retrying only on retryable errors.

    Backoff schedule: 0.2s, 0.8s, 2.0s (base * 4^attempt).
    """
    last_error: Exception | None = None

    for attempt in range(max_attempts):
        try:
            return await fn()
        except RETRYABLE as exc:
            last_error = exc
            if attempt < max_attempts - 1:
                delay = backoff_base * (4 ** attempt)
                logger.warning(
                    "Upstream %s on attempt %d/%d, retrying in %.1fs",
                    type(exc).__name__,
                    attempt + 1,
                    max_attempts,
                    delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "Upstream %s on final attempt %d/%d, giving up",
                    type(exc).__name__,
                    attempt + 1,
                    max_attempts,
                )

    raise last_error  # type: ignore[misc]
