"""
Pydantic models for upstream WeatherAI responses and our own API shape.

Two layers, deliberately separated:

1. Upstream*  — mirrors what WeatherAI actually returns at runtime.
   Verified by smoke_real_api.py, not just the docs.  Extra fields
   are allowed (model_config extra="allow") because WeatherAI may
   add fields we haven't seen yet.

   IMPORTANT: The real API response shape differs from the
   documentation.  The docs suggest a nested location/current/forecast
   structure, but the actual response uses flat top-level fields
   (lat, lon, units, days) with current as a flat object using
   'temperature'/'windspeed'/'weathercode' keys, and daily/hourly
   as top-level arrays.  No rate-limit headers are returned on the
   Free plan.

2. Weather*   — our application's public API contract.  Decoupled from
   WeatherAI's exact structure so upstream changes don't silently
   propagate to our consumers.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Layer 1: upstream response shape (verified against real API)
# ---------------------------------------------------------------------------

class UpstreamCurrentCondition(BaseModel):
    """Current conditions as returned by the real API."""
    model_config = ConfigDict(extra="allow")

    time: str | None = None
    interval: int | None = None
    temperature: float | None = None
    windspeed: float | None = None
    winddirection: float | None = None
    weathercode: int | None = None
    is_day: int | None = None
    # Optional extras — present only if WeatherAI actually sends them.
    humidity: float | None = None
    relativehumidity: float | None = None
    uv: float | None = None
    uv_index: float | None = None
    pressure: float | None = None
    feels_like: float | None = None
    apparent_temperature: float | None = None


class UpstreamDailyEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    date: str | None = None
    temp_max: float | None = None
    temp_min: float | None = None
    precipitation: float | None = None
    weathercode: int | None = None


class UpstreamHourlyEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    time: str | None = None
    temp: float | None = None
    precipitation: float | None = None
    weathercode: int | None = None


class UpstreamWeatherResponse(BaseModel):
    """
    Top-level shape returned by GET /v1/weather.

    Verified against the real API — differs from documentation:
    - lat/lon/units/days are top-level, not nested under 'location'
    - current uses 'temperature'/'windspeed'/'weathercode'
    - daily/hourly are top-level arrays, not nested under 'forecast'
    - No rate-limit headers observed on Free plan
    """
    model_config = ConfigDict(extra="allow")

    lat: float | None = None
    lon: float | None = None
    units: str | None = None
    days: int | None = None
    current: UpstreamCurrentCondition | None = None
    daily: list[UpstreamDailyEntry] | None = None
    hourly: list[UpstreamHourlyEntry] | None = None
    ai_summary: str | None = None
    ai_insights: dict | None = None


# ---------------------------------------------------------------------------
# Layer 2: our application's public API shape
#
# These models define what OUR consumers receive.  Fields are only
# included if we can reliably populate them from the upstream data
# verified in the smoke test.  We don't invent fields the upstream
# doesn't provide.
# ---------------------------------------------------------------------------

WEATHERCODE_DESCRIPTIONS: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


class CurrentWeather(BaseModel):
    temperature: float
    wind_speed: float
    wind_direction: float
    weather_code: int
    weather_description: str
    is_day: bool
    observed_at: str | None = None
    feels_like: float | None = None
    humidity: float | None = None
    uv_index: float | None = None
    pressure: float | None = None
    precip_last_24h: float | None = None


class ForecastDay(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    precipitation: float
    weather_code: int
    weather_description: str


class HourlyForecast(BaseModel):
    time: str
    temperature: float
    precipitation: float
    weather_code: int
    weather_description: str


class WeatherResponse(BaseModel):
    """Our public API response — decoupled from upstream shape."""
    lat: float
    lon: float
    units: str
    current: CurrentWeather
    daily: list[ForecastDay]
    hourly: list[HourlyForecast]
    ai_summary: str | None = None
    place_name: str | None = None


class GeocodeResult(BaseModel):
    """One place candidate. Optional region/country are omitted when unknown."""

    lat: float
    lon: float
    label: str
    region: str | None = None
    country: str | None = None


class GeocodeSearchResponse(BaseModel):
    results: list[GeocodeResult]
