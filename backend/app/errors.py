"""
Typed exceptions for upstream WeatherAI failures.

Each failure mode has its own type so callers (routes, tests) can handle
them precisely rather than parsing status codes or message strings.
"""


class WeatherAIError(Exception):
    """Base for all upstream errors."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class WeatherAIAuthError(WeatherAIError):
    """401 — missing, malformed, or revoked API key."""


class WeatherAIForbiddenError(WeatherAIError):
    """403 — plan doesn't include the requested feature."""


class WeatherAIBadRequestError(WeatherAIError):
    """400 — invalid parameters sent upstream."""


class WeatherAIRateLimitError(WeatherAIError):
    """429 — monthly quota exhausted."""

    def __init__(
        self,
        message: str,
        reset_epoch: int | None = None,
        remaining: int | None = None,
    ) -> None:
        super().__init__(message, status_code=429)
        self.reset_epoch = reset_epoch
        self.remaining = remaining


class WeatherAIServerError(WeatherAIError):
    """500 — upstream internal error (retryable)."""


class WeatherAIUnavailableError(WeatherAIError):
    """503 — upstream database unreachable (retryable)."""


class WeatherAITimeoutError(WeatherAIError):
    """Upstream did not respond within the configured timeout."""


class WeatherAIMalformedResponseError(WeatherAIError):
    """200 but response body is not valid / expected JSON."""
