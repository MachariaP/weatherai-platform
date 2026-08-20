"""Application rate limiter: unit + weather-route integration."""
from __future__ import annotations

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import app
from app.rate_limit import InMemoryRateLimiter, reset_weather_limiter

client = TestClient(app)
WEATHER_URL = "https://api.weather-ai.co/v1/weather"


@pytest.fixture(autouse=True)
def _skip_reverse(monkeypatch: pytest.MonkeyPatch):
    async def _no_place(lat: float, lon: float, **kwargs):
        return None

    monkeypatch.setattr("app.routes.weather.reverse_place", _no_place)
VALID_UPSTREAM = {
    "lat": -1.29,
    "lon": 36.82,
    "units": "metric",
    "current": {
        "time": "2026-08-19T12:00",
        "temperature": 22.0,
        "windspeed": 12.0,
        "winddirection": 137.0,
        "weathercode": 2,
        "is_day": 1,
    },
    "daily": [],
    "hourly": [],
}


class FakeClock:
    def __init__(self, t: float = 1000.0) -> None:
        self.t = t

    def __call__(self) -> float:
        return self.t

    def advance(self, seconds: float) -> None:
        self.t += seconds


def test_limiter_allows_then_blocks_then_resets():
    clock = FakeClock()
    limiter = InMemoryRateLimiter(limit=2, window_seconds=10, clock=clock)
    assert limiter.check("ip:a").allowed is True
    assert limiter.check("ip:a").allowed is True
    denied = limiter.check("ip:a")
    assert denied.allowed is False
    assert denied.retry_after_seconds is not None
    assert denied.retry_after_seconds >= 1
    clock.advance(10.1)
    assert limiter.check("ip:a").allowed is True


def test_limiter_identities_are_independent():
    clock = FakeClock()
    limiter = InMemoryRateLimiter(limit=1, window_seconds=60, clock=clock)
    assert limiter.check("ip:one").allowed is True
    assert limiter.check("ip:two").allowed is True
    assert limiter.check("ip:one").allowed is False
    assert limiter.check("ip:two").allowed is False


def test_limiter_rejects_invalid_construction():
    clock = FakeClock()
    with pytest.raises(ValueError):
        InMemoryRateLimiter(limit=0, window_seconds=10, clock=clock)
    with pytest.raises(ValueError):
        InMemoryRateLimiter(limit=1, window_seconds=0, clock=clock)


def test_settings_reject_nonsensical_limits():
    with pytest.raises(ValidationError):
        Settings(weatherai_api_key="wai_testkey1", rate_limit_requests=0)
    with pytest.raises(ValidationError):
        Settings(weatherai_api_key="wai_testkey1", rate_limit_window_seconds=0)


def _patch_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEATHERAI_API_KEY", "wai_test_route_key")
    from app.config import get_settings

    get_settings.cache_clear()


@respx.mock
def test_cache_hit_bypasses_exhausted_limiter(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    clock = FakeClock()
    reset_weather_limiter(InMemoryRateLimiter(limit=1, window_seconds=60, clock=clock))
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json=VALID_UPSTREAM))
    params = {"lat": -1.29, "lon": 36.82}

    miss = client.get("/weather", params=params)
    assert miss.status_code == 200
    assert miss.headers.get("x-cache") == "MISS"
    hit = client.get("/weather", params=params)
    assert hit.status_code == 200
    assert hit.headers.get("x-cache") == "HIT"
    assert route.call_count == 1


@respx.mock
def test_cache_miss_exceeding_budget_returns_app_429(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    reset_weather_limiter(InMemoryRateLimiter(limit=1, window_seconds=60, clock=FakeClock()))
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json=VALID_UPSTREAM))

    first = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    second = client.get("/weather", params={"lat": 1.0, "lon": 2.0})
    assert first.status_code == 200
    assert second.status_code == 429
    body = second.json()
    assert body["error"] == "rate_limited"
    assert "Retry-After" in second.headers
    assert route.call_count == 1


@respx.mock
def test_failed_uncached_call_consumes_budget(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    monkeypatch.setenv("WEATHERAI_MAX_RETRIES", "1")
    from app.config import get_settings

    get_settings.cache_clear()
    reset_weather_limiter(InMemoryRateLimiter(limit=1, window_seconds=60, clock=FakeClock()))
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(500, text="nope"))

    first = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    second = client.get("/weather", params={"lat": 0.0, "lon": 0.0})
    assert first.status_code == 502
    assert second.status_code == 429
    assert second.json()["error"] == "rate_limited"
    assert route.call_count == 1


@respx.mock
def test_limiter_identities_independent_on_route(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    reset_weather_limiter(InMemoryRateLimiter(limit=1, window_seconds=60, clock=FakeClock()))
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json=VALID_UPSTREAM))

    a = client.get(
        "/weather",
        params={"lat": -1.29, "lon": 36.82},
        headers={"X-Forwarded-For": "203.0.113.10"},
    )
    b = client.get(
        "/weather",
        params={"lat": 1.0, "lon": 2.0},
        headers={"X-Forwarded-For": "203.0.113.20"},
    )
    assert a.status_code == 200
    assert b.status_code == 200
    assert route.call_count == 2


def test_health_is_not_rate_limited(monkeypatch: pytest.MonkeyPatch):
    reset_weather_limiter(InMemoryRateLimiter(limit=1, window_seconds=60, clock=FakeClock()))
    assert client.get("/health").status_code == 200
    assert client.get("/health").status_code == 200
