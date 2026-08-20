"""
Unit tests for WeatherAIClient.

Every test mocks the upstream HTTP call via respx — no real network,
no quota consumption, deterministic assertions.
"""
from __future__ import annotations

import httpx
import pytest
import respx

from app.client import WeatherAIClient
from app.config import Settings
from app.errors import (
    WeatherAIAuthError,
    WeatherAIBadRequestError,
    WeatherAIForbiddenError,
    WeatherAIMalformedResponseError,
    WeatherAIRateLimitError,
    WeatherAIServerError,
    WeatherAITimeoutError,
    WeatherAIUnavailableError,
)

BASE = "https://api.weather-ai.co"
WEATHER_URL = f"{BASE}/v1/weather"

VALID_RESPONSE = {
    "lat": -1.29,
    "lon": 36.82,
    "units": "metric",
    "days": 1,
    "current": {
        "time": "2026-08-19T12:00",
        "interval": 900,
        "temperature": 22.0,
        "windspeed": 12.0,
        "winddirection": 137,
        "weathercode": 2,
        "is_day": 1,
    },
    "daily": [
        {"date": "2026-08-19", "temp_max": 24.0, "temp_min": 15.0, "precipitation": 1.2, "weathercode": 51}
    ],
    "hourly": [
        {"time": "2026-08-19T00:00", "temp": 16.0, "precipitation": 0.1, "weathercode": 51}
    ],
}


def _settings(key: str = "wai_test_key_123") -> Settings:
    return Settings(
        weatherai_api_key=key,
        weatherai_base_url=BASE,
        weatherai_timeout=5.0,
        weatherai_max_retries=3,
    )


def _client(key: str = "wai_test_key_123") -> WeatherAIClient:
    return WeatherAIClient(settings=_settings(key))


# ── Happy path ─────────────────────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_happy_path_returns_data():
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=VALID_RESPONSE)
    )
    client = _client()
    result = await client.get_weather(lat=-1.29, lon=36.82)
    assert result.data["lat"] == -1.29
    assert result.data["current"]["temperature"] == 22.0


@respx.mock
@pytest.mark.asyncio
async def test_auth_header_is_sent():
    route = respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=VALID_RESPONSE)
    )
    await _client().get_weather(lat=0, lon=0)
    assert route.calls[0].request.headers["authorization"] == "Bearer wai_test_key_123"


@respx.mock
@pytest.mark.asyncio
async def test_query_params_are_forwarded():
    route = respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=VALID_RESPONSE)
    )
    await _client().get_weather(lat=-1.29, lon=36.82, days=3, ai=True, units="imperial")
    url = route.calls[0].request.url
    assert "lat=-1.29" in str(url)
    assert "lon=36.82" in str(url)
    assert "days=3" in str(url)
    assert "ai=true" in str(url).lower()
    assert "units=imperial" in str(url)


@respx.mock
@pytest.mark.asyncio
async def test_rate_limit_headers_are_extracted():
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(
            200,
            json=VALID_RESPONSE,
            headers={
                "X-RateLimit-Limit": "1000",
                "X-RateLimit-Remaining": "987",
                "X-RateLimit-Reset": "1717977600",
            },
        )
    )
    result = await _client().get_weather(lat=0, lon=0)
    assert result.rate_limit.limit == 1000
    assert result.rate_limit.remaining == 987
    assert result.rate_limit.reset_epoch == 1717977600


# ── 401 Authentication ─────────────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_401_raises_auth_error():
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(401, text="Unauthorized"))
    with pytest.raises(WeatherAIAuthError) as exc_info:
        await _client().get_weather(lat=0, lon=0)
    assert exc_info.value.status_code == 401


# ── 403 Plan restriction ──────────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_403_raises_forbidden_error():
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(403, text="Feature not available on Free plan")
    )
    with pytest.raises(WeatherAIForbiddenError) as exc_info:
        await _client().get_weather(lat=0, lon=0)
    assert exc_info.value.status_code == 403


# ── 400 Bad request ────────────────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_400_raises_bad_request_error():
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(400, text="Missing required parameter: lat")
    )
    with pytest.raises(WeatherAIBadRequestError) as exc_info:
        await _client().get_weather(lat=0, lon=0)
    assert exc_info.value.status_code == 400


# ── 429 Rate limit ─────────────────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_429_raises_rate_limit_error_with_reset():
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(
            429,
            text="Too Many Requests",
            headers={"X-RateLimit-Reset": "1717977600", "X-RateLimit-Remaining": "0"},
        )
    )
    with pytest.raises(WeatherAIRateLimitError) as exc_info:
        await _client().get_weather(lat=0, lon=0)
    assert exc_info.value.reset_epoch == 1717977600
    assert exc_info.value.remaining == 0


# ── 500 Server error ──────────────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_500_raises_server_error():
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(500, text="Internal error"))
    with pytest.raises(WeatherAIServerError) as exc_info:
        await _client().get_weather(lat=0, lon=0)
    assert exc_info.value.status_code == 500


# ── 503 Service unavailable ───────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_503_raises_unavailable_error():
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(503, text="Database unreachable"))
    with pytest.raises(WeatherAIUnavailableError) as exc_info:
        await _client().get_weather(lat=0, lon=0)
    assert exc_info.value.status_code == 503


# ── Timeout ────────────────────────────────────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_timeout_raises_timeout_error():
    respx.get(WEATHER_URL).mock(side_effect=httpx.ReadTimeout("timed out"))
    with pytest.raises(WeatherAITimeoutError):
        await _client().get_weather(lat=0, lon=0)


@respx.mock
@pytest.mark.asyncio
async def test_network_error_raises_unavailable():
    respx.get(WEATHER_URL).mock(side_effect=httpx.ConnectError("connection refused"))
    with pytest.raises(WeatherAIUnavailableError):
        await _client().get_weather(lat=0, lon=0)


# ── Malformed response (200 but not JSON) ──────────────────────────

@respx.mock
@pytest.mark.asyncio
async def test_200_with_non_json_body_raises_malformed():
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, text="<html>not json</html>")
    )
    with pytest.raises(WeatherAIMalformedResponseError):
        await _client().get_weather(lat=0, lon=0)


@respx.mock
@pytest.mark.asyncio
async def test_200_with_json_array_raises_malformed():
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=[1, 2, 3])
    )
    with pytest.raises(WeatherAIMalformedResponseError):
        await _client().get_weather(lat=0, lon=0)


# ── Config validation ─────────────────────────────────────────────

def test_missing_api_key_raises_runtime_error():
    with pytest.raises(RuntimeError, match="WEATHERAI_API_KEY is not set"):
        _client(key="")


def test_invalid_key_prefix_raises_validation_error():
    with pytest.raises(Exception, match="wai_"):
        _settings(key="bad_prefix_key")
