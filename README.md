# WeatherAI QA Dashboard

A full-stack weather exploration app built as a WeatherAI API integration and QA-focused engineering assignment: browser → Next.js `/api/*` → FastAPI → WeatherAI / Photon / IP lookup.

**Deployment status:** not deployed. No live production URL is published in this repository. See [DOCS/deployment.md](DOCS/deployment.md).

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Core Features](#4-core-features)
5. [API & Data Flow](#5-api--data-flow)
6. [Reliability & Security](#6-reliability--security)
7. [Testing & Quality Strategy](#7-testing--quality-strategy)
8. [CI](#8-ci)
9. [Local Development](#9-local-development)
10. [Environment Variables](#10-environment-variables)
11. [Running Tests](#11-running-tests)
12. [Engineering Decisions](#12-engineering-decisions)
13. [Documentation](#13-documentation)
14. [Known Limitations](#14-known-limitations)

---

## 1. Project Overview

This repository is a take-home style WeatherAI integration. The product surface is a responsive dashboard for looking up weather by place or coordinates. The engineering focus is a clear service boundary, a stable public API contract, deterministic tests, and honest failure handling.

WeatherAI is treated as an untrusted upstream dependency. FastAPI owns authentication, timeouts, retries, normalization, caching, and WeatherAI protection. Next.js owns presentation and same-origin browser routes. The browser never receives the WeatherAI API key and never calls WeatherAI, Photon, or the IP lookup provider directly.

### Goals

- Integrate WeatherAI through a server-side boundary
- Keep provider credentials off the client
- Normalize upstream payloads into a stable public contract
- Exercise success, failure, and edge-case behavior in automated tests
- Provide a usable weather exploration UI (current, hourly, daily, compare)
- Document architecture, resilience, and deployment intent without claiming unverified infrastructure

---

## 2. Architecture

```
Browser
  │  same-origin, cache: no-store
  ├─ GET /api/weather?lat&lon   → FastAPI /weather    → WeatherAI (lat/lon only)
  ├─ GET /api/geocode?q         → FastAPI /geocode    → Photon search
  ├─ GET /api/reverse?lat&lon   → FastAPI /reverse    → Photon reverse
  └─ GET /api/geolocate         → FastAPI /geolocate  → IP approximation (ipwho.is)
```

**Location identity is coordinates.** Place names, GPS, and IP approximation resolve to `lat` / `lon` before weather is fetched. Shareable URLs use `/?lat=&lon=`.

### Frontend responsibilities

- Presentation and client UI state
- Same-origin `/api/*` route handlers (validate params, proxy to FastAPI)
- Preferences (units, AI insight toggle, forecast range) in `localStorage`
- Recents and saved places in `localStorage` (coordinates + labels only; no weather payloads)
- Generated TypeScript aliases for the public FastAPI contract

### Backend responsibilities

- WeatherAI credentials and Bearer auth
- Upstream HTTP (httpx), timeout, bounded retries
- Upstream → public contract normalization
- In-memory TTL caches (weather and geocode)
- Application rate limit and circuit breaker on uncached WeatherAI calls
- Structured JSON request logs, `X-Request-ID`, credential redaction in logs
- Photon place search / reverse and IP geolocation
- CORS with explicit origins (wildcard `*` rejected)

There is no application database, Redis, Docker Compose stack, or user authentication in this repository.

---

## 3. Technology Stack

| Technology | Purpose |
| --- | --- |
| Next.js 16 (App Router) | Frontend app and browser-facing `/api/*` proxies |
| React 19 | UI components |
| TypeScript | Frontend typing (`tsc --noEmit` in CI) |
| Tailwind CSS 4 | Styling |
| Python 3.12 | Backend runtime (CI) |
| FastAPI | Public HTTP API and OpenAPI source of truth |
| Pydantic / pydantic-settings | Request/response models and settings |
| httpx + respx | Upstream HTTP client and mocked HTTP in pytest |
| Vitest + Testing Library | Frontend unit and component tests |
| Playwright | Deterministic browser journeys against mocked `/api/*` |
| pytest + pytest-cov | Backend tests and coverage |
| Ruff | Backend lint |
| ESLint (`eslint-config-next`) | Frontend lint |
| openapi-typescript | Generate `frontend/lib/generated/api-schema.ts` from FastAPI OpenAPI |
| GitHub Actions | Continuous integration (no continuous deployment) |

Node **20** is used in CI. Local development commonly works on current Node LTS/current releases; `package.json` does not pin an `engines` field.

---

## 4. Core Features

| Feature | Purpose |
| --- | --- |
| Coordinate weather lookup | Fetch weather for any valid `lat` / `lon` |
| Place search suggestions | Resolve city/place text to coordinates via Photon (through FastAPI) |
| Browser geolocation + IP fallback | Prefer GPS; approximate via FastAPI geolocate when GPS is unavailable (not after an explicit permission denial) |
| Recent locations | Last ~8 places in `localStorage` for quick return |
| Saved places | Explicit favorites (max 20) in `localStorage`; no account |
| Shareable `/?lat=&lon=` URLs | Coordinates as the canonical location identity |
| Current conditions | Temperature, wind, description, day/night, optional extras when present |
| Observed time + Refresh | Show `observed_at` clock digits; reissue weather through FastAPI TTL cache |
| Cache HIT/MISS indicator | Surface FastAPI `X-Cache` honestly |
| Daily forecast | Default 7 days; Settings/header can select 3 or 5 |
| Hourly strip + Next 24 hours exploration | Shared window for strip, timeline scrubber, and chart |
| Hourly temperature / precipitation chart | Explore the windowed hourly series without inventing missing precip |
| Forecast-day drill-down | Filter existing hourly rows by daily date prefix (no extra WeatherAI call) |
| Two-place compare | Compare two saved places; weather fetched only for selected places; `ai` omitted |
| Units and preferences | Metric/imperial, forecast range, optional AI insight preference |
| AI summary display | Renders `ai_summary` when upstream provides one; may be `null` on Free |
| Loading / empty / error UI | Skeletons, empty state, classified errors with retry |
| Weather atmosphere | Subtle condition-based atmosphere; respects `prefers-reduced-motion` |
| Responsive layout | Stacked mobile layout; desktop column layout from `lg` |

Precipitation values are **amounts** (`0` is verified zero; `null` is hidden, never shown as `0`).

---

## 5. API & Data Flow

Browser traffic stays same-origin to Next.js. Next.js proxies to FastAPI using server-only `BACKEND_URL`. FastAPI talks to upstream providers.

| Browser route | FastAPI route | Upstream |
| --- | --- | --- |
| `GET /api/weather` | `GET /weather` | WeatherAI |
| `GET /api/geocode` | `GET /geocode` | Photon |
| `GET /api/reverse` | `GET /reverse` | Photon |
| `GET /api/geolocate` | `GET /geolocate` | ipwho.is |
| — | `GET /health` | none (process liveness) |

Weather query parameters (validated at the Next.js boundary and again on FastAPI): `lat`, `lon`, optional `days` (1–7), `units` (`metric` \| `imperial`), `ai` (`true` \| `false`), `lang`.

The frontend consumes the **normalized** public contract, not raw WeatherAI JSON. Public TypeScript types are generated from FastAPI OpenAPI into `frontend/lib/generated/api-schema.ts` (aliases in `frontend/lib/types.ts`). Do not hand-edit the generated file.

Full shapes and error codes: [DOCS/api-reference.md](DOCS/api-reference.md).

---

## 6. Reliability & Security

Implemented controls (verified in code and tests):

| Control | Why it exists |
| --- | --- |
| WeatherAI key only on FastAPI | Prevents credential leakage to the browser and Next.js bundle |
| Same-origin `/api/*` + server-only `BACKEND_URL` | Keeps upstream hosts and secrets off the client |
| Input validation at Next.js and FastAPI | Rejects bad lat/lon/days/units/ai before upstream work |
| Upstream timeout (default 10s) | Bounds hang time on WeatherAI |
| Bounded retries on upstream 5xx | Recovers from transient server errors; does not retry 4xx/429/timeout by default |
| Typed error mapping | Upstream failures become structured app errors; WeatherAI 401 is not forwarded as browser 401 |
| In-memory TTL weather/geocode cache | Reduces quota burn; Next.js uses `cache: "no-store"` so FastAPI remains the single cache owner |
| Application rate limit (uncached misses) | Cache HITs bypass the limiter so rereads do not consume the WeatherAI budget |
| Circuit breaker (WeatherAI 5xx/timeout/network finals) | Fail-fast after repeated upstream failure; cache HITs still succeed while open |
| Structured logs + `X-Request-ID` | Correlates requests across Next.js and FastAPI |
| Log redaction | Avoids writing secrets into log lines |
| Explicit CORS origins | No wildcard `*`; credentials disabled |
| Security-boundary Vitest suite | Asserts no `NEXT_PUBLIC_` WeatherAI/backend secrets and no upstream URLs in client-facing code |

Rate limiter and circuit breaker are **process-local**. They match the intended 1×1 FastAPI topology; they are not a multi-replica control plane. See [DOCS/resilience.md](DOCS/resilience.md).

---

## 7. Testing & Quality Strategy

### Backend

- Unit and route tests with pytest + respx (no live WeatherAI in CI)
- Normalization, client, retry, cache, rate limit, circuit breaker, observability, OpenAPI contract tests
- Optional live smoke: `backend/tests/smoke_real_api.py` (requires a real key; **excluded from default pytest and CI** via `pytest.ini`)

Verified locally during README reconciliation: **156** pytest tests collected/passed (excluding smoke).

### Frontend

- Vitest for pure helpers, hooks/providers, components, `/api` route units, and security-boundary checks
- React Testing Library for interaction and rendering edge cases

Verified locally during README reconciliation: **333** Vitest tests across **38** files.

### Browser (Playwright)

- Deterministic journeys with **mocked** same-origin `/api/*` responses
- Runs against production `next start` on port **3100** (not `next dev`)
- **Not** a live WeatherAI / Photon / FastAPI E2E suite

Verified locally: **28** Playwright tests in 5 files.

### Quality gates

| Gate | Tool |
| --- | --- |
| Backend lint | Ruff (`ruff check app/ tests/ scripts/`) |
| Backend tests + coverage | `pytest --cov=app` |
| Generated API drift | `npm run check:api-types` |
| Frontend lint | ESLint |
| Frontend types | `tsc --noEmit` |
| Frontend unit | Vitest |
| Frontend production build | `npm run build` |
| Browser | Playwright |

**mypy is not configured** in this repository and is not part of CI.

Details: [DOCS/testing.md](DOCS/testing.md).

---

## 8. CI

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Runs on push and pull request.

| Job | Checks |
| --- | --- |
| Backend | Python 3.12, Ruff, pytest with coverage |
| Frontend | Python deps for OpenAPI generation, Node 20, `npm ci`, generated API type drift, ESLint, `tsc`, Vitest, production build |
| Playwright | Node 20, `npm ci`, Chromium, production build, deterministic e2e; uploads artifacts on failure |

**Deployment is not performed by the CI workflow.** There is no continuous delivery job, container publish step, or hosted environment provisioning in this repository.

---

## 9. Local Development

### Prerequisites

- Python **3.12** (matches CI)
- Node.js (**20** in CI; current Node also works locally for this project)
- npm (comes with Node)
- A WeatherAI API key (`wai_…`) for live backend weather calls

### Clone

```bash
git clone <repository-url>
cd weatherai-qa-project
```

### Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # set WEATHERAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health` (does not call WeatherAI).

### Frontend setup

```bash
cd frontend
npm install                 # or: npm ci
cp .env.local.example .env.local   # BACKEND_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000`. Search a place, enter coordinates, or use My Location.

### Public API TypeScript types

```bash
cd frontend
npm run generate:api-types
```

Requires the backend Python environment (`backend/.venv` or `pip install -r backend/requirements.txt`). Does not need a live WeatherAI key. CI fails if `lib/generated/api-schema.ts` drifts from git (`npm run check:api-types`).

---

## 10. Environment Variables

Never commit real secrets. Placeholders only.

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `WEATHERAI_API_KEY` | yes (for weather) | WeatherAI key (`wai_…`); backend only |
| `WEATHERAI_BASE_URL` | no | Default `https://api.weather-ai.co` |
| `CORS_ORIGINS` | yes for non-default | Explicit frontend origins; no `*` |
| `RATE_LIMIT_REQUESTS` | no | Uncached WeatherAI calls per identity per window (default 60) |
| `RATE_LIMIT_WINDOW_SECONDS` | no | Limiter window seconds (default 60) |
| `CIRCUIT_FAILURE_THRESHOLD` | no | Consecutive qualifying failures before OPEN (default 5) |
| `CIRCUIT_COOLDOWN_SECONDS` | no | Breaker cooldown seconds (default 30) |

Timeout and retry defaults live in settings code (`weatherai_timeout`, `weatherai_max_retries`); they are not listed in `.env.example`.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `BACKEND_URL` | yes | FastAPI origin for server-side proxies (e.g. `http://localhost:8000`) |

There are no `NEXT_PUBLIC_` WeatherAI credentials in this project.

---

## 11. Running Tests

### Backend

```bash
cd backend
source .venv/bin/activate
ruff check app/ tests/ scripts/
pytest --cov=app --cov-report=term-missing
```

Optional live smoke (not CI; burns quota):

```bash
WEATHERAI_API_KEY=wai_your_key python -m pytest tests/smoke_real_api.py -v -s
```

### Frontend unit / quality

```bash
cd frontend
npm run generate:api-types   # needs backend Python env
npm test
npm run typecheck
npm run lint
npm run build
```

### Playwright (mocked `/api/*`)

```bash
cd frontend
npx playwright install chromium   # once per machine
npm run test:e2e                  # builds locally, then next start on :3100
```

---

## 12. Engineering Decisions

- **Two-service boundary** — FastAPI owns WeatherAI; Next.js stays a thin validated proxy plus UI.
- **Two-layer models** — `Upstream*` mirrors runtime WeatherAI shape; public `Weather*` models are the app contract.
- **Generated public types** — FastAPI OpenAPI → `frontend/lib/generated/api-schema.ts`.
- **Single cache owner** — FastAPI TTL cache; Next.js `cache: "no-store"`.
- **Coordinates as identity** — labels are display/search convenience.
- **Honest nulls** — missing metrics and precipitation are omitted; verified `0` is shown.
- **Refresh respects TTL** — Refresh reissues the normal request; `X-Cache: HIT` during TTL is correct.
- **Intended deploy topology (not provisioned)** — Next.js on Vercel → one FastAPI worker on Render; Redis not required at 1×1. See [DOCS/deployment.md](DOCS/deployment.md).

---

## 13. Documentation

| Document | Contents |
| --- | --- |
| [DOCS/architecture.md](DOCS/architecture.md) | Frozen boundaries and ownership |
| [DOCS/api-reference.md](DOCS/api-reference.md) | Public API shapes and errors |
| [DOCS/frontend-ui.md](DOCS/frontend-ui.md) | UI structure and product semantics |
| [DOCS/testing.md](DOCS/testing.md) | Test pyramid and commands |
| [DOCS/resilience.md](DOCS/resilience.md) | Cache, limiter, breaker behavior |
| [DOCS/deployment.md](DOCS/deployment.md) | Intended topology; deploy status |
| [DOCS/build-plan.md](DOCS/build-plan.md) | Phased build notes |
| [DOCS/challenges.md](DOCS/challenges.md) | Upstream/docs mismatches observed |
| [DOCS/interview-prep.md](DOCS/interview-prep.md) | Discussion prompts |

---

## 14. Known Limitations

- **Not deployed** — no verified live URL, Dockerfile, or provisioned hosts in-repo
- **No database / Redis / auth / Docker** — persistence is browser `localStorage` only for preferences, recents, and saved places
- **Process-local resilience** — in-memory cache, limiter, and breaker reset on restart; not shared across multiple workers/replicas
- **WeatherAI Free constraints** — coordinates-only weather; place search is Photon via FastAPI; AI summaries may be `null` even when `ai=true`
- **Optional current extras** — feels-like, humidity, UV, pressure, 24h precip appear only when FastAPI can populate them
- **Timezone-naive timestamps** — public `observed_at` / hourly `time` strings have no timezone metadata. Observed prints raw clock digits. Hourly **Now** is the bucket matching `observed_at`'s naive date/hour (not the browser clock). Provider timezone meaning (location-local vs UTC) remains undocumented and is not invented.
- **Frontend-only types** remain handwritten (UI state, preferences, Playwright fixtures)
- **No LICENSE file** is present in this repository
- **No continuous deployment** — CI verifies quality only

---

## License

No license file is included in this repository at this time.
