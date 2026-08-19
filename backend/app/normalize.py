"""
Normalize upstream WeatherAI responses into our public API contract.

Pure functions — no I/O, no side effects, easily testable.
The upstream shape is what the real API returns (verified by smoke test),
not what the documentation says.
"""
from __future__ import annotations

from app.models import (
    WEATHERCODE_DESCRIPTIONS,
    CurrentWeather,
    ForecastDay,
    HourlyForecast,
    UpstreamWeatherResponse,
    WeatherResponse,
)


def _describe_code(code: int | None) -> str:
    if code is None:
        return "Unknown"
    return WEATHERCODE_DESCRIPTIONS.get(code, f"Unknown ({code})")


def normalize_weather(upstream: UpstreamWeatherResponse) -> WeatherResponse:
    """Transform an upstream response into our public contract."""
    current = upstream.current
    if current is None:
        raise ValueError("Upstream response missing 'current' block")

    def _f(val: float | None, default: float = 0.0) -> float:
        return val if val is not None else default

    def _i(val: int | None, default: int = 0) -> int:
        return val if val is not None else default

    def _s(val: str | None, default: str = "") -> str:
        return val if val is not None else default

    return WeatherResponse(
        lat=_f(upstream.lat),
        lon=_f(upstream.lon),
        units=_s(upstream.units, "metric"),
        current=CurrentWeather(
            temperature=_f(current.temperature),
            wind_speed=_f(current.windspeed),
            wind_direction=_f(current.winddirection),
            weather_code=_i(current.weathercode),
            weather_description=_describe_code(current.weathercode),
            is_day=bool(current.is_day),
            observed_at=current.time,
        ),
        daily=[
            ForecastDay(
                date=_s(d.date),
                temp_max=_f(d.temp_max),
                temp_min=_f(d.temp_min),
                precipitation=_f(d.precipitation),
                weather_code=_i(d.weathercode),
                weather_description=_describe_code(d.weathercode),
            )
            for d in (upstream.daily or [])
        ],
        hourly=[
            HourlyForecast(
                time=_s(h.time),
                temperature=_f(h.temp),
                precipitation=_f(h.precipitation),
                weather_code=_i(h.weathercode),
                weather_description=_describe_code(h.weathercode),
            )
            for h in (upstream.hourly or [])
        ],
        ai_summary=upstream.ai_summary,
    )
