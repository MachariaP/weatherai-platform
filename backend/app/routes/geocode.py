"""Geocode routes — Photon via FastAPI, never exposed as WeatherAI."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from app.geocode import (
    GeocodeError,
    GeocodeNotFoundError,
    GeocodeTimeoutError,
    GeocodeUnavailableError,
    locate_by_ip,
    reverse_place,
    search_places,
)
from app.models import GeocodeResult, GeocodeSearchResponse, api_error_responses

router = APIRouter()


@router.get(
    "/geocode",
    response_model=GeocodeSearchResponse,
    response_class=JSONResponse,
    responses=api_error_responses(400, 503, 504),
)
async def geocode(q: Annotated[str, Query(min_length=2, max_length=200)]) -> JSONResponse:
    try:
        results = await search_places(q)
    except GeocodeNotFoundError as exc:
        return JSONResponse(
            status_code=400,
            content={"error": "bad_request", "message": str(exc)},
        )
    except GeocodeTimeoutError:
        return JSONResponse(
            status_code=504,
            content={"error": "timeout", "message": "Location search timed out"},
        )
    except (GeocodeUnavailableError, GeocodeError):
        return JSONResponse(
            status_code=503,
            content={"error": "geocode_unavailable", "message": "Location search is unavailable"},
        )
    payload = GeocodeSearchResponse.model_validate({"results": results})
    return JSONResponse(content=payload.model_dump(exclude_none=True))


@router.get(
    "/reverse",
    response_model=GeocodeResult,
    response_class=JSONResponse,
    responses=api_error_responses(404),
)
async def reverse(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
) -> JSONResponse:
    label = await reverse_place(lat, lon)
    if not label:
        return JSONResponse(
            status_code=404,
            content={"error": "not_found", "message": "No place name for these coordinates"},
        )
    payload = GeocodeResult(lat=lat, lon=lon, label=label)
    return JSONResponse(content=payload.model_dump(exclude_none=True))


def _request_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    if request.client and request.client.host:
        return request.client.host
    return None


@router.get(
    "/geolocate",
    response_model=GeocodeResult,
    response_class=JSONResponse,
    responses=api_error_responses(404, 503, 504),
)
async def geolocate(request: Request) -> JSONResponse:
    try:
        result = await locate_by_ip(_request_ip(request))
    except GeocodeNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content={"error": "not_found", "message": str(exc)},
        )
    except GeocodeTimeoutError:
        return JSONResponse(
            status_code=504,
            content={"error": "timeout", "message": "Location search timed out"},
        )
    except (GeocodeUnavailableError, GeocodeError):
        return JSONResponse(
            status_code=503,
            content={"error": "geocode_unavailable", "message": "Location search is unavailable"},
        )
    payload = GeocodeResult.model_validate(result)
    return JSONResponse(content=payload.model_dump(exclude_none=True))
