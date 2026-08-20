"""Circuit breaker state machine and weather-route interaction."""
from __future__ import annotations

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.circuit import CircuitBreaker, CircuitState, reset_weather_breaker
from app.config import Settings
from app.main import app

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
    def __init__(self, t: float = 0.0) -> None:
        self.t = t

    def __call__(self) -> float:
        return self.t

    def advance(self, seconds: float) -> None:
        self.t += seconds


def test_settings_reject_nonsensical_circuit_values():
    with pytest.raises(ValidationError):
        Settings(weatherai_api_key="wai_testkey1", circuit_failure_threshold=0)
    with pytest.raises(ValidationError):
        Settings(weatherai_api_key="wai_testkey1", circuit_cooldown_seconds=0)


def test_closed_opens_after_threshold_qualifying_failures():
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=2, cooldown_seconds=10, clock=clock)
    assert breaker.state is CircuitState.CLOSED
    breaker.record_qualifying_failure()
    assert breaker.state is CircuitState.CLOSED
    breaker.record_qualifying_failure()
    assert breaker.state is CircuitState.OPEN
    assert breaker.blocked() is True


def test_non_qualifying_errors_do_not_open():
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=10, clock=clock)
    assert breaker.state is CircuitState.CLOSED


def test_open_stays_open_until_cooldown_then_half_open():
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=10, clock=clock)
    breaker.record_qualifying_failure()
    assert breaker.state is CircuitState.OPEN
    clock.advance(9.9)
    assert breaker.state is CircuitState.OPEN
    clock.advance(0.2)
    assert breaker.state is CircuitState.HALF_OPEN
    assert breaker.blocked() is False


def test_half_open_success_closes():
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=5, clock=clock)
    breaker.record_qualifying_failure()
    clock.advance(5)
    assert breaker.enter() is True
    breaker.record_success()
    assert breaker.state is CircuitState.CLOSED
    assert breaker.blocked() is False


def test_half_open_failure_reopens():
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=5, clock=clock)
    breaker.record_qualifying_failure()
    clock.advance(5)
    assert breaker.enter() is True
    breaker.record_qualifying_failure()
    assert breaker.state is CircuitState.OPEN
    assert breaker.blocked() is True


def test_half_open_allows_only_one_probe():
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=5, clock=clock)
    breaker.record_qualifying_failure()
    clock.advance(5)
    assert breaker.enter() is True
    assert breaker.blocked() is True
    assert breaker.enter() is False


def test_success_resets_failure_count():
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=2, cooldown_seconds=5, clock=clock)
    breaker.record_qualifying_failure()
    breaker.record_success()
    breaker.record_qualifying_failure()
    assert breaker.state is CircuitState.CLOSED


def _patch_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WEATHERAI_API_KEY", "wai_test_route_key")
    monkeypatch.setenv("WEATHERAI_MAX_RETRIES", "1")
    from app.config import get_settings

    get_settings.cache_clear()


@respx.mock
def test_open_circuit_still_serves_cache_hit(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=30, clock=clock)
    reset_weather_breaker(breaker)
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json=VALID_UPSTREAM))
    params = {"lat": -1.29, "lon": 36.82}

    miss = client.get("/weather", params=params)
    assert miss.status_code == 200
    breaker.record_qualifying_failure()
    assert breaker.state is CircuitState.OPEN

    hit = client.get("/weather", params=params)
    assert hit.status_code == 200
    assert hit.headers.get("x-cache") == "HIT"
    assert route.call_count == 1


@respx.mock
def test_open_circuit_fail_fast_on_miss(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    clock = FakeClock()
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=30, clock=clock)
    breaker.record_qualifying_failure()
    reset_weather_breaker(breaker)
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json=VALID_UPSTREAM))

    resp = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    assert resp.status_code == 503
    assert resp.json()["error"] == "upstream_unavailable"
    assert "circuit" not in resp.json()["message"].lower()
    assert route.call_count == 0


@respx.mock
def test_qualifying_upstream_failures_open_circuit(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    clock = FakeClock()
    reset_weather_breaker(CircuitBreaker(failure_threshold=1, cooldown_seconds=30, clock=clock))
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(503, text="down"))

    first = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    second = client.get("/weather", params={"lat": 0.0, "lon": 0.0})
    assert first.status_code == 502
    assert second.status_code == 503
    assert second.json()["error"] == "upstream_unavailable"
    assert route.call_count == 1


@respx.mock
def test_auth_failure_does_not_open_circuit(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    reset_weather_breaker(
        CircuitBreaker(failure_threshold=1, cooldown_seconds=30, clock=FakeClock())
    )
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(401, text="nope"))

    first = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    second = client.get("/weather", params={"lat": 0.0, "lon": 0.0})
    assert first.status_code == 502
    assert second.status_code == 502
    assert route.call_count == 2


@respx.mock
def test_open_circuit_does_not_consume_rate_limit(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    from app.rate_limit import InMemoryRateLimiter, reset_weather_limiter

    clock = FakeClock()
    reset_weather_limiter(InMemoryRateLimiter(limit=1, window_seconds=60, clock=clock))
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=30, clock=clock)
    breaker.record_qualifying_failure()
    reset_weather_breaker(breaker)
    route = respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json=VALID_UPSTREAM))

    blocked = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    assert blocked.status_code == 503
    assert route.call_count == 0
    breaker.record_success()
    allowed = client.get("/weather", params={"lat": 1.0, "lon": 1.0})
    assert allowed.status_code == 200
    assert route.call_count == 1
