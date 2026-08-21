# WeatherAI

Full-stack weather exploration with a Next.js frontend and FastAPI backend. Look up conditions by place or coordinates, explore hourly and daily forecasts, and compare saved locations—while keeping provider credentials and upstream traffic on the server.

```
Browser → Next.js (/api/*) → FastAPI → WeatherAI / Photon / IP geolocation
```

[![CI](https://github.com/MachariaP/weatherai-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/MachariaP/weatherai-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API contract](#api-contract)
- [Testing](#testing)
- [Continuous integration](#continuous-integration)
- [Reliability and security](#reliability-and-security)
- [Engineering decisions](#engineering-decisions)
- [Project documentation](#project-documentation)
- [Known limitations](#known-limitations)
- [License](#license)

## Overview

WeatherAI is a responsive dashboard for current conditions, daily forecast, and hourly exploration. Locations resolve to coordinates before weather is fetched. Shareable URLs use `/?lat=&lon=`.

The browser talks only to same-origin Next.js routes. Next.js proxies to FastAPI with a server-only backend URL. FastAPI owns WeatherAI authentication, timeouts, retries, response normalization, caching, and resilience controls. Place search and reverse geocoding use Photon through FastAPI; approximate location uses an IP lookup provider when GPS is unavailable.

## Features

- **Location discovery** — place search suggestions, coordinate entry, browser geolocation with IP fallback when GPS is unavailable (not after an explicit permission denial)
- **Recents and saved places** — last 8 locations and up to 20 favorites in `localStorage` (coordinates and labels only)
- **Shareable links** — `/?lat=&lon=` as the canonical location identity
- **Current conditions** — temperature, wind, description, day/night, optional extras when the upstream payload provides them
- **Observed time and refresh** — display `observed_at` clock digits; refresh reissues the normal FastAPI request (TTL cache may still return `X-Cache: HIT`)
- **Daily and hourly forecast** — selectable 3 / 5 / 7-day range; hourly strip, timeline scrubber, and temperature/precipitation charts over a shared window
- **Forecast-day drill-down** — filter existing hourly rows by day without an extra WeatherAI call
- **Compare** — two saved places side by side; weather fetched only for selected places; AI summary omitted to avoid multiplying AI quota
- **Preferences** — metric/imperial units, forecast range, optional AI insight preference
- **UI polish** — loading skeletons, empty and error states, condition-based atmosphere, `prefers-reduced-motion`, responsive layout

Precipitation amounts treat `0` as verified zero; missing values are omitted rather than fabricated.

## Architecture

```
Browser
  |
  v
Next.js (UI + same-origin /api/* proxies)
  |
  v
FastAPI (public contract, credentials, cache, resilience)
  |-----> WeatherAI (weather by lat/lon)
  |-----> Photon (search / reverse)
  `-----> IP geolocation (approx. location)
```

| Layer | Owns |
| --- | --- |
| Next.js | Presentation, client state, preference/storage UX, validated same-origin `/api/*` handlers |
| FastAPI | Provider credentials, upstream HTTP, normalization, TTL caches, rate limit, circuit breaker, CORS, logging |

There is no application database. Preferences, recents, and favorites live in the browser. Weather and geocode caches are in-memory on the FastAPI process.

Deeper boundaries: [DOCS/architecture.md](DOCS/architecture.md).

## Technology stack

| Technology | Role |
| --- | --- |
| Next.js 16 (App Router) | Frontend app and browser-facing `/api/*` proxies |
| React 19 | UI |
| TypeScript | Frontend typing (`tsc --noEmit` in CI) |
| Tailwind CSS 4 | Styling |
| Python 3.12 | Backend runtime in CI |
| FastAPI | Public HTTP API and OpenAPI source of truth |
| Pydantic / pydantic-settings | Request/response models and settings |
| httpx + respx | Upstream client and mocked HTTP in pytest |
| Vitest + Testing Library | Frontend unit and component tests |
| Playwright | Deterministic browser journeys against mocked `/api/*` |
| pytest + pytest-cov | Backend tests and coverage |
| Ruff | Backend lint |
| ESLint (`eslint-config-next`) | Frontend lint |
| openapi-typescript | Generate `frontend/lib/generated/api-schema.ts` from FastAPI OpenAPI |
| GitHub Actions | Continuous integration (no continuous deployment) |

CI uses Node **20**. `frontend/package.json` does not pin an `engines` field.

## Getting started

### Prerequisites

- Python 3.12 (matches CI)
- Node.js (20 in CI)
- npm
- A WeatherAI API key (`wai_…`) for live weather calls through FastAPI

### Clone

```bash
git clone https://github.com/MachariaP/weatherai-platform.git
cd weatherai-platform
```

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # set WEATHERAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Liveness: `GET http://localhost:8000/health` (does not call WeatherAI).

### Frontend

```bash
cd frontend
npm ci
cp .env.local.example .env.local   # BACKEND_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Generated API types

```bash
cd frontend
npm run generate:api-types
```

Requires the backend Python environment. Does not need a live WeatherAI key. CI fails if `frontend/lib/generated/api-schema.ts` drifts (`npm run check:api-types`). Do not edit the generated file by hand.

## Configuration

Never commit real secrets.

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `WEATHERAI_API_KEY` | Yes (for weather) | WeatherAI key (`wai_…`); backend only |
| `WEATHERAI_BASE_URL` | No | Default `https://api.weather-ai.co` |
| `CORS_ORIGINS` | For non-default | Explicit frontend origins; wildcard `*` rejected |
| `RATE_LIMIT_REQUESTS` | No | Uncached WeatherAI calls per identity per window (default 60) |
| `RATE_LIMIT_WINDOW_SECONDS` | No | Limiter window seconds (default 60) |
| `CIRCUIT_FAILURE_THRESHOLD` | No | Consecutive qualifying failures before OPEN (default 5) |
| `CIRCUIT_COOLDOWN_SECONDS` | No | Breaker cooldown seconds (default 30) |

Timeout and retry defaults live in settings (`weatherai_timeout`, `weatherai_max_retries`) and are not listed in `.env.example`.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `BACKEND_URL` | Yes | FastAPI origin for server-side proxies (for example `http://localhost:8000`) |

There are no `NEXT_PUBLIC_` WeatherAI credentials in this project.

## API contract

Browser traffic stays same-origin to Next.js. Next.js proxies to FastAPI using server-only `BACKEND_URL`. FastAPI talks to upstream providers.

| Browser route | FastAPI route | Upstream |
| --- | --- | --- |
| `GET /api/weather` | `GET /weather` | WeatherAI |
| `GET /api/geocode` | `GET /geocode` | Photon |
| `GET /api/reverse` | `GET /reverse` | Photon |
| `GET /api/geolocate` | `GET /geolocate` | ipwho.is |
| — | `GET /health` | none (process liveness) |

Weather query parameters (validated at Next.js and again on FastAPI): `lat`, `lon`, optional `days` (1–7), `units` (`metric` \| `imperial`), `ai` (`true` \| `false`), `lang`.

The frontend consumes the normalized public contract, not raw WeatherAI JSON. Public TypeScript types are generated from FastAPI OpenAPI into `frontend/lib/generated/api-schema.ts` (aliases in `frontend/lib/types.ts`).

Full shapes and errors: [DOCS/api-reference.md](DOCS/api-reference.md).

## Testing

### Backend

- pytest + respx (no live WeatherAI in CI)
- Normalization, client, retry, cache, rate limit, circuit breaker, observability, OpenAPI contract coverage
- Optional live smoke: `backend/tests/smoke_real_api.py` (requires a real key; excluded from default pytest and CI)

```bash
cd backend
source .venv/bin/activate
ruff check app/ tests/ scripts/
pytest --cov=app --cov-report=term-missing
```

### Frontend

- Vitest + Testing Library for helpers, hooks, providers, components, `/api` routes, and security-boundary checks

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

### Browser (Playwright)

- Deterministic journeys with mocked same-origin `/api/*`
- Runs against production `next start` on port 3100
- Not a live WeatherAI / Photon / FastAPI end-to-end suite

```bash
cd frontend
npx playwright install chromium   # once per machine
npm run test:e2e
```

### Quality gates

| Gate | Command / tool |
| --- | --- |
| Backend lint | Ruff |
| Backend tests | pytest with coverage |
| Generated API drift | `npm run check:api-types` |
| Frontend lint | ESLint |
| Frontend types | `tsc --noEmit` |
| Frontend unit | Vitest |
| Production build | `npm run build` |
| Browser | Playwright |

mypy is not configured in this repository.

Details: [DOCS/testing.md](DOCS/testing.md).

## Continuous integration

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (push and pull request).

| Job | Checks |
| --- | --- |
| Backend | Python 3.12, Ruff, pytest with coverage |
| Frontend | OpenAPI generation deps, Node 20, `npm ci`, API type drift, ESLint, `tsc`, Vitest, production build |
| Playwright | Node 20, Chromium, production build, deterministic e2e; artifacts on failure |

This is continuous integration only. The workflow does not deploy, publish containers, or provision hosts.

## Reliability and security

| Control | Role |
| --- | --- |
| WeatherAI key only on FastAPI | Keeps credentials out of the browser and Next.js bundle |
| Same-origin `/api/*` + server-only `BACKEND_URL` | Keeps upstream hosts and secrets off the client |
| Validation at Next.js and FastAPI | Rejects bad `lat` / `lon` / `days` / `units` / `ai` before upstream work |
| Upstream timeout (default 10s) | Bounds hang time on WeatherAI |
| Bounded retries on upstream 5xx | Recovers from transient server errors; does not retry 4xx / 429 / timeout by default |
| Typed error mapping | Upstream failures become structured app errors; WeatherAI 401 is not forwarded as browser 401 |
| In-memory TTL weather/geocode cache (default 5 minutes) | Reduces quota burn; Next.js uses `cache: "no-store"` so FastAPI remains the single cache owner |
| Application rate limit (uncached misses) | Cache HITs bypass the limiter |
| Circuit breaker (WeatherAI 5xx / timeout / network finals) | Fail-fast after repeated upstream failure; cache HITs can still succeed while open |
| Structured logs + `X-Request-ID` | Correlates requests across Next.js and FastAPI |
| Log redaction | Avoids writing secrets into log lines |
| Explicit CORS origins | No wildcard `*`; credentials disabled |
| Security-boundary Vitest suite | Asserts no `NEXT_PUBLIC_` WeatherAI/backend secrets and no upstream URLs in client-facing code |

Rate limiter and circuit breaker are process-local. They fit a single FastAPI worker topology; they are not a multi-replica control plane.

See [DOCS/resilience.md](DOCS/resilience.md) and [DOCS/architecture.md](DOCS/architecture.md).

## Engineering decisions

### Server-side provider boundary

FastAPI owns WeatherAI communication and credentials. Next.js stays a thin validated proxy plus UI.

### Public versus upstream models

Raw provider payloads are normalized into a stable public contract so the UI does not depend on upstream field names.

### Generated API contracts

FastAPI OpenAPI drives `frontend/lib/generated/api-schema.ts` so public types stay aligned with the backend.

### Single cache owner

FastAPI owns the weather TTL cache. Next.js does not introduce a second weather cache.

### Coordinates as location identity

Labels are presentation metadata. Weather lookups and shareable URLs are coordinate-based.

### Null semantics

Unavailable metrics and precipitation are omitted. Verified zeros are shown as `0`.

### Process-local resilience

Under the intended one FastAPI worker topology, in-memory cache, limiter, and breaker are sufficient. Shared Redis is deferred until multi-replica hosting requires it. See [DOCS/deployment.md](DOCS/deployment.md).

### Hourly “Now” semantics

Public `observed_at` / hourly `time` strings are timezone-naive. Hourly “Now” is the bucket matching `observed_at`’s naive date/hour, not the browser clock. Details: [DOCS/frontend-ui.md](DOCS/frontend-ui.md).

## Project documentation

| Document | Contents |
| --- | --- |
| [DOCS/architecture.md](DOCS/architecture.md) | Service boundaries and ownership |
| [DOCS/api-reference.md](DOCS/api-reference.md) | Public API shapes and errors |
| [DOCS/frontend-ui.md](DOCS/frontend-ui.md) | UI structure and product semantics |
| [DOCS/testing.md](DOCS/testing.md) | Test strategy and commands |
| [DOCS/resilience.md](DOCS/resilience.md) | Cache, limiter, and breaker behavior |
| [DOCS/deployment.md](DOCS/deployment.md) | Intended topology; not a live deploy record |

## Known limitations

- No public production instance is currently maintained; deployment topology is documented as intent only
- Cache, rate limiter, and circuit breaker are process-local and reset on restart
- Saved places and preferences are browser-local (`localStorage`); there is no account sync
- WeatherAI Free constraints apply (coordinates-only weather; AI summaries may be `null` even when requested)
- Optional current extras (feels-like, humidity, UV, pressure, precip) appear only when FastAPI can populate them
- Public weather timestamps carry no timezone metadata
- Continuous deployment is not configured; CI verifies quality only

## License

Licensed under the [MIT License](LICENSE).
