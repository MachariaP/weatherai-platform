# Architecture

## Overview

Two-service architecture: a **FastAPI backend** (Python) handles all upstream
API interaction, and a **Next.js frontend** (TypeScript) serves as a thin proxy
and UI layer.

```
Browser
  ↓ same-origin, cache: no-store
Next.js /api/weather | /api/geocode | /api/reverse | /api/geolocate
  ↓ BACKEND_URL (server-side only)
FastAPI
  ├── GET /weather     → WeatherAI (lat/lon only)
  ├── GET /geocode     → Photon search
  ├── GET /reverse     → Photon reverse
  └── GET /geolocate   → IP approximation (ipwho.is)
```

The WeatherAI key, base URL, retries, and weather cache stay on FastAPI.
Place search, reverse geocoding, and IP approximation are also FastAPI-owned.
The browser never talks to WeatherAI, Photon, or the IP-lookup provider.

**Location identity is coordinates.** Place names and IP lookups are input
conveniences that resolve to `lat` / `lon` before weather is fetched.

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
| TTL caching (weather and geocode) | FastAPI only |
| Cache key generation | FastAPI only |
| Photon search / reverse | FastAPI only |
| IP geolocation | FastAPI only |
| Browser-facing API boundary | Next.js `/api/weather`, `/api/geocode`, `/api/reverse`, `/api/geolocate` |
| Public API TypeScript types | Generated from FastAPI OpenAPI (`lib/generated/api-schema.ts`); aliases in `lib/types.ts` |
| Frontend-only types | Handwritten (preferences, recents/favorites, UI state, Playwright fixtures) |
| Parameter validation at the browser boundary | Next.js route handler |
| Translation of backend/network failures | Next.js |
| UI state / presentation | Next.js |

**The browser must never:**

- call WeatherAI directly
- call Photon (or any geocoder) directly
- call the IP-lookup provider directly
- know the WeatherAI API key
- receive `NEXT_PUBLIC_*` WeatherAI credentials
- contain a second WeatherAI client
- contain a second weather cache

## Service Responsibilities

### FastAPI Backend

- **WeatherAI client** — Bearer auth, timeout, query params (`lat`, `lon`, `days`, `units`, `ai`, `lang`)
- **Retries** — exponential backoff for upstream 5xx only
- **Application rate limit** — uncached WeatherAI calls only; cache HIT bypasses
- **Circuit breaker** — fail-fast after repeated WeatherAI 500/503/timeout/network
- **Structured logs** — JSON events with `X-Request-ID`
- **Error handling** — maps upstream failures to structured responses (never 401 to the browser)
- **Normalization** — `Upstream*` models → public `Weather*` contract
- **In-memory TTL cache** — weather keyed on lat/lon/days/units/ai/lang; geocode keyed on query
- **Photon geocoding** — place search and reverse; errors never include Photon URLs
- **IP geolocation** — approximates lat/lon from the public client IP (or egress IP when the caller is loopback); used when browser GPS is unavailable. Never returns the IP in the JSON body
- **API key** — `WEATHERAI_API_KEY` only; never exposed to Next.js or the browser

### Next.js Frontend

- **Thin proxies** — validate query params, delegate to FastAPI, `cache: "no-store"`
- **Forwards `X-Cache`** — HIT/MISS from FastAPI on `/api/weather`
- **Forwards `X-Request-ID`** — generated or passed through on `/api/weather`
- **Forwards `X-Forwarded-For`** — on `/api/geolocate` only, so FastAPI can look up a public client IP
- **UI** — React consumes the public `WeatherResponse` / geocode contracts

## Security Boundary

- The browser **never** talks to WeatherAI, Photon, or the IP-lookup host
- The browser **never** receives the API key
- `BACKEND_URL` is a server-side env var only (no `NEXT_PUBLIC_` prefix)
- Shareable location URLs, when present, are coordinates only (`?lat=&lon=`)

## Data Model Layers

| Layer | Purpose | Example |
|---|---|---|
| `Upstream*` models | Match the real WeatherAI response shape | `UpstreamWeatherResponse`, `UpstreamCurrent` |
| `Weather*` models | Public weather contract served to the frontend | `WeatherResponse`, `CurrentWeather` |
| Geocode public shape | Place candidates / reverse / IP approximate | Search: `{ results: [...] }`. Reverse and geolocate: `{ lat, lon, label }` |

The weather normalization layer (`normalize()`) converts upstream weather into
the public contract. Geocode responses are normalized in `app/geocode.py` from
Photon / ipwho.is into the same `{ lat, lon, label }` application shape.
When an upstream shape changes, only the FastAPI adapter for that provider
changes — the browser still never sees provider JSON.

Frontend TypeScript for those public models is generated from FastAPI OpenAPI
(`npm run generate:api-types`). Upstream `Upstream*` models, Photon payloads,
and ipwho.is bodies are not part of that schema. UI-only types are not
generated.

Daily and hourly `precipitation` is an **amount** (`float | null`): `0.0` is
verified zero; `null` means the upstream value was missing. Missing is never
normalized to `0.0`. This field is not a precipitation probability.

`current.observed_at` is the upstream observation timestamp string, passed
through unchanged. Manual Refresh reissues `GET /weather` and respects the
FastAPI TTL cache (`X-Cache: HIT` during TTL is honest). The browser does not
bypass or invalidate that cache.

## Location identity

**Coordinates are the weather identity.** A city name is search/display
convenience: it must resolve to `lat` + `lon` before weather is fetched.

| Concern | Representation |
|---|---|
| Weather identity | `lat` + `lon` |
| Display / search convenience | `label` (and optional `region` / `country` on geocode hits) |
| Canonical shareable URL | `/?lat=&lon=` |
| Not an identity | `?q=Nairobi` |

Recent locations are **browser `localStorage` only** (`weatherai:recent-locations`):
about 8 entries, newest first, `{ lat, lon, label }`. Saved places are a separate
store (`weatherai:favorite-locations`, max 20): explicit, not reordered on visit,
never silently evicted. Neither store holds weather payloads, units, AI, or
`days`. There is no server persistence, database, or Redis for recents or favorites.

Forecast range is a viewing preference (`localStorage` `forecastDays`, default 7,
UI options 3/5/7). It is sent as FastAPI `days` and is **not** added to the
shareable `/?lat=&lon=` URL.

`LocationProvider` is the single client-side location source of truth. Search,
recents, GPS/IP, and the URL all write through it; the URL is synchronized only
after a committed location selection, not while the user is typing.

Limiter, breaker, and weather cache state are **in-process only**. See
`DOCS/resilience.md`.
