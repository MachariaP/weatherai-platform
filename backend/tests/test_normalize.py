"""
Tests for upstream → public contract normalization.

Pure function tests — no I/O, no mocking needed.
"""
from app.models import (
    UpstreamCurrentCondition,
    UpstreamDailyEntry,
    UpstreamHourlyEntry,
    UpstreamWeatherResponse,
)
from app.normalize import normalize_weather

import pytest


def _upstream(
    current: dict | None = None,
    daily: list[dict] | None = None,
    hourly: list[dict] | None = None,
    **kwargs,
) -> UpstreamWeatherResponse:
    """Build an UpstreamWeatherResponse with sensible defaults."""
    defaults = {
        "lat": -1.29,
        "lon": 36.82,
        "units": "metric",
        "days": 1,
        "current": UpstreamCurrentCondition(
            time="2026-08-19T12:00",
            interval=900,
            temperature=22.0,
            windspeed=12.0,
            winddirection=137.0,
            weathercode=2,
            is_day=1,
        ),
        "daily": [
            UpstreamDailyEntry(
                date="2026-08-19",
                temp_max=24.0,
                temp_min=15.0,
                precipitation=1.2,
                weathercode=53,
            )
        ],
        "hourly": [
            UpstreamHourlyEntry(
                time="2026-08-19T00:00",
                temp=16.0,
                precipitation=0.1,
                weathercode=51,
            )
        ],
    }
    if current is not None:
        defaults["current"] = UpstreamCurrentCondition(**current)
    if daily is not None:
        defaults["daily"] = [UpstreamDailyEntry(**d) for d in daily]
    if hourly is not None:
        defaults["hourly"] = [UpstreamHourlyEntry(**h) for h in hourly]
    defaults.update(kwargs)
    return UpstreamWeatherResponse(**defaults)


# ── Basic normalization ────────────────────────────────────────────

def test_normalizes_coordinates():
    result = normalize_weather(_upstream())
    assert result.lat == -1.29
    assert result.lon == 36.82
    assert result.units == "metric"


def test_normalizes_current_temperature():
    result = normalize_weather(_upstream())
    assert result.current.temperature == 22.0


def test_normalizes_current_wind():
    result = normalize_weather(_upstream())
    assert result.current.wind_speed == 12.0
    assert result.current.wind_direction == 137.0


def test_normalizes_is_day():
    result = normalize_weather(_upstream())
    assert result.current.is_day is True

    result_night = normalize_weather(
        _upstream(current={"is_day": 0, "temperature": 18.0, "weathercode": 0})
    )
    assert result_night.current.is_day is False


def test_normalizes_observed_at():
    result = normalize_weather(_upstream())
    assert result.current.observed_at == "2026-08-19T12:00"


# ── Weather code descriptions ─────────────────────────────────────

def test_known_weathercode_gets_description():
    result = normalize_weather(_upstream())
    assert result.current.weather_description == "Partly cloudy"


def test_unknown_weathercode_gets_fallback():
    result = normalize_weather(
        _upstream(current={"temperature": 20.0, "weathercode": 999})
    )
    assert "999" in result.current.weather_description


def test_daily_weathercode_described():
    result = normalize_weather(_upstream())
    assert result.daily[0].weather_description == "Moderate drizzle"


def test_hourly_weathercode_described():
    result = normalize_weather(_upstream())
    assert result.hourly[0].weather_description == "Light drizzle"


# ── Daily forecast ─────────────────────────────────────────────────

def test_normalizes_daily():
    result = normalize_weather(_upstream())
    assert len(result.daily) == 1
    day = result.daily[0]
    assert day.date == "2026-08-19"
    assert day.temp_max == 24.0
    assert day.temp_min == 15.0
    assert day.precipitation == 1.2


def test_empty_daily_produces_empty_list():
    result = normalize_weather(_upstream(daily=[]))
    assert result.daily == []


# ── Hourly forecast ────────────────────────────────────────────────

def test_normalizes_hourly():
    result = normalize_weather(_upstream())
    assert len(result.hourly) == 1
    hour = result.hourly[0]
    assert hour.time == "2026-08-19T00:00"
    assert hour.temperature == 16.0
    assert hour.precipitation == 0.1


def test_empty_hourly_produces_empty_list():
    result = normalize_weather(_upstream(hourly=[]))
    assert result.hourly == []


# ── AI summary ─────────────────────────────────────────────────────

def test_ai_summary_passed_through():
    result = normalize_weather(_upstream(ai_summary="Expect rain today."))
    assert result.ai_summary == "Expect rain today."


def test_ai_summary_none_when_absent():
    result = normalize_weather(_upstream())
    assert result.ai_summary is None
    assert result.place_name is None
    assert result.current.humidity is None
    assert result.current.uv_index is None
    assert result.current.feels_like is None
    assert result.current.pressure is None


def test_optional_current_extras_are_mapped_when_present():
    result = normalize_weather(
        _upstream(
            current={
                "temperature": 22.0,
                "humidity": 45,
                "uv_index": 6,
                "pressure": 1012,
                "feels_like": 24,
            }
        )
    )
    assert result.current.humidity == 45
    assert result.current.uv_index == 6
    assert result.current.pressure == 1012
    assert result.current.feels_like == 24


def test_precip_last_24h_sums_hourly_window():
    result = normalize_weather(
        _upstream(
            current={"time": "2026-08-19T12:00", "temperature": 22.0, "weathercode": 0},
            hourly=[
                {"time": "2026-08-18T11:00", "temp": 16.0, "precipitation": 9.0, "weathercode": 0},
                {"time": "2026-08-19T00:00", "temp": 16.0, "precipitation": 0.5, "weathercode": 0},
                {"time": "2026-08-19T12:00", "temp": 22.0, "precipitation": 1.5, "weathercode": 0},
            ],
        )
    )
    assert result.current.precip_last_24h == 2.0


def test_place_name_passthrough():
    result = normalize_weather(_upstream(), place_name="Nairobi, Kenya")
    assert result.place_name == "Nairobi, Kenya"


# ── Missing current block ──────────────────────────────────────────

def test_missing_current_raises_value_error():
    upstream = UpstreamWeatherResponse(lat=0, lon=0, current=None)
    with pytest.raises(ValueError, match="current"):
        normalize_weather(upstream)


# ── None/missing fields default gracefully ─────────────────────────

def test_none_fields_default_to_zero():
    result = normalize_weather(
        _upstream(current={"temperature": None, "windspeed": None, "weathercode": None})
    )
    assert result.current.temperature == 0.0
    assert result.current.wind_speed == 0.0
    assert result.current.weather_code == 0


def test_zero_values_are_preserved_not_treated_as_missing():
    """Regression: 'or 0.0' would treat 0.0 as falsy and replace it."""
    result = normalize_weather(
        _upstream(
            lat=0.0,
            lon=0.0,
            current={"temperature": 0.0, "windspeed": 0.0, "winddirection": 0.0, "weathercode": 0},
            daily=[{"date": "2026-01-01", "temp_max": 0.0, "temp_min": 0.0, "precipitation": 0.0, "weathercode": 0}],
            hourly=[{"time": "2026-01-01T00:00", "temp": 0.0, "precipitation": 0.0, "weathercode": 0}],
        )
    )
    assert result.lat == 0.0
    assert result.lon == 0.0
    assert result.current.temperature == 0.0
    assert result.current.wind_speed == 0.0
    assert result.current.wind_direction == 0.0
    assert result.current.weather_code == 0
    assert result.current.weather_description == "Clear sky"
    assert result.daily[0].temp_max == 0.0
    assert result.daily[0].precipitation == 0.0
    assert result.hourly[0].temperature == 0.0
    assert result.hourly[0].precipitation == 0.0


def test_missing_daily_precipitation_is_null_not_zero():
    result = normalize_weather(
        _upstream(
            daily=[{"date": "2026-08-19", "temp_max": 24.0, "temp_min": 15.0, "weathercode": 1}],
        )
    )
    assert result.daily[0].precipitation is None


def test_missing_hourly_precipitation_is_null_not_zero():
    result = normalize_weather(
        _upstream(
            hourly=[{"time": "2026-08-19T00:00", "temp": 16.0, "weathercode": 1}],
        )
    )
    assert result.hourly[0].precipitation is None


def test_null_daily_precipitation_is_null():
    result = normalize_weather(
        _upstream(
            daily=[
                {
                    "date": "2026-08-19",
                    "temp_max": 24.0,
                    "temp_min": 15.0,
                    "precipitation": None,
                    "weathercode": 1,
                }
            ],
        )
    )
    assert result.daily[0].precipitation is None


def test_null_hourly_precipitation_is_null():
    result = normalize_weather(
        _upstream(
            hourly=[
                {
                    "time": "2026-08-19T00:00",
                    "temp": 16.0,
                    "precipitation": None,
                    "weathercode": 1,
                }
            ],
        )
    )
    assert result.hourly[0].precipitation is None


def test_positive_daily_and_hourly_precipitation_preserved():
    result = normalize_weather(
        _upstream(
            daily=[
                {
                    "date": "2026-08-19",
                    "temp_max": 24.0,
                    "temp_min": 15.0,
                    "precipitation": 2.7,
                    "weathercode": 61,
                }
            ],
            hourly=[
                {
                    "time": "2026-08-19T00:00",
                    "temp": 16.0,
                    "precipitation": 2.7,
                    "weathercode": 61,
                }
            ],
        )
    )
    assert result.daily[0].precipitation == 2.7
    assert result.hourly[0].precipitation == 2.7


def test_precip_last_24h_does_not_treat_missing_hourly_as_zero():
    result = normalize_weather(
        _upstream(
            current={"time": "2026-08-19T12:00", "temperature": 22.0, "weathercode": 0},
            hourly=[
                {"time": "2026-08-19T00:00", "temp": 16.0, "precipitation": 0.5, "weathercode": 0},
                {"time": "2026-08-19T06:00", "temp": 16.0, "weathercode": 0},
                {"time": "2026-08-19T12:00", "temp": 22.0, "precipitation": 0.0, "weathercode": 0},
            ],
        )
    )
    assert result.current.precip_last_24h == 0.5
    assert result.hourly[1].precipitation is None
    assert result.hourly[2].precipitation == 0.0
