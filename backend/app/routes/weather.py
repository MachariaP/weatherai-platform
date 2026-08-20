"""
Weather route — deliberately boring.

Validates input, checks cache, delegates to client (via retry),
normalizes the response, caches it, and returns our contract.
Error translation maps typed exceptions to HTTP responses.
"""
from __future__ import annotations

import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.cache import DEFAULT_TTL_SECONDS, InMemoryCache, make_cache_key
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
from app.retry import with_retry

logger = logging.getLogger(__name__)

router = APIRouter()

_cache = InMemoryCache()


@router.get(
    "/weather",
    response_model=WeatherResponse,
    response_class=JSONResponse,
    responses=api_error_responses(400, 403, 429, 502, 504),
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
        return JSONResponse(content=cached, headers={"X-Cache": "HIT"})

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
        return JSONResponse(
            status_code=502,
            content={"error": "upstream_auth", "message": "Service configuration error"},
        )
    except WeatherAIForbiddenError as exc:
        return JSONResponse(
            status_code=403,
            content={"error": "plan_restriction", "message": str(exc)},
        )
    except WeatherAIBadRequestError as exc:
        return JSONResponse(
            status_code=400,
            content={"error": "bad_request", "message": str(exc)},
        )
    except WeatherAIRateLimitError as exc:
        headers = {}
        if exc.reset_epoch is not None:
            headers["X-RateLimit-Reset"] = str(exc.reset_epoch)
        return JSONResponse(
            status_code=429,
            content={"error": "rate_limit", "message": "API quota exhausted"},
            headers=headers or None,
        )
    except (WeatherAIServerError, WeatherAIUnavailableError) as exc:
        logger.error("Upstream failed after retries: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"error": "upstream_error", "message": "Weather service temporarily unavailable"},
        )
    except WeatherAITimeoutError:
        return JSONResponse(
            status_code=504,
            content={"error": "timeout", "message": "Weather service did not respond in time"},
        )
    except WeatherAIMalformedResponseError as exc:
        logger.error("Malformed upstream response: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"error": "malformed_response", "message": "Unexpected response from weather service"},
        )
    except WeatherAIError as exc:
        logger.error("Unhandled upstream error: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"error": "upstream_error", "message": "Weather service error"},
        )

    upstream = UpstreamWeatherResponse.model_validate(result.data)

    try:
        normalized = normalize_weather(upstream)
    except Exception as exc:
        logger.error("Normalization failed: %s", exc)
        return JSONResponse(
            status_code=502,
            content={"error": "malformed_response", "message": "Could not process weather data"},
        )

    place_name = await reverse_place(normalized.lat, normalized.lon)
    if place_name:
        normalized = normalized.model_copy(update={"place_name": place_name})

    response_data = normalized.model_dump()
    _cache.set(cache_key, response_data, DEFAULT_TTL_SECONDS)

    return JSONResponse(content=response_data, headers={"X-Cache": "MISS"})
