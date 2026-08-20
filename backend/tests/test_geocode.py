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


def illinois_feature() -> dict:
    return {
        "type": "Feature",
        "properties": {
            "name": "Nairobi",
            "state": "Illinois",
            "country": "United States",
        },
        "geometry": {"type": "Point", "coordinates": [-88.3806, 41.7756]},
    }


@respx.mock
def test_geocode_search_returns_candidates():
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "type": "FeatureCollection",
                "features": [nairobi_feature(), illinois_feature()],
            },
        )
    )
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 200
    body = resp.json()
    assert "results" in body
    assert len(body["results"]) == 2
    first = body["results"][0]
    assert first["lat"] == pytest.approx(-1.286389)
    assert first["lon"] == pytest.approx(36.817223)
    assert first["label"] == "Nairobi, Kenya"
    assert first["country"] == "Kenya"
    assert "region" not in first
    second = body["results"][1]
    assert second["region"] == "Illinois"
    assert second["country"] == "United States"
    assert "geometry" not in first
    assert "properties" not in first
    assert "photon" not in str(body).casefold()


@respx.mock
def test_geocode_search_empty_results_is_not_an_error():
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(200, json={"type": "FeatureCollection", "features": []})
    )
    resp = client.get("/geocode", params={"q": "zzzznotacity"})
    assert resp.status_code == 200
    assert resp.json() == {"results": []}


@respx.mock
def test_geocode_search_dedupes_duplicate_features():
    dup = nairobi_feature()
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={"type": "FeatureCollection", "features": [dup, dup]},
        )
    )
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 1


@respx.mock
def test_geocode_search_skips_malformed_features():
    respx.get(SEARCH_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "type": "FeatureCollection",
                "features": [
                    {"type": "Feature", "properties": {}, "geometry": {}},
                    nairobi_feature(),
                ],
            },
        )
    )
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 1
    assert resp.json()["results"][0]["label"] == "Nairobi, Kenya"


@respx.mock
def test_geocode_search_malformed_body():
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(200, json=["not", "an", "object"]))
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 503
    assert resp.json()["error"] == "geocode_unavailable"
    assert "photon" not in str(resp.json()).casefold()


@respx.mock
def test_geocode_search_provider_4xx():
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(403, json={"message": "denied"}))
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 503
    assert resp.json()["error"] == "geocode_unavailable"


@respx.mock
def test_geocode_search_provider_5xx():
    respx.get(SEARCH_URL).mock(return_value=httpx.Response(502, text="bad gateway"))
    resp = client.get("/geocode", params={"q": "Nairobi"})
    assert resp.status_code == 503
    assert resp.json()["error"] == "geocode_unavailable"


def test_geocode_search_rejects_short_query():
    resp = client.get("/geocode", params={"q": "a"})
    assert resp.status_code == 422


def test_geocode_search_rejects_empty_query():
    resp = client.get("/geocode", params={"q": ""})
    assert resp.status_code == 422


def test_geocode_search_rejects_missing_query():
    resp = client.get("/geocode")
    assert resp.status_code == 422


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
    assert first.json()["results"][0]["label"] == "Null Island"
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
