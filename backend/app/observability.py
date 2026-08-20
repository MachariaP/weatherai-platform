"""
Structured request logging and correlation IDs.

Logs are JSON objects. They must never include API keys, Authorization
headers, cookies, or upstream response bodies.
"""
from __future__ import annotations

import json
import logging
import re
import time
import uuid
from contextvars import ContextVar
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{8,128}$")

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)

_BEARER_RE = re.compile(r"(?i)(Bearer\s+)\S+")
_WAI_KEY_RE = re.compile(r"\bwai_[A-Za-z0-9]{8,}\b")
_AUTH_HEADER_RE = re.compile(r"(?i)(Authorization\s*[:=]\s*)\S+")
_ENV_KEY_RE = re.compile(r"(?i)WEATHERAI_API_KEY\s*[:=]\s*\S+")

_events = logging.getLogger("app.events")


def get_request_id() -> str | None:
    return _request_id.get()


def resolve_request_id(incoming: str | None) -> str:
    candidate = (incoming or "").strip()
    if _REQUEST_ID_RE.fullmatch(candidate):
        return candidate
    return str(uuid.uuid4())


def redact(text: str) -> str:
    """Strip credentials that must never appear in logs."""
    text = _BEARER_RE.sub(r"\1[REDACTED]", text)
    text = _AUTH_HEADER_RE.sub(r"\1[REDACTED]", text)
    text = _ENV_KEY_RE.sub("WEATHERAI_API_KEY=[REDACTED]", text)
    text = _WAI_KEY_RE.sub("wai_[REDACTED]", text)
    return text


def log_event(event: str, **fields: Any) -> None:
    payload: dict[str, Any] = {"event": event}
    request_id = get_request_id()
    if request_id:
        payload["request_id"] = request_id
    for key, value in fields.items():
        if value is not None:
            payload[key] = value
    _events.info(redact(json.dumps(payload, default=str, separators=(",", ":"))))


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assign X-Request-ID and emit one http_request log per call."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = resolve_request_id(request.headers.get("x-request-id"))
        token = _request_id.set(request_id)
        started = time.monotonic()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers[REQUEST_ID_HEADER] = request_id
            return response
        finally:
            duration_ms = round((time.monotonic() - started) * 1000, 1)
            log_event(
                "http_request",
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=duration_ms,
            )
            _request_id.reset(token)
