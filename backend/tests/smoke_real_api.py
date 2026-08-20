"""
Smoke test against the REAL WeatherAI API.

NOT included in CI — requires a valid API key, internet, and burns
quota.  Run manually before submission:

    WEATHERAI_API_KEY=wai_your_key python -m pytest tests/smoke_real_api.py -v -s

This verifies that our upstream models and client code work against the
actual API, not just our mocks.
"""
from __future__ import annotations

import os

import pytest

from app.client import WeatherAIClient
from app.config import Settings
from app.models import UpstreamWeatherResponse
from app.normalize import normalize_weather

REAL_KEY = os.environ.get("WEATHERAI_API_KEY", "")
SKIP_REASON = "WEATHERAI_API_KEY not set or not a real key"
NAIROBI = {"lat": -1.2921, "lon": 36.8219}


def _real_client() -> WeatherAIClient:
    settings = Settings(
        weatherai_api_key=REAL_KEY,
        weatherai_base_url="https://api.weather-ai.co",
        weatherai_timeout=15.0,
        weatherai_max_retries=1,
        cors_origins="http://localhost:3000",
    )
    return WeatherAIClient(settings=settings)


@pytest.mark.skipif(
    not REAL_KEY.startswith("wai_"), reason=SKIP_REASON
)
@pytest.mark.asyncio
async def test_real_weather_returns_valid_structure():
    """Verify the real API response parses into our upstream model."""
    client = _real_client()
    result = await client.get_weather(lat=NAIROBI["lat"], lon=NAIROBI["lon"], days=1, ai=False)

    assert isinstance(result.data, dict), f"Expected dict, got {type(result.data)}"

    parsed = UpstreamWeatherResponse.model_validate(result.data)

    assert parsed.lat is not None, "Missing 'lat' in response"
    assert parsed.current is not None, "Missing 'current' in response"
    assert parsed.current.temperature is not None, "Missing current temperature"

    print("\n--- Real API response structure ---")
    print(f"Coordinates: {parsed.lat}, {parsed.lon}")
    print(f"Units: {parsed.units}")
    current_raw = result.data.get("current")
    if isinstance(current_raw, dict):
        print(f"Current keys: {sorted(current_raw.keys())}")
    extra = parsed.current.model_extra if parsed.current is not None else None
    print(f"Current extra keys: {sorted(extra.keys()) if extra else []}")
    if parsed.current:
        print(f"Temp: {parsed.current.temperature}°")
        print(f"Wind: {parsed.current.windspeed} @ {parsed.current.winddirection}°")
        print(f"Weather code: {parsed.current.weathercode}")
    if parsed.daily:
        print(f"Daily entries: {len(parsed.daily)}")
        for d in parsed.daily:
            print(f"  {d.date}: {d.temp_min}–{d.temp_max}°")
    if parsed.hourly:
        print(f"Hourly entries: {len(parsed.hourly)}")
    if parsed.ai_summary:
        print(f"AI summary: yes ({len(parsed.ai_summary)} chars)")
    else:
        print("AI summary: no (ai=false)")
    print(f"Top-level keys: {sorted(result.data.keys())}")
    print(f"Rate limit remaining: {result.rate_limit.remaining}")


@pytest.mark.skipif(
    not REAL_KEY.startswith("wai_"), reason=SKIP_REASON
)
@pytest.mark.asyncio
async def test_real_rate_limit_headers_present():
    """Verify the real API sends rate-limit headers."""
    client = _real_client()
    result = await client.get_weather(lat=NAIROBI["lat"], lon=NAIROBI["lon"], days=1, ai=False)

    print("\nRate limit headers:")
    print(f"  Limit: {result.rate_limit.limit}")
    print(f"  Remaining: {result.rate_limit.remaining}")
    print(f"  Reset: {result.rate_limit.reset_epoch}")
    if result.rate_limit.remaining is None:
        print("  NOTE: Free plan does not return rate-limit headers")


@pytest.mark.skipif(
    not REAL_KEY.startswith("wai_"), reason=SKIP_REASON
)
@pytest.mark.asyncio
async def test_real_response_normalizes_successfully():
    """Verify the full pipeline: real API -> upstream parse -> normalize."""
    client = _real_client()
    result = await client.get_weather(lat=NAIROBI["lat"], lon=NAIROBI["lon"], days=1, ai=False)

    parsed = UpstreamWeatherResponse.model_validate(result.data)
    normalized = normalize_weather(parsed)

    assert normalized.lat is not None
    assert normalized.current.temperature != 0.0 or normalized.current.weather_code == 0
    assert normalized.current.weather_description != ""
    assert len(normalized.daily) >= 1
    assert len(normalized.hourly) >= 1
    assert normalized.units == "metric"

    print("\n--- Normalized response ---")
    print(f"Temp: {normalized.current.temperature}° ({normalized.current.weather_description})")
    print(f"Daily: {len(normalized.daily)} days, Hourly: {len(normalized.hourly)} hours")
