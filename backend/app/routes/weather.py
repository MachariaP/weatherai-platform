"""
Weather route — deliberately boring.

Validates input, checks cache, delegates to client (via retry),
normalizes the response, caches it, and returns our contract.
Error translation maps typed exceptions to HTTP responses.
"""
from __future__ import annotations

import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from app.cache import DEFAULT_TTL_SECONDS, InMemoryCache, make_cache_key
from app.circuit import get_weather_breaker, is_qualifying_failure
from app.client import WeatherAIClient
from app.config import get_settings
from app.errors import (
    WeatherAIAuthError,
    WeatherAIBadRequestError,
    WeatherAIError,
    WeatherAIForbiddenError,
    WeatherAIMalformedResponseError,
    WeatherAIRateLimitError,
    WeatherAIServerError,
    WeatherAITimeoutError,
    WeatherAIUnavailableError,
)
from app.geocode import reverse_place
from app.models import (
    UpstreamWeatherResponse,
    WeatherResponse,
    api_error_responses,
)
from app.normalize import normalize_weather
from app.observability import log_event
from app.rate_limit import client_identity, get_weather_limiter
from app.retry import with_retry

logger = logging.getLogger(__name__)

router = APIRouter()

_cache = InMemoryCache()

_CIRCUIT_UNAVAILABLE = {
    "error": "upstream_unavailable",
    "message": "Weather service is temporarily unavailable.",
}
_APP_RATE_LIMITED = {
    "error": "rate_limited",
    "message": "Too many requests. Please try again shortly.",
}


def _weather_json(
    status_code: int,
    content: dict,
    *,
    cache: str | None = None,
    extra_headers: dict[str, str] | None = None,
    **log_fields: object,
) -> JSONResponse:
    headers = dict(extra_headers or {})
    if cache is not None:
        headers["X-Cache"] = cache
    log_event(
        "weather_request",
        status_code=status_code,
        cache=cache,
        **log_fields,
    )
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=headers or None,
    )


@router.get(
    "/weather",
    response_model=WeatherResponse,
    response_class=JSONResponse,
    responses=api_error_responses(400, 403, 429, 502, 503, 504),
    openapi_extra={
        "responses": {
            "200": {
                "headers": {
                    "X-Cache": {
                        "description": (
                            "HIT when served from the FastAPI weather cache, "
                            "otherwise MISS"
                        ),
                        "schema": {"type": "string", "enum": ["HIT", "MISS"]},
                    }
                }
            }
        }
    },
)
async def get_weather(
    request: Request,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    days: Annotated[int, Query(ge=1, le=7)] = 7,
    ai: bool = False,
    units: Annotated[Literal["metric", "imperial"], Query()] = "metric",
    lang: str = "en",
) -> JSONResponse:
    cache_key = make_cache_key(
        lat=lat, lon=lon, days=days, units=units, ai=ai, lang=lang,
    )

    cached = _cache.get(cache_key)
    if cached is not None:
        log_event("cache_hit")
        return _weather_json(200, cached, cache="HIT")

    log_event("cache_miss")
    breaker = get_weather_breaker()
    if breaker.blocked():
        log_event("circuit_reject")
        return _weather_json(503, _CIRCUIT_UNAVAILABLE)

    limiter = get_weather_limiter()
    decision = limiter.check(client_identity(request))
    if not decision.allowed:
        log_event("rate_limit_rejected")
        extra = (
            {"Retry-After": str(decision.retry_after_seconds)}
            if decision.retry_after_seconds is not None
            else None
        )
        return _weather_json(429, _APP_RATE_LIMITED, extra_headers=extra)

    if not breaker.enter():
        log_event("circuit_reject")
        return _weather_json(503, _CIRCUIT_UNAVAILABLE)

    settings = get_settings()
    client = WeatherAIClient(settings)

    try:
        result = await with_retry(
            lambda: client.get_weather(
                lat=lat, lon=lon, days=days, ai=ai, units=units, lang=lang,
            ),
            max_attempts=settings.weatherai_max_retries,
        )
    except WeatherAIAuthError:
        breaker.record_non_qualifying()
        return _weather_json(
            502,
            {"error": "upstream_auth", "message": "Service configuration error"},
        )
    except WeatherAIForbiddenError as exc:
        breaker.record_non_qualifying()
        return _weather_json(
            403,
            {"error": "plan_restriction", "message": str(exc)},
        )
    except WeatherAIBadRequestError as exc:
        breaker.record_non_qualifying()
        return _weather_json(
            400,
            {"error": "bad_request", "message": str(exc)},
        )
    except WeatherAIRateLimitError as exc:
        breaker.record_non_qualifying()
        headers = {}
        if exc.reset_epoch is not None:
            headers["X-RateLimit-Reset"] = str(exc.reset_epoch)
        return _weather_json(
            429,
            {"error": "rate_limit", "message": "API quota exhausted"},
            extra_headers=headers or None,
        )
    except (WeatherAIServerError, WeatherAIUnavailableError) as exc:
        breaker.record_qualifying_failure()
        logger.error("Upstream failed after retries: %s", exc)
        log_event("weatherai_failure", error_type=type(exc).__name__)
        return _weather_json(
            502,
            {"error": "upstream_error", "message": "Weather service temporarily unavailable"},
        )
    except WeatherAITimeoutError:
        breaker.record_qualifying_failure()
        log_event("weatherai_failure", error_type="WeatherAITimeoutError")
        return _weather_json(
            504,
            {"error": "timeout", "message": "Weather service did not respond in time"},
        )
    except WeatherAIMalformedResponseError as exc:
        breaker.record_non_qualifying()
        logger.error("Malformed upstream response: %s", exc)
        return _weather_json(
            502,
            {"error": "malformed_response", "message": "Unexpected response from weather service"},
        )
    except WeatherAIError as exc:
        if is_qualifying_failure(exc):
            breaker.record_qualifying_failure()
        else:
            breaker.record_non_qualifying()
        logger.error("Unhandled upstream error: %s", exc)
        return _weather_json(
            502,
            {"error": "upstream_error", "message": "Weather service error"},
        )

    breaker.record_success()
    log_event("weatherai_success")

    upstream = UpstreamWeatherResponse.model_validate(result.data)

    try:
        normalized = normalize_weather(upstream)
    except Exception as exc:
        logger.error("Normalization failed: %s", exc)
        return _weather_json(
            502,
            {"error": "malformed_response", "message": "Could not process weather data"},
        )

    place_name = await reverse_place(normalized.lat, normalized.lon)
    if place_name:
        normalized = normalized.model_copy(update={"place_name": place_name})

    response_data = normalized.model_dump()
    _cache.set(cache_key, response_data, DEFAULT_TTL_SECONDS)

    return _weather_json(200, response_data, cache="MISS")
