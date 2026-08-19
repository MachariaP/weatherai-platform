"""
Integration tests for the /weather route.

Tests the full route through FastAPI's test client with the upstream
mocked via respx.  Verifies input validation, cache behavior,
normalization, and error translation.
"""
from __future__ import annotations

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app.client import WeatherAIClient
from app.errors import WeatherAIError
from app.main import app
from app.routes.weather import _cache

client = TestClient(app)

BASE = "https://api.weather-ai.co"
WEATHER_URL = f"{BASE}/v1/weather"

VALID_UPSTREAM = {
    "lat": -1.29,
    "lon": 36.82,
    "units": "metric",
    "days": 1,
    "current": {
        "time": "2026-08-19T12:00",
        "interval": 900,
        "temperature": 22.0,
        "windspeed": 12.0,
        "winddirection": 137.0,
        "weathercode": 2,
        "is_day": 1,
    },
    "daily": [
        {"date": "2026-08-19", "temp_max": 24.0, "temp_min": 15.0, "precipitation": 1.2, "weathercode": 53}
    ],
    "hourly": [
        {"time": "2026-08-19T00:00", "temp": 16.0, "precipitation": 0.1, "weathercode": 51}
    ],
}


@pytest.fixture(autouse=True)
def _clear_cache():
    _cache.clear()
    yield
    _cache.clear()


def _patch_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("WEATHERAI_API_KEY", "wai_test_route_key")
    from app.config import get_settings
    get_settings.cache_clear()


# ── Input validation (no upstream call needed) ─────────────────────

def test_missing_lat_returns_422():
    resp = client.get("/weather", params={"lon": 36.82})
    assert resp.status_code == 422


def test_missing_lon_returns_422():
    resp = client.get("/weather", params={"lat": -1.29})
    assert resp.status_code == 422


def test_lat_out_of_range_returns_422():
    resp = client.get("/weather", params={"lat": 91, "lon": 0})
    assert resp.status_code == 422


def test_lon_out_of_range_returns_422():
    resp = client.get("/weather", params={"lat": 0, "lon": 181})
    assert resp.status_code == 422


def test_invalid_units_returns_422():
    resp = client.get("/weather", params={"lat": 0, "lon": 0, "units": "kelvin"})
    assert resp.status_code == 422


def test_days_below_range_returns_422():
    resp = client.get("/weather", params={"lat": 0, "lon": 0, "days": 0})
    assert resp.status_code == 422


def test_days_above_range_returns_422():
    resp = client.get("/weather", params={"lat": 0, "lon": 0, "days": 8})
    assert resp.status_code == 422


# ── Happy path — normalized response ──────────────────────────────

@respx.mock
def test_happy_path_returns_normalized_response(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=VALID_UPSTREAM)
    )
    resp = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    assert resp.status_code == 200

    body = resp.json()
    assert body["lat"] == -1.29
    assert body["current"]["temperature"] == 22.0
    assert body["current"]["weather_description"] == "Partly cloudy"
    assert body["daily"][0]["date"] == "2026-08-19"
    assert body["hourly"][0]["temperature"] == 16.0


@respx.mock
def test_happy_path_returns_cache_miss_header(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=VALID_UPSTREAM)
    )
    resp = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    assert resp.headers.get("x-cache") == "MISS"


# ── Cache behavior ────────────────────────────────────────────────

@respx.mock
def test_second_request_returns_cache_hit(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    route = respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=VALID_UPSTREAM)
    )
    params = {"lat": -1.29, "lon": 36.82}

    resp1 = client.get("/weather", params=params)
    assert resp1.status_code == 200
    assert resp1.headers.get("x-cache") == "MISS"

    resp2 = client.get("/weather", params=params)
    assert resp2.status_code == 200
    assert resp2.headers.get("x-cache") == "HIT"

    assert route.call_count == 1


@respx.mock
def test_different_params_are_not_cached_together(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    route = respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, json=VALID_UPSTREAM)
    )
    client.get("/weather", params={"lat": 0, "lon": 0})
    client.get("/weather", params={"lat": 1, "lon": 1})

    assert route.call_count == 2


# ── Errors must NOT populate cache ─────────────────────────────────

@respx.mock
def test_error_response_does_not_populate_cache(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(500, text="Error"))
    params = {"lat": 0, "lon": 0}

    resp = client.get("/weather", params=params)
    assert resp.status_code == 502

    assert _cache.size == 0


@respx.mock
def test_timeout_does_not_populate_cache(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(side_effect=httpx.ReadTimeout("timeout"))
    params = {"lat": 0, "lon": 0}

    resp = client.get("/weather", params=params)
    assert resp.status_code == 504

    assert _cache.size == 0


# ── Upstream error translation ────────────────────────────────────

@respx.mock
def test_upstream_401_returns_502(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(401, text="Unauthorized"))
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 502
    assert resp.json()["error"] == "upstream_auth"


@respx.mock
def test_upstream_400_returns_400(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(400, text="Bad request"))
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 400
    assert resp.json()["error"] == "bad_request"


@respx.mock
def test_upstream_403_returns_403(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(403, text="Forbidden"))
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 403
    assert resp.json()["error"] == "plan_restriction"


@respx.mock
def test_upstream_429_returns_429(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(
            429,
            text="Too Many Requests",
            headers={"X-RateLimit-Reset": "1717977600"},
        )
    )
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 429
    assert resp.json()["error"] == "rate_limit"


@respx.mock
def test_upstream_429_without_reset_header_returns_429(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(429, text="Too Many Requests"))
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 429
    assert resp.json()["error"] == "rate_limit"
    assert "x-ratelimit-reset" not in resp.headers


@respx.mock
def test_upstream_timeout_returns_504(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(side_effect=httpx.ReadTimeout("timeout"))
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 504
    assert resp.json()["error"] == "timeout"


@respx.mock
def test_upstream_500_returns_502_after_retries(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(500, text="Error"))
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 502
    assert resp.json()["error"] == "upstream_error"


@respx.mock
def test_upstream_malformed_json_returns_502(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(200, text="not json at all")
    )
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 502
    assert resp.json()["error"] == "malformed_response"


# ── Generic upstream error fallback ────────────────────────────────

def test_generic_upstream_error_returns_502(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)

    async def boom(self, **kwargs):
        raise WeatherAIError("unexpected upstream failure")

    monkeypatch.setattr(WeatherAIClient, "get_weather", boom)

    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 502
    assert resp.json()["error"] == "upstream_error"


# ── Normalization failure ──────────────────────────────────────────

@respx.mock
def test_missing_current_in_upstream_returns_502(monkeypatch: pytest.MonkeyPatch):
    _patch_key(monkeypatch)
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(
            200,
            json={"lat": 0.0, "lon": 0.0, "units": "metric", "days": 1},
        )
    )
    resp = client.get("/weather", params={"lat": 0, "lon": 0})
    assert resp.status_code == 502
    assert resp.json()["error"] == "malformed_response"
