"""Tests for Photon-backed geocode routes."""
from __future__ import annotations

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app.geocode import _cache as geocode_cache
from app.main import app

client = TestClient(app)
SEARCH_URL = "https://photon.komoot.io/api/"
REVERSE_URL = "https://photon.komoot.io/reverse"


def nairobi_feature() -> dict:
    return {
        "type": "Feature",
        "properties": {"name": "Nairobi", "country": "Kenya"},
        "geometry": {"type": "Point", "coordinates": [36.817223, -1.286389]},
    }


@pytest.fixture(autouse=True)
def _clear_geocode_cache():
    geocode_cache.clear()
    yield
    geocode_cache.clear()


@respx.mock
def test_geocode_search_returns_first_hit():
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={"type": "FeatureCollection", "features": [nairobi_feature()]},
        )
    )
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["lat"] == pytest.approx(-1.286389)
    assert body["lon"] == pytest.approx(36.817223)
    assert body["label"] == "Nairobi, Kenya"


@respx.mock
def test_geocode_search_404_when_empty():
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, json={"type": "FeatureCollection", "features": []})
    )
    resp = client.get("/geocode", params={"q": "zzzznotacity"})
    assert resp.status_code == 404
    assert resp.json()["error"] == "not_found"


@respx.mock
def test_geocode_search_timeout():
    respx.get(SEARCH_URL).mock(side_effect=httpx.ReadTimeout("timeout"))
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 504
    assert resp.json()["error"] == "timeout"


@respx.mock
def test_geocode_search_is_cached():
    route = respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"name": "Null Island"},
                        "geometry": {"type": "Point", "coordinates": [0, 0]},
                    }
                ],
            },
        )
    )
    first = client.get("/geocode", params={"q": "Null Island"})
    second = client.get("/geocode", params={"q": "Null Island"})
    assert first.status_code == 200
    assert second.status_code == 200
    assert route.call_count == 1


@respx.mock
def test_reverse_returns_label():
    respx.get(REVERSE_URL).mock(
        return_value=httpx.Response(
            200,
            json={"type": "FeatureCollection", "features": [nairobi_feature()]},
        )
    )
    resp = client.get("/reverse", params={"lat": -1.2921, "lon": 36.8219})
    assert resp.status_code == 200
    assert resp.json()["label"] == "Nairobi, Kenya"


@respx.mock
def test_reverse_404_when_unusable():
    respx.get(REVERSE_URL).mock(
        return_value=httpx.Response(200, json={"type": "FeatureCollection", "features": []})
    )
    resp = client.get("/reverse", params={"lat": 0, "lon": 0})
    assert resp.status_code == 404


IPWHO_EGRESS = "https://ipwho.is/"
IPWHO_LOOKUP = "https://ipwho.is/8.8.8.8"


@respx.mock
def test_geolocate_uses_public_ip_approximation():
    respx.get(IPWHO_EGRESS).mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "latitude": -1.2864,
                "longitude": 36.8172,
                "city": "Nairobi",
                "country": "Kenya",
            },
        )
    )
    resp = client.get("/geolocate")
    assert resp.status_code == 200
    body = resp.json()
    assert body["lat"] == pytest.approx(-1.2864)
    assert body["lon"] == pytest.approx(36.8172)
    assert body["label"] == "Nairobi, Kenya"
    assert "ip" not in body


@respx.mock
def test_geolocate_forwards_public_client_ip():
    respx.get(IPWHO_LOOKUP).mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "latitude": 37.386,
                "longitude": -122.084,
                "city": "Mountain View",
                "country": "United States",
            },
        )
    )
    resp = client.get("/geolocate", headers={"x-forwarded-for": "8.8.8.8"})
    assert resp.status_code == 200
    assert resp.json()["label"] == "Mountain View, United States"


@respx.mock
def test_geolocate_timeout():
    respx.get(IPWHO_EGRESS).mock(side_effect=httpx.ReadTimeout("timeout"))
    resp = client.get("/geolocate")
    assert resp.status_code == 504
    assert resp.json()["error"] == "timeout"
