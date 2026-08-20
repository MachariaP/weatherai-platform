# Backend resilience (Phase F + G)

Process-local controls around WeatherAI. They are **not** shared across
multiple FastAPI workers. The selected production topology is **one uvicorn
worker on one instance**, so Redis is **not required**. See
`DOCS/deployment.md`.

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

## Process-local state

| Component | Implementation | Single process | 2 workers | 2 replicas | Shared state needed? |
|---|---|---|---|---|---|
| Weather cache | `InMemoryCache` module dict, lazy TTL | HIT after first MISS | Duplicate MISSes / quota | Same | No for 1×1; yes if scaled |
| Geocode cache | separate `InMemoryCache` | HIT after first search | Duplicate Photon calls | Same | No for 1×1 |
| Rate limiter | sliding window + `threading.Lock` | One uncached budget | Each worker has a full budget | Same | No for 1×1; yes if scaled |
| Circuit breaker | in-process state machine + lock | One OPEN/CLOSED | Independent; one worker can still call WeatherAI | Same | No (keep local even if cache is later shared) |

Concurrency: limiter and breaker use short `threading.Lock` sections (async
FastAPI, one process). They do not sleep under the lock.

Lifecycle: module singletons (`_cache`, `get_weather_limiter()`,
`get_weather_breaker()`). They live until process exit.

## Restart behavior (memory mode)

Process restart or Render cold start **resets** cache, limiter, and breaker.
The next weather request is a MISS. The breaker starts CLOSED. Limiter
allowance is full. This is intentional for the 1×1 topology.

If Redis were added later, cache/limiter entries would survive process restart
until TTL. The breaker would stay local unless explicitly redesigned.

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

Behind Next.js, FastAPI usually sees the **frontend server egress IP**, not
the browser IP, unless `X-Forwarded-For` is present. That makes the limiter a
**service-wide uncached budget**, which still protects WeatherAI quota. It is
not a per-user account quota (there are no accounts).

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

A shared/distributed breaker is **not** planned even if cache later moves to
Redis: a local breaker lets one process recover independently and avoids
coordination bugs. Duplicate probes across replicas are acceptable at this
scale.

## When Redis becomes necessary

Not now. Add it only after changing the topology to multiple workers or
replicas:

1. Shared **weather** cache (normalized `WeatherResponse` JSON, TTL, corrupt
   entry = MISS, Redis down = log + MISS, do not fail liveness).
2. Shared **uncached** limiter (atomic increment; cache HIT still free).
3. Leave the circuit breaker process-local unless a later review says otherwise.

Unit tests must keep using in-memory fakes. Do not require Redis to run CI.

## Logging

JSON lines on the `app.events` logger. Typical events:

`http_request`, `weather_request`, `cache_hit` / `cache_miss`,
`weatherai_request`, `weatherai_retry`, `weatherai_success` / `weatherai_failure`,
`rate_limit_rejected`, `circuit_opened` / `circuit_half_open` / `circuit_closed`.

Correlation: `X-Request-ID`. Next.js `/api/weather` forwards a safe incoming
ID or generates one. FastAPI reuses it when valid.

Never logged: API keys, `Authorization` / Bearer values, cookies, weather
payloads, raw upstream bodies, Redis URLs (none configured). Coordinates are
not written on the default `http_request` line (path + request ID only).
