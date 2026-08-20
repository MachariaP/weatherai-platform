"""
Geocoding client (server-side only).

Public Nominatim often returns HTTP 403 ("Access denied") for cloud/dev
IPs and incomplete User-Agents. FastAPI therefore uses Komoot Photon
(OpenStreetMap data, no API key). The browser never talks to Photon or
Nominatim. Place names become lat/lon for the existing WeatherAI Free
/v1/weather contract.
"""
from __future__ import annotations

from typing import Any

import ipaddress
import httpx

from app.cache import InMemoryCache

PHOTON_BASE = "https://photon.komoot.io"
USER_AGENT = "WeatherAI-QA/1.0 (weatherai-qa-project)"
GEOCODE_TTL_SECONDS = 86_400.0
GEOCODE_TIMEOUT_SECONDS = 12.0
PHOTON_SEARCH_LIMIT = 8

_cache = InMemoryCache()


class GeocodeError(Exception):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class GeocodeNotFoundError(GeocodeError):
    pass


class GeocodeTimeoutError(GeocodeError):
    pass


class GeocodeUnavailableError(GeocodeError):
    pass


def _headers() -> dict[str, str]:
    return {"User-Agent": USER_AGENT, "Accept": "application/json"}


def _optional_text(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def format_place_label(payload: dict[str, Any]) -> str:
    """Build a short 'City, Country' label from Photon properties or Nominatim address."""
    address = payload.get("address")
    if isinstance(address, dict):
        city = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or address.get("county")
        )
        country = address.get("country")
        if city and country:
            return f"{city}, {country}"
        if city:
            return str(city)
        if country:
            return str(country)

    name = payload.get("name")
    country = payload.get("country")
    if isinstance(name, str) and name.strip() and isinstance(country, str) and country.strip():
        return f"{name.strip()}, {country.strip()}"
    if isinstance(name, str) and name.strip():
        return name.strip()
    if isinstance(country, str) and country.strip():
        return country.strip()

    display = payload.get("display_name")
    if isinstance(display, str) and display.strip():
        parts = [p.strip() for p in display.split(",") if p.strip()]
        if len(parts) >= 2:
            return f"{parts[0]}, {parts[-1]}"
        return parts[0]
    return "Unknown location"


def _from_photon_feature(feature: dict[str, Any]) -> dict[str, Any]:
    parsed = _try_photon_feature(feature)
    if parsed is None:
        raise GeocodeUnavailableError("Geocoder returned an unusable result")
    return parsed


def _try_photon_feature(feature: dict[str, Any]) -> dict[str, Any] | None:
    geometry = feature.get("geometry")
    properties = feature.get("properties")
    if not isinstance(geometry, dict) or not isinstance(properties, dict):
        return None
    coords = geometry.get("coordinates")
    if not isinstance(coords, list) or len(coords) < 2:
        return None
    try:
        lon = float(coords[0])
        lat = float(coords[1])
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        return None
    hit: dict[str, Any] = {"lat": lat, "lon": lon, "label": format_place_label(properties)}
    region = _optional_text(properties.get("state")) or _optional_text(properties.get("county"))
    country = _optional_text(properties.get("country"))
    if region:
        hit["region"] = region
    if country:
        hit["country"] = country
    return hit


def _dedupe_hits(hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[float, float, str]] = set()
    unique: list[dict[str, Any]] = []
    for hit in hits:
        key = (round(float(hit["lat"]), 4), round(float(hit["lon"]), 4), str(hit["label"]).casefold())
        if key in seen:
            continue
        seen.add(key)
        unique.append(hit)
    return unique


async def _photon_get(path: str, params: dict[str, Any], *, timeout: float) -> Any:
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            headers=_headers(),
            follow_redirects=True,
        ) as http:
            response = await http.get(f"{PHOTON_BASE}{path}", params=params)
    except httpx.TimeoutException as exc:
        raise GeocodeTimeoutError("Location search timed out") from exc
    except httpx.HTTPError as exc:
        raise GeocodeUnavailableError("Location search is unavailable") from exc

    if response.status_code >= 500:
        raise GeocodeUnavailableError("Location search is unavailable")
    if response.status_code >= 400:
        raise GeocodeUnavailableError("Location search failed")

    try:
        return response.json()
    except Exception as exc:
        raise GeocodeUnavailableError("Location search returned an unexpected response") from exc


async def search_places(query: str, *, timeout: float = GEOCODE_TIMEOUT_SECONDS) -> list[dict[str, Any]]:
    """Return up to PHOTON_SEARCH_LIMIT public place candidates. Empty list if none match."""
    q = query.strip()
    if len(q) < 2:
        raise GeocodeNotFoundError("Search query is too short")

    cache_key = f"geocode:search:v2:{q.casefold()}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    body = await _photon_get("/api/", {"q": q, "limit": PHOTON_SEARCH_LIMIT}, timeout=timeout)
    if not isinstance(body, dict):
        raise GeocodeUnavailableError("Location search returned an unexpected response")
    features = body.get("features")
    if not isinstance(features, list):
        raise GeocodeUnavailableError("Location search returned an unexpected response")

    hits: list[dict[str, Any]] = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        parsed = _try_photon_feature(feature)
        if parsed is not None:
            hits.append(parsed)

    results = _dedupe_hits(hits)
    _cache.set(cache_key, results, GEOCODE_TTL_SECONDS)
    return results


async def reverse_place(lat: float, lon: float, *, timeout: float = GEOCODE_TIMEOUT_SECONDS) -> str | None:
    cache_key = f"geocode:reverse:{lat:.4f}:{lon:.4f}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        body = await _photon_get(
            "/reverse",
            {"lat": lat, "lon": lon},
            timeout=timeout,
        )
    except (GeocodeTimeoutError, GeocodeUnavailableError):
        return None

    features = body.get("features") if isinstance(body, dict) else None
    if not isinstance(features, list) or not features or not isinstance(features[0], dict):
        return None

    try:
        result = _from_photon_feature(features[0])
    except GeocodeError:
        return None

    label = result["label"]
    _cache.set(cache_key, label, GEOCODE_TTL_SECONDS)
    return label


IPWHO_BASE = "https://ipwho.is"
GEOLOCATE_TTL_SECONDS = 900.0


def _public_client_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    try:
        addr = ipaddress.ip_address(ip.strip())
    except ValueError:
        return None
    if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local or addr.is_multicast:
        return None
    return str(addr)


async def locate_by_ip(client_ip: str | None = None, *, timeout: float = 8.0) -> dict[str, Any]:
    """Approximate lat/lon from the caller's public IP. Used when the browser GPS is unavailable."""
    public_ip = _public_client_ip(client_ip)
    cache_key = f"geolocate:{public_ip or 'egress'}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    url = f"{IPWHO_BASE}/{public_ip}" if public_ip else f"{IPWHO_BASE}/"
    try:
        async with httpx.AsyncClient(timeout=timeout, headers=_headers(), follow_redirects=True) as http:
            response = await http.get(url)
    except httpx.TimeoutException as exc:
        raise GeocodeTimeoutError("Location search timed out") from exc
    except httpx.HTTPError as exc:
        raise GeocodeUnavailableError("Location search is unavailable") from exc

    if response.status_code >= 400:
        raise GeocodeUnavailableError("Location search is unavailable")

    try:
        body = response.json()
    except Exception as exc:
        raise GeocodeUnavailableError("Location search returned an unexpected response") from exc

    if not isinstance(body, dict) or body.get("success") is False:
        raise GeocodeNotFoundError("No matching location")

    try:
        lat = float(body["latitude"])
        lon = float(body["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise GeocodeUnavailableError("Geocoder returned an unusable result") from exc
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise GeocodeUnavailableError("Geocoder returned out-of-range coordinates")

    city = body.get("city")
    country = body.get("country")
    label = format_place_label(
        {"name": city if isinstance(city, str) else None, "country": country if isinstance(country, str) else None}
    )
    result = {"lat": lat, "lon": lon, "label": label}
    _cache.set(cache_key, result, GEOLOCATE_TTL_SECONDS)
    return result
