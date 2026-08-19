"""
Tests for the retry wrapper.

Verifies exact retry counts, that non-retryable errors propagate
immediately, and that backoff delays are attempted (mocked so tests
are instant).
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.errors import (
    WeatherAIAuthError,
    WeatherAIBadRequestError,
    WeatherAIRateLimitError,
    WeatherAIServerError,
    WeatherAITimeoutError,
    WeatherAIUnavailableError,
)
from app.retry import with_retry


@pytest.mark.asyncio
@patch("app.retry.asyncio.sleep", new_callable=AsyncMock)
async def test_500_retried_then_succeeds(mock_sleep: AsyncMock):
    call_count = 0

    async def flaky():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise WeatherAIServerError("500", status_code=500)
        return "ok"

    result = await with_retry(flaky, max_attempts=3)
    assert result == "ok"
    assert call_count == 3
    assert mock_sleep.call_count == 2


@pytest.mark.asyncio
@patch("app.retry.asyncio.sleep", new_callable=AsyncMock)
async def test_500_exhausts_retries_raises(mock_sleep: AsyncMock):
    call_count = 0

    async def always_500():
        nonlocal call_count
        call_count += 1
        raise WeatherAIServerError("500", status_code=500)

    with pytest.raises(WeatherAIServerError):
        await with_retry(always_500, max_attempts=3)

    assert call_count == 3
    assert mock_sleep.call_count == 2


@pytest.mark.asyncio
@patch("app.retry.asyncio.sleep", new_callable=AsyncMock)
async def test_503_is_retried(mock_sleep: AsyncMock):
    call_count = 0

    async def unavailable_then_ok():
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise WeatherAIUnavailableError("503", status_code=503)
        return "recovered"

    result = await with_retry(unavailable_then_ok, max_attempts=3)
    assert result == "recovered"
    assert call_count == 2


@pytest.mark.asyncio
async def test_401_not_retried():
    call_count = 0

    async def auth_fail():
        nonlocal call_count
        call_count += 1
        raise WeatherAIAuthError("401", status_code=401)

    with pytest.raises(WeatherAIAuthError):
        await with_retry(auth_fail, max_attempts=3)

    assert call_count == 1


@pytest.mark.asyncio
async def test_400_not_retried():
    call_count = 0

    async def bad_request():
        nonlocal call_count
        call_count += 1
        raise WeatherAIBadRequestError("400", status_code=400)

    with pytest.raises(WeatherAIBadRequestError):
        await with_retry(bad_request, max_attempts=3)

    assert call_count == 1


@pytest.mark.asyncio
async def test_429_not_retried():
    call_count = 0

    async def rate_limited():
        nonlocal call_count
        call_count += 1
        raise WeatherAIRateLimitError("429", reset_epoch=1717977600)

    with pytest.raises(WeatherAIRateLimitError):
        await with_retry(rate_limited, max_attempts=3)

    assert call_count == 1


@pytest.mark.asyncio
async def test_timeout_not_retried():
    call_count = 0

    async def timed_out():
        nonlocal call_count
        call_count += 1
        raise WeatherAITimeoutError("timeout")

    with pytest.raises(WeatherAITimeoutError):
        await with_retry(timed_out, max_attempts=3)

    assert call_count == 1


@pytest.mark.asyncio
@patch("app.retry.asyncio.sleep", new_callable=AsyncMock)
async def test_backoff_delays_increase(mock_sleep: AsyncMock):
    async def always_fail():
        raise WeatherAIServerError("500", status_code=500)

    with pytest.raises(WeatherAIServerError):
        await with_retry(always_fail, max_attempts=3, backoff_base=0.2)

    delays = [call.args[0] for call in mock_sleep.call_args_list]
    assert delays == pytest.approx([0.2, 0.8])
