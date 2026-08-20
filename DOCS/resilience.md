# Backend resilience (Phase F)

Process-local controls around WeatherAI. They are **not** shared across
multiple FastAPI workers. Redis belongs to a later phase if the deployment
needs shared state.

## Request flow

```
GET /weather
  → validation
  → cache lookup
       ├── HIT  → return (no limiter, no breaker, no WeatherAI)
       └── MISS
            → circuit fail-fast if OPEN (or HALF_OPEN probe busy)
            → application rate-limit (uncached WeatherAI budget)
            → circuit enter (HALF_OPEN probe reservation)
            → existing retry wrapper → WeatherAI
            → breaker records the *final* result (not each attempt)
            → normalize + cache success → return
```

`/health`, `/geocode`, `/reverse`, and `/geolocate` are not behind this
limiter or breaker. They still get request IDs and `http_request` logs.

## Application rate limit

- Key: first `X-Forwarded-For` hop, else `request.client.host`
- Sliding window, in memory
- Consumes budget **before** the upstream call (failed misses still count)
- Cache HIT does not consume budget
- An OPEN circuit fail-fast does **not** consume budget
- Public error: `429` `{ "error": "rate_limited", "message": "..." }`
  plus `Retry-After` when known
- Distinct from WeatherAI quota: `429` `{ "error": "rate_limit" }`

Defaults: `RATE_LIMIT_REQUESTS=60` per `RATE_LIMIT_WINDOW_SECONDS=60`.

Loopback/dev traffic often shares one identity (`127.0.0.1` / `testclient`).

## Circuit breaker

States: `closed` → `open` → `half_open`.

Qualifying **final** failures: WeatherAI 500/503, timeout, network error.
Not counted: 400, 401, 403, 429, malformed 200.

- Threshold consecutive qualifying finals → OPEN
- OPEN: fail fast, no retries, no WeatherAI. Cache HIT still works.
- After `CIRCUIT_COOLDOWN_SECONDS`, ONE probe (HALF_OPEN)
- Probe success → CLOSED; probe qualifying failure → OPEN again
- Public fail-fast: `503` `{ "error": "upstream_unavailable", ... }`
  (message does not say "circuit")

Defaults: `CIRCUIT_FAILURE_THRESHOLD=5`, `CIRCUIT_COOLDOWN_SECONDS=30`.

## Logging

JSON lines on the `app.events` logger. Typical events:

`http_request`, `weather_request`, `cache_hit` / `cache_miss`,
`weatherai_request`, `weatherai_retry`, `weatherai_success` / `weatherai_failure`,
`rate_limit_rejected`, `circuit_opened` / `circuit_half_open` / `circuit_closed`.

Correlation: `X-Request-ID`. Next.js `/api/weather` forwards a safe incoming
ID or generates one. FastAPI reuses it when valid.

Never logged: API keys, `Authorization` / Bearer values, cookies, weather
payloads, raw upstream bodies. Coordinates are not written on the default
`http_request` line (path + request ID only).
