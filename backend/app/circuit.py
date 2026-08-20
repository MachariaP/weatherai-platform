"""
Process-local circuit breaker for WeatherAI.

Records the *final* result of a retried operation, not each attempt.
OPEN fail-fast happens before the app rate limiter so an outage does not
consume uncached request budget.
"""
from __future__ import annotations

import threading
import time
from enum import Enum
from typing import Callable

from app.config import Settings, get_settings
from app.errors import (
    WeatherAIServerError,
    WeatherAITimeoutError,
    WeatherAIUnavailableError,
)
from app.observability import log_event

Clock = Callable[[], float]

QUALIFYING_FAILURES = (
    WeatherAIServerError,
    WeatherAIUnavailableError,
    WeatherAITimeoutError,
)


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


def is_qualifying_failure(exc: BaseException) -> bool:
    return isinstance(exc, QUALIFYING_FAILURES)


class CircuitBreaker:
    def __init__(
        self,
        *,
        failure_threshold: int,
        cooldown_seconds: float,
        clock: Clock,
    ) -> None:
        if failure_threshold < 1:
            raise ValueError("circuit failure threshold must be >= 1")
        if cooldown_seconds <= 0:
            raise ValueError("circuit cooldown must be > 0")
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self._clock = clock
        self._lock = threading.Lock()
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._opened_at: float | None = None
        self._probe_in_flight = False

    @property
    def state(self) -> CircuitState:
        with self._lock:
            self._maybe_arm_half_open()
            return self._state

    def blocked(self) -> bool:
        """True when the request should fail fast without consuming limiter budget."""
        with self._lock:
            self._maybe_arm_half_open()
            if self._state == CircuitState.OPEN:
                return True
            if self._state == CircuitState.HALF_OPEN and self._probe_in_flight:
                return True
            return False

    def enter(self) -> bool:
        """Reserve a HALF_OPEN probe if needed. Call after the limiter allows."""
        with self._lock:
            self._maybe_arm_half_open()
            if self._state == CircuitState.OPEN:
                return False
            if self._state == CircuitState.HALF_OPEN:
                if self._probe_in_flight:
                    return False
                self._probe_in_flight = True
                return True
            return True

    def record_success(self) -> None:
        with self._lock:
            self._consecutive_failures = 0
            self._probe_in_flight = False
            self._opened_at = None
            if self._state != CircuitState.CLOSED:
                self._state = CircuitState.CLOSED
                log_event("circuit_closed")

    def record_qualifying_failure(self) -> None:
        with self._lock:
            self._probe_in_flight = False
            if self._state == CircuitState.HALF_OPEN:
                self._open_locked()
                return
            self._consecutive_failures += 1
            if self._consecutive_failures >= self.failure_threshold:
                self._open_locked()

    def record_non_qualifying(self) -> None:
        """Upstream answered; infrastructure is reachable."""
        self.record_success()

    def _maybe_arm_half_open(self) -> None:
        if self._state != CircuitState.OPEN or self._opened_at is None:
            return
        if self._clock() - self._opened_at >= self.cooldown_seconds:
            self._state = CircuitState.HALF_OPEN
            self._probe_in_flight = False
            log_event("circuit_half_open")

    def _open_locked(self) -> None:
        self._state = CircuitState.OPEN
        self._opened_at = self._clock()
        log_event("circuit_opened")


_breaker: CircuitBreaker | None = None
_breaker_lock = threading.Lock()


def get_weather_breaker(settings: Settings | None = None) -> CircuitBreaker:
    global _breaker
    with _breaker_lock:
        if _breaker is None:
            s = settings or get_settings()
            _breaker = CircuitBreaker(
                failure_threshold=s.circuit_failure_threshold,
                cooldown_seconds=s.circuit_cooldown_seconds,
                clock=time.monotonic,
            )
        return _breaker


def reset_weather_breaker(instance: CircuitBreaker | None = None) -> None:
    global _breaker
    with _breaker_lock:
        _breaker = instance
