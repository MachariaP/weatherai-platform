"""
Normalize upstream WeatherAI responses into our public API contract.

Pure functions — no I/O, no side effects, easily testable.
The upstream shape is what the real API returns (verified by smoke test),
not what the documentation says.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.models import (
    WEATHERCODE_DESCRIPTIONS,
    CurrentWeather,
    ForecastDay,
    HourlyForecast,
    UpstreamCurrentCondition,
    UpstreamWeatherResponse,
    WeatherResponse,
)


def _describe_code(code: int | None) -> str:
    if code is None:
        return "Unknown"
    return WEATHERCODE_DESCRIPTIONS.get(code, f"Unknown ({code})")


def _optional_float(*candidates: object) -> float | None:
    for val in candidates:
        if val is None:
            continue
        try:
            number = float(val)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            continue
        if number == number:
            return number
    return None


def _extra(current: UpstreamCurrentCondition, *names: str) -> float | None:
    extra = current.model_extra or {}
    values: list[object] = []
    for name in names:
        values.append(getattr(current, name, None))
        values.append(extra.get(name))
    return _optional_float(*values)


def _parse_time(value: str | None) -> datetime | None:
    if not value or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def precip_last_24h(
    observed_at: str | None,
    hours: list[HourlyForecast],
) -> float | None:
    """Sum hourly precipitation in the 24 hours ending at observed_at."""
    if not hours:
        return None
    anchor = _parse_time(observed_at)
    if anchor is None:
        timed = [_parse_time(h.time) for h in hours]
        known = [t for t in timed if t is not None]
        if not known:
            return None
        anchor = max(known)
    start = anchor - timedelta(hours=24)
    total = 0.0
    counted = False
    for hour in hours:
        when = _parse_time(hour.time)
        if when is None:
            continue
        if start < when <= anchor:
            amount = hour.precipitation
            if amount is None or amount != amount:
                # Missing is not zero: skip the hour rather than invent 0.0.
                continue
            total += amount
            counted = True
    return total if counted else None


def normalize_weather(
    upstream: UpstreamWeatherResponse,
    *,
    place_name: str | None = None,
) -> WeatherResponse:
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

    hourly = [
        HourlyForecast(
            time=_s(h.time),
            temperature=_f(h.temp),
            precipitation=_optional_float(h.precipitation),
            weather_code=_i(h.weathercode),
            weather_description=_describe_code(h.weathercode),
        )
        for h in (upstream.hourly or [])
    ]

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
            feels_like=_extra(current, "feels_like", "apparent_temperature", "feelslike"),
            humidity=_extra(current, "humidity", "relativehumidity", "relative_humidity"),
            uv_index=_extra(current, "uv_index", "uv", "uvindex"),
            pressure=_extra(current, "pressure", "surface_pressure"),
            precip_last_24h=precip_last_24h(current.time, hourly),
        ),
        daily=[
            ForecastDay(
                date=_s(d.date),
                temp_max=_f(d.temp_max),
                temp_min=_f(d.temp_min),
                precipitation=_optional_float(d.precipitation),
                weather_code=_i(d.weathercode),
                weather_description=_describe_code(d.weathercode),
            )
            for d in (upstream.daily or [])
        ],
        hourly=hourly,
        ai_summary=upstream.ai_summary,
        place_name=place_name,
    )
