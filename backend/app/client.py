"""
WeatherAI upstream client.

Owns: URL construction, authentication, query parameters, timeout,
HTTP request execution, upstream status-code handling, rate-limit
header extraction.

Does NOT own: FastAPI routing, caching, presentation, retry logic.
Retry is composed in via the separate retry wrapper.
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from app.config import Settings, get_settings, require_api_key
from app.errors import (
    WeatherAIAuthError,
    WeatherAIBadRequestError,
    WeatherAIForbiddenError,
    WeatherAIMalformedResponseError,
    WeatherAIRateLimitError,
    WeatherAIServerError,
    WeatherAITimeoutError,
    WeatherAIUnavailableError,
)
from app.observability import log_event


class RateLimitInfo:
    """Parsed rate-limit headers from an upstream response."""

    __slots__ = ("limit", "remaining", "reset_epoch")

    def __init__(
        self,
        limit: int | None = None,
        remaining: int | None = None,
        reset_epoch: int | None = None,
    ) -> None:
        self.limit = limit
        self.remaining = remaining
        self.reset_epoch = reset_epoch

    @classmethod
    def from_headers(cls, headers: httpx.Headers) -> RateLimitInfo:
        def _int_or_none(key: str) -> int | None:
            val = headers.get(key)
            if val is None:
                return None
            try:
                return int(val)
            except ValueError:
                return None

        return cls(
            limit=_int_or_none("x-ratelimit-limit"),
            remaining=_int_or_none("x-ratelimit-remaining"),
            reset_epoch=_int_or_none("x-ratelimit-reset"),
        )


class UpstreamResponse:
    """Container for a successful upstream call: body + rate-limit info."""

    __slots__ = ("data", "rate_limit")

    def __init__(self, data: dict[str, Any], rate_limit: RateLimitInfo) -> None:
        self.data = data
        self.rate_limit = rate_limit


class WeatherAIClient:
    """
    Low-level async client for the WeatherAI REST API.

    Each public method makes exactly one HTTP call and either returns
    an UpstreamResponse or raises a typed WeatherAI*Error.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._api_key = require_api_key(self._settings)
        self._base_url = self._settings.weatherai_base_url.rstrip("/")
        self._timeout = self._settings.weatherai_timeout

    def _build_url(self, path: str) -> str:
        return f"{self._base_url}{path}"

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}"}

    async def get_weather(
        self,
        *,
        lat: float,
        lon: float,
        days: int = 7,
        ai: bool = False,
        units: str = "metric",
        lang: str = "en",
    ) -> UpstreamResponse:
        """Call GET /v1/weather and return the parsed response."""
        params: dict[str, str | int | bool] = {
            "lat": lat,
            "lon": lon,
            "days": days,
            "ai": ai,
            "units": units,
            "lang": lang,
        }
        return await self._request("/v1/weather", params)

    async def _request(
        self,
        path: str,
        params: dict[str, Any],
    ) -> UpstreamResponse:
        """Execute a single GET request against the upstream API."""
        url = self._build_url(path)
        started = time.monotonic()
        upstream_status: int | None = None
        error_type: str | None = None

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as http:
                response = await http.get(
                    url,
                    params=params,
                    headers=self._auth_headers(),
                )
            upstream_status = response.status_code
        except httpx.TimeoutException as exc:
            error_type = "timeout"
            log_event(
                "weatherai_request",
                upstream="weatherai",
                upstream_status=None,
                upstream_duration_ms=round((time.monotonic() - started) * 1000, 1),
                error_type=error_type,
            )
            raise WeatherAITimeoutError(
                f"WeatherAI did not respond within {self._timeout}s",
                status_code=None,
            ) from exc
        except httpx.RequestError as exc:
            error_type = "network"
            log_event(
                "weatherai_request",
                upstream="weatherai",
                upstream_status=None,
                upstream_duration_ms=round((time.monotonic() - started) * 1000, 1),
                error_type=error_type,
            )
            raise WeatherAIUnavailableError(
                "WeatherAI network error",
                status_code=None,
            ) from exc

        duration_ms = round((time.monotonic() - started) * 1000, 1)
        rate_limit = RateLimitInfo.from_headers(response.headers)

        try:
            self._raise_for_status(response, rate_limit)
        except Exception as exc:
            log_event(
                "weatherai_request",
                upstream="weatherai",
                upstream_status=upstream_status,
                upstream_duration_ms=duration_ms,
                error_type=type(exc).__name__,
            )
            raise

        try:
            data = response.json()
        except Exception as exc:
            log_event(
                "weatherai_request",
                upstream="weatherai",
                upstream_status=upstream_status,
                upstream_duration_ms=duration_ms,
                error_type="malformed",
            )
            raise WeatherAIMalformedResponseError(
                "WeatherAI returned 200 but body is not valid JSON",
                status_code=200,
            ) from exc

        if not isinstance(data, dict):
            log_event(
                "weatherai_request",
                upstream="weatherai",
                upstream_status=upstream_status,
                upstream_duration_ms=duration_ms,
                error_type="malformed",
            )
            raise WeatherAIMalformedResponseError(
                f"Expected JSON object, got {type(data).__name__}",
                status_code=200,
            )

        log_event(
            "weatherai_request",
            upstream="weatherai",
            upstream_status=upstream_status,
            upstream_duration_ms=duration_ms,
        )
        return UpstreamResponse(data=data, rate_limit=rate_limit)

    @staticmethod
    def _raise_for_status(
        response: httpx.Response,
        rate_limit: RateLimitInfo,
    ) -> None:
        """Map non-2xx status codes to typed exceptions."""
        status = response.status_code
        if 200 <= status < 300:
            return

        body_text = response.text[:500]

        if status == 400:
            raise WeatherAIBadRequestError(
                f"Bad request: {body_text}", status_code=400
            )
        if status == 401:
            raise WeatherAIAuthError(
                "Authentication failed — check WEATHERAI_API_KEY",
                status_code=401,
            )
        if status == 403:
            raise WeatherAIForbiddenError(
                f"Feature not available on current plan: {body_text}",
                status_code=403,
            )
        if status == 429:
            raise WeatherAIRateLimitError(
                "Monthly quota exhausted",
                reset_epoch=rate_limit.reset_epoch,
                remaining=rate_limit.remaining,
            )
        if status == 500:
            raise WeatherAIServerError(
                f"WeatherAI internal error: {body_text}", status_code=500
            )
        if status == 503:
            raise WeatherAIUnavailableError(
                f"WeatherAI unavailable: {body_text}", status_code=503
            )

        raise WeatherAIServerError(
            f"Unexpected upstream status {status}: {body_text}",
            status_code=status,
        )
