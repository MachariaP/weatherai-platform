"""Reset process-local limiter/breaker/weather cache between tests."""
from __future__ import annotations

import pytest

from app.circuit import reset_weather_breaker
from app.rate_limit import reset_weather_limiter
from app.routes.weather import _cache


@pytest.fixture(autouse=True)
def _reset_weather_protection():
    reset_weather_limiter()
    reset_weather_breaker()
    _cache.clear()
    yield
    reset_weather_limiter()
    reset_weather_breaker()
    _cache.clear()
