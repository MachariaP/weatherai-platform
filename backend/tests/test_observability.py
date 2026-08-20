"""Request ID, redaction, and structured log guarantees."""
from __future__ import annotations

import json
import logging

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app.main import app
from app.observability import redact
from app.routes.weather import _cache

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
    "days": 1,
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


def _events(caplog: pytest.LogCaptureFixture) -> list[dict]:
    parsed: list[dict] = []
    for record in caplog.records:
        try:
            payload = json.loads(record.getMessage())
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and "event" in payload:
            parsed.append(payload)
    return parsed


def test_redact_strips_bearer_and_wai_keys():
    raw = "Authorization: Bearer super-secret WEATHERAI_API_KEY=wai_livekey123456 key=wai_abcdefghijkl"
    cleaned = redact(raw)
    assert "super-secret" not in cleaned
    assert "wai_livekey123456" not in cleaned
    assert "wai_abcdefghijkl" not in cleaned
    assert "[REDACTED]" in cleaned
    assert "WEATHERAI_API_KEY=[REDACTED]" in cleaned


def test_health_assigns_request_id():
    resp = client.get("/health")
    assert resp.status_code == 200
    rid = resp.headers.get("X-Request-ID")
    assert rid is not None
    assert len(rid) >= 8


def test_health_reuses_safe_incoming_request_id():
    resp = client.get("/health", headers={"X-Request-ID": "trace-id-from-proxy"})
    assert resp.headers.get("X-Request-ID") == "trace-id-from-proxy"


def test_health_rejects_unsafe_incoming_request_id():
    resp = client.get("/health", headers={"X-Request-ID": "bad id with spaces"})
    assert resp.headers.get("X-Request-ID") != "bad id with spaces"
    assert len(resp.headers.get("X-Request-ID", "")) >= 8


def test_http_request_log_includes_request_id(caplog: pytest.LogCaptureFixture):
    caplog.set_level(logging.INFO, logger="app.events")
    resp = client.get("/health")
    rid = resp.headers["X-Request-ID"]
    http_logs = [e for e in _events(caplog) if e.get("event") == "http_request"]
    assert http_logs
    assert any(e.get("request_id") == rid for e in http_logs)
    assert any(e.get("path") == "/health" and e.get("status_code") == 200 for e in http_logs)


@respx.mock
def test_weather_logs_cache_and_never_logs_secrets(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
):
    monkeypatch.setenv("WEATHERAI_API_KEY", "wai_test_observability_key")
    from app.config import get_settings

    get_settings.cache_clear()
    _cache.clear()
    caplog.set_level(logging.INFO)
    respx.get(WEATHER_URL).mock(return_value=httpx.Response(200, json=VALID_UPSTREAM))

    resp = client.get("/weather", params={"lat": -1.29, "lon": 36.82})
    assert resp.status_code == 200
    text = caplog.text
    assert "wai_test_observability_key" not in text
    assert "Authorization" not in text
    assert "Bearer " not in text

    weather_logs = [e for e in _events(caplog) if e.get("event") == "weather_request"]
    assert any(e.get("cache") == "MISS" for e in weather_logs)
    assert resp.headers.get("X-Request-ID")
    _cache.clear()
