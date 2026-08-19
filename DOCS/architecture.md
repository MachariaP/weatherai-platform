# Architecture

## Overview

Two-service architecture: a **FastAPI backend** (Python) handles all upstream API interaction, and a **Next.js frontend** (TypeScript) serves as a thin proxy and UI layer.

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Browser  │────▶│  Next.js        │────▶│  FastAPI          │────▶│  WeatherAI   │
│           │◀────│  /api/weather   │◀────│  /weather         │◀────│  API         │
└──────────┘     └─────────────────┘     └──────────────────┘     └──────────────┘
                  Server-side only        Owns: auth, retry,       External service
                  Validates params        cache, normalization     (untrusted docs)
                  Forwards X-Cache
                  cache: "no-store"
```

## Frozen Contract

The boundaries below are frozen. New work must preserve them; they are not
subject to change without an explicit architecture decision.

| Concern | Owner |
|---|---|
| WeatherAI API key | FastAPI only |
| WeatherAI base URL | FastAPI only |
| Upstream authentication (Bearer) | FastAPI only |
| Upstream request parameters | FastAPI only |
| Timeout | FastAPI only |
| Retry policy | FastAPI only |
| Upstream error mapping | FastAPI only |
| Response validation (upstream models) | FastAPI only |
| Response normalization | FastAPI only |
| TTL caching | FastAPI only |
| Cache key generation | FastAPI only |
| Browser-facing API boundary | Next.js `/api/weather` only |
| TypeScript representation of the public contract | Next.js (`lib/types.ts`) |
| Parameter validation at the browser boundary | Next.js route handler |
| Translation of backend/network failures | Next.js |
| UI state / presentation | Next.js |

**The browser must never:**

- call WeatherAI directly
- know the WeatherAI API key
- receive `NEXT_PUBLIC_*` WeatherAI credentials
- contain a second WeatherAI client
- contain a second cache

## Service Responsibilities

### FastAPI Backend

- **API key auth** — holds the WeatherAI API key; never exposed to the browser
- **Retries** — exponential backoff for 5xx responses from upstream
- **Error handling** — maps upstream failures to structured error responses
- **Normalization** — two-layer data models transform raw upstream data into a stable public contract
- **In-memory TTL cache** — single cache layer to avoid redundant upstream calls

### Next.js Frontend

- **Thin proxy** — validates query params (`lat`, `lon`, `days`, `units`, etc.), delegates to FastAPI
- **Forwards `X-Cache` header** — passes cache HIT/MISS from FastAPI to the browser
- **`cache: "no-store"`** — prevents Next.js from double-caching responses that FastAPI already caches
- **UI rendering** — React components consume the normalized `WeatherResponse` contract

## Security Boundary

- The browser **never** talks to WeatherAI directly
- The browser **never** receives the API key
- `BACKEND_URL` is a server-side env var only (no `NEXT_PUBLIC_` prefix)

## Data Model Layers

| Layer | Purpose | Example |
|---|---|---|
| `Upstream*` models | Match the real WeatherAI response shape | `UpstreamWeatherResponse`, `UpstreamCurrent` |
| `Weather*` models | Public contract served to the frontend | `WeatherResponse`, `CurrentWeather` |

The normalization layer (`normalize()`) converts between them. When the upstream API shape changes (as documented in `challenges.md`), only the `Upstream*` models need updating — everything downstream stays stable.
