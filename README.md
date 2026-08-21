# WeatherAI

WeatherAI is a full-stack weather exploration platform built with Next.js and FastAPI. Search by place or coordinates, explore current and forecast conditions, save locations, and compare places while keeping provider credentials and upstream integrations on the server.

```
Browser → Next.js → FastAPI → WeatherAI / Photon / IP geolocation
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

WeatherAI is a responsive dashboard for current conditions, daily forecasts, and hourly exploration. Locations resolve to coordinates before weather is fetched, and shareable URLs use `/?lat=&lon=`.

The browser calls same-origin Next.js routes only. Next.js proxies to FastAPI with a server-only backend URL. FastAPI owns authentication, timeouts, retries, response normalization, caching, and resilience. Place search and reverse geocoding go through Photon via FastAPI; approximate location uses IP geolocation when GPS is unavailable.

## Features

- **Location discovery** — Search by place, enter coordinates, or use browser geolocation with an approximate fallback
- **Recents and saved places** — Keep recent locations and favorites in the browser (`localStorage`)
- **Shareable links** — Open and share weather via `/?lat=&lon=`
- **Current conditions** — Temperature, wind, description, day/night, and optional extras when upstream data provides them
- **Observed time and refresh** — Show the observation clock and refresh weather through the backend
- **Daily and hourly forecast** — Choose a 3 / 5 / 7-day range; explore hourly conditions with a strip, timeline, and charts
- **Forecast-day drill-down** — Inspect hourly rows for a selected day without an extra weather request
- **Compare** — Place two saved locations side by side
- **Preferences** — Metric or imperial units, forecast range, and optional AI insight display
- **Responsive UI** — Loading, empty, and error states; condition-based atmosphere; reduced-motion support

## Architecture

```
Browser
  |
  v
Next.js
  |
  v
FastAPI
  |----> WeatherAI
  |----> Photon
  `----> IP geolocation
```

| Layer | Responsibility |
| --- | --- |
| Next.js | UI, client state, local preferences, same-origin `/api/*` routes |
| FastAPI | Provider communication, credentials, normalization, caching, and resilience |

Preferences, recents, and saved places are browser-local. Weather and geocode caches are in-memory on the FastAPI process. There is no application database.

Details: [DOCS/architecture.md](DOCS/architecture.md).

## Technology stack

| Technology | Role |
| --- | --- |
| Next.js 16 (App Router) | Frontend app and browser-facing `/api/*` proxies |
| React 19 | UI |
| TypeScript | Frontend typing |
| Tailwind CSS 4 | Styling |
| Python 3.12 | Backend runtime (CI) |
| FastAPI | Public HTTP API and OpenAPI source of truth |
| Pydantic / pydantic-settings | Models and settings |
| httpx + respx | Upstream HTTP client and mocked HTTP in tests |
| Vitest + Testing Library | Frontend unit and component tests |
| Playwright | Deterministic browser journeys against mocked `/api/*` |
| pytest + pytest-cov | Backend tests and coverage |
| Ruff | Backend lint |
| ESLint (`eslint-config-next`) | Frontend lint |
| openapi-typescript | Generated frontend types from FastAPI OpenAPI |
| GitHub Actions | Continuous integration |

CI runs on Node.js 20 and Python 3.12.

## Getting started

### Prerequisites

- Python 3.12
- Node.js 20 (as used in CI)
- npm
- A WeatherAI API key (`wai_…`) for live weather through FastAPI

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
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Set `WEATHERAI_API_KEY` in `backend/.env`. Health check: `GET http://localhost:8000/health`.

### Frontend

```bash
cd frontend
npm ci
cp .env.local.example .env.local
npm run dev
```

Set `BACKEND_URL=http://localhost:8000` in `frontend/.env.local`, then open [http://localhost:3000](http://localhost:3000).

### Generated API types

```bash
cd frontend
npm run generate:api-types
```

Requires the backend Python environment. Does not need a live WeatherAI key. CI checks drift with `npm run check:api-types`. Do not edit `frontend/lib/generated/api-schema.ts` by hand.

## Configuration

Never commit real secrets.

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `WEATHERAI_API_KEY` | Yes (for weather) | WeatherAI key (`wai_…`); backend only |
| `WEATHERAI_BASE_URL` | No | Default `https://api.weather-ai.co` |
| `CORS_ORIGINS` | For non-default | Explicit frontend origins; `*` is rejected |
| `RATE_LIMIT_REQUESTS` | No | Uncached WeatherAI calls per identity per window (default 60) |
| `RATE_LIMIT_WINDOW_SECONDS` | No | Limiter window in seconds (default 60) |
| `CIRCUIT_FAILURE_THRESHOLD` | No | Failures before the breaker opens (default 5) |
| `CIRCUIT_COOLDOWN_SECONDS` | No | Breaker cooldown in seconds (default 30) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `BACKEND_URL` | Yes | FastAPI origin for server-side proxies |

Provider credentials are never exposed as `NEXT_PUBLIC_*` variables.

## API contract

| Browser route | FastAPI route | Upstream |
| --- | --- | --- |
| `GET /api/weather` | `GET /weather` | WeatherAI |
| `GET /api/geocode` | `GET /geocode` | Photon |
| `GET /api/reverse` | `GET /reverse` | Photon |
| `GET /api/geolocate` | `GET /geolocate` | ipwho.is |
| — | `GET /health` | none |

Weather query parameters: `lat`, `lon`, optional `days` (1–7), `units` (`metric` \| `imperial`), `ai` (`true` \| `false`), `lang`.

The frontend consumes FastAPI’s normalized public models, not raw provider JSON. Public TypeScript types are generated from OpenAPI into `frontend/lib/generated/api-schema.ts`.

Unavailable metrics stay unavailable; verified zeros are shown as `0`.

Shapes and errors: [DOCS/api-reference.md](DOCS/api-reference.md).

## Testing

### Backend

pytest + respx cover normalization, the upstream client, retries, caching, rate limiting, the circuit breaker, observability, and the OpenAPI contract. Live WeatherAI is not used in CI. Optional live smoke lives in `backend/tests/smoke_real_api.py` and is excluded from the default suite.

```bash
cd backend
source .venv/bin/activate
ruff check app/ tests/ scripts/
pytest --cov=app --cov-report=term-missing
```

### Frontend

Vitest and Testing Library cover helpers, hooks, providers, components, `/api` routes, and security-boundary checks.

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

### Browser (Playwright)

Deterministic journeys mock same-origin `/api/*` against a production `next start` build on port 3100. This is not a live WeatherAI / Photon / FastAPI end-to-end suite.

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

### Quality gates

| Gate | Tool |
| --- | --- |
| Backend lint | Ruff |
| Backend tests | pytest |
| Generated API drift | `npm run check:api-types` |
| Frontend lint | ESLint |
| Frontend types | `tsc --noEmit` |
| Frontend unit | Vitest |
| Production build | `npm run build` |
| Browser | Playwright |

Details: [DOCS/testing.md](DOCS/testing.md).

## Continuous integration

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (push and pull request).

| Job | Checks |
| --- | --- |
| Backend | Python 3.12, Ruff, pytest with coverage |
| Frontend | OpenAPI generation deps, Node 20, API type drift, ESLint, `tsc`, Vitest, production build |
| Playwright | Chromium, production build, deterministic e2e |

CI does not deploy or provision hosts.

## Reliability and security

| Control | Role |
| --- | --- |
| WeatherAI key on FastAPI only | Credentials stay off the browser and Next.js bundle |
| Same-origin `/api/*` + server-only `BACKEND_URL` | Upstream hosts and secrets stay server-side |
| Validation at Next.js and FastAPI | Invalid requests fail before upstream work |
| Upstream timeout | Default 10s on WeatherAI calls |
| Bounded retries | Retries transient upstream 5xx; does not retry 4xx, 429, or timeouts by default |
| Typed error mapping | Upstream failures become structured app errors |
| TTL weather/geocode cache | Default 5 minutes; Next.js uses `cache: "no-store"` so FastAPI remains the cache owner |
| Application rate limit | Applies to uncached WeatherAI misses; cache HITs bypass the budget |
| Circuit breaker | Opens after repeated WeatherAI 5xx / timeout / network failures |
| Request IDs and structured logs | Correlate traffic across Next.js and FastAPI; secrets are redacted |
| Explicit CORS | Listed origins only; credentials disabled |
| Security-boundary tests | Guard against leaking secrets or upstream URLs to the client |

The cache, rate limiter, and circuit breaker are process-local and designed for the current single-worker backend topology. Shared state would be required for multi-instance deployment.

See [DOCS/resilience.md](DOCS/resilience.md) and [DOCS/architecture.md](DOCS/architecture.md).

## Engineering decisions

### Server-side provider boundary

FastAPI owns provider communication and credentials. Next.js remains UI plus a thin validated proxy.

### Normalized public contract

Raw upstream payloads are mapped into a stable application model so the UI does not depend on provider field names.

### Generated API contracts

OpenAPI from FastAPI drives `frontend/lib/generated/api-schema.ts`.

### Single cache owner

FastAPI owns weather caching. Next.js does not add a second weather cache.

### Coordinates as identity

Labels are presentation metadata. Weather requests and shareable URLs are coordinate-based; place names are resolved through the geocoding layer.

### Missing-data semantics

Unavailable values remain unavailable. Verified zeros are shown as `0`.

### Process-local resilience

In-memory cache, limiter, and breaker match the intended single-worker topology. See [DOCS/deployment.md](DOCS/deployment.md).

### Hourly “Now” semantics

Public timestamps are timezone-naive. Hourly “Now” is anchored to the provider observation hour (`current.observed_at`), not the browser clock. Details: [DOCS/frontend-ui.md](DOCS/frontend-ui.md).

## Project documentation

| Document | Contents |
| --- | --- |
| [DOCS/architecture.md](DOCS/architecture.md) | Service boundaries and ownership |
| [DOCS/api-reference.md](DOCS/api-reference.md) | Public API shapes and errors |
| [DOCS/frontend-ui.md](DOCS/frontend-ui.md) | UI structure and product semantics |
| [DOCS/testing.md](DOCS/testing.md) | Test strategy and commands |
| [DOCS/resilience.md](DOCS/resilience.md) | Cache, limiter, and breaker behavior |
| [DOCS/deployment.md](DOCS/deployment.md) | Intended topology (not a live deploy record) |

## Known limitations

- No maintained public production deployment
- Backend cache, rate limiter, and circuit breaker are process-local
- Saved places and preferences are browser-local; there is no account sync
- Weather requests use coordinates; place names are resolved separately through geocoding
- AI summaries may be unavailable even when requested
- Some current-condition metrics appear only when upstream data provides them
- Public weather timestamps have no timezone metadata
- Continuous deployment is not configured

## License

Licensed under the [MIT License](LICENSE).
