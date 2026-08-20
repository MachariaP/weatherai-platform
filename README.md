# WeatherAI Dashboard

QA Engineer take-home assignment. A full-stack weather dashboard integrating
the [WeatherAI API](https://weather-ai.co/docs), built with a deliberate
focus on testing, error handling, and reliability.

## Architecture

```
Browser
  │  same-origin
  ├─ GET /api/weather?lat&lon  ──▶ FastAPI /weather   ──▶ WeatherAI (coordinates only)
  ├─ GET /api/geocode?q        ──▶ FastAPI /geocode   ──▶ Photon search
  ├─ GET /api/reverse?lat&lon  ──▶ FastAPI /reverse   ──▶ Photon reverse
  └─ GET /api/geolocate        ──▶ FastAPI /geolocate ──▶ IP approximation
```

The browser never talks to WeatherAI, Photon, or the IP-lookup provider. City
names and GPS/IP fallbacks resolve to latitude and longitude on FastAPI, then
weather is fetched with those coordinates. Optional current fields
(`feels_like`, `humidity`, `uv_index`, `pressure`, `precip_last_24h`) and
`place_name` appear only when FastAPI can populate them; the UI hides missing
metric tiles instead of inventing values.

The frontend has no knowledge of WeatherAI, its auth scheme, or its error
codes. The backend treats WeatherAI as an untrusted, potentially slow,
potentially unavailable external dependency.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.12, Pydantic, httpx
- **Testing**: Vitest + React Testing Library (frontend), Playwright (browser E2E), pytest + respx (backend)

## Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # add your WEATHERAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit `http://localhost:3000` — search a place name, enter coordinates, or click "My Location".

### Public API TypeScript types

FastAPI public Pydantic models are the source of truth. OpenAPI is generated
from the FastAPI app **without starting a server or calling upstream**.
Frontend public API types are generated from that schema:

```bash
cd frontend
npm run generate:api-types
```

That command needs the backend Python environment (local `backend/.venv` or
CI `pip install -r backend/requirements.txt`). It does not need a live API key
or WeatherAI/Photon. Do not edit `frontend/lib/generated/api-schema.ts`.
`lib/types.ts` holds stable aliases (`WeatherResponse`, `GeocodeResult`, …).
CI fails if generated output drifts from git.

### Running Tests

```bash
# Backend
cd backend && source .venv/bin/activate
ruff check app/ tests/ scripts/
pytest --cov=app --cov-report=term-missing

# Frontend unit + production build
cd frontend
npm run generate:api-types   # needs backend Python env (venv or CI python)
npm test
npm run typecheck
npm run lint
npm run build

# Deterministic browser E2E (mocks /api/*; no live WeatherAI)
npx playwright install chromium   # once
npm run test:e2e                  # builds (locally) then next start on :3100
```

CI (`.github/workflows/ci.yml`) runs backend ruff + pytest with coverage, and
frontend generated-API-type drift check, lint, `tsc --noEmit`, Vitest,
**production build**, and Playwright on every push and pull request. See
`DOCS/testing.md`.

## Features

- Current weather with temperature, wind, and conditions
- 7-day forecast by default, with 3- or 5-day range in Settings / forecast header
- Hourly outlook with precipitation amounts when available
- Observed time and Refresh (revalidates through FastAPI cache; does not force WeatherAI)
- Place-name search with multiple suggestions (Photon via FastAPI)
- Recent locations (localStorage, max 8; weather payloads are never stored)
- Saved places (localStorage, max 20, explicit star; coordinates only; no account)
- Shareable `/?lat=&lon=` URLs (coordinates are canonical)
- Browser geolocation with IP approximation when GPS is unavailable
- Metric/imperial, forecast range (3/5/7 days), and AI insight preferences (Settings, `localStorage`)
- Cache HIT/MISS indicator
- AI summary display when the upstream provides one (`ai_summary` may be null)
- Loading skeletons, empty state, and classified errors with retry

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/weather?lat=&lon=` | Weather data (browser-facing) |
| `GET /api/geocode?q=` | Place search → `{ results: [ { lat, lon, label } ] }` |
| `GET /api/reverse?lat=&lon=` | Reverse geocode → `{ lat, lon, label }` |
| `GET /api/geolocate` | IP approximation → `{ lat, lon, label }` |
| `GET /health` | Backend liveness (FastAPI, not browser-facing in prod) |

Query parameters: `lat` (required), `lon` (required), `days` (1-7),
`units` (metric\|imperial), `ai` (true\|false), `lang` (string).

## Engineering Decisions

- **Two-service architecture**: API key never reaches the browser.
- **Single cache layer**: FastAPI owns caching; Next.js uses `cache: "no-store"` to avoid double-caching.
- **Two-layer data models**: Upstream models (raw API) vs public contract (application shape) — decoupled so upstream changes don't silently propagate.
- **Generated public API types**: FastAPI Pydantic models → OpenAPI → `frontend/lib/generated/api-schema.ts`. Aliases in `lib/types.ts`. Frontend-only types stay handwritten.
- **Typed error handling**: Each upstream error (401, 429, 500, 503, timeout) maps to a specific typed exception with distinct HTTP response.
- **WeatherAI protection**: in-memory rate limit on cache misses, circuit breaker on repeated 5xx/timeout; see `DOCS/resilience.md`.
- **Intended production topology**: Next.js on Vercel → one FastAPI worker on Render. Redis is not required at that scale; see `DOCS/deployment.md`.
- **City search via Photon**: WeatherAI Free is coordinates-only. FastAPI geocodes place names with OpenStreetMap Photon, then calls `/v1/weather` with lat/lon. The browser never talks to Photon or WeatherAI.
- **Coordinates are identity**: shareable URLs are `/?lat=&lon=`. Place names are not the weather key.
- **Recent locations**: `localStorage` only (max 8). Weather payloads are never stored there.
- **Saved places**: `localStorage` only (max 20). Explicit save/remove. Coordinates are identity. No account or cloud sync. Selecting a saved place is a normal location visit (it also enters recents).
- **Forecast range**: UI options 3/5/7 days (default 7), persisted as `forecastDays`. Not part of the shareable URL. FastAPI already validates `days` 1–7 and includes it in the cache key.
- **IP geolocation**: used only after GPS fails without a permission denial. FastAPI calls the lookup provider; the browser never sees that URL or the IP.
- **Hide missing metrics**: humidity, UV, pressure, feels-like, 24h precip, and
  daily/hourly precipitation amounts render only when FastAPI sent a legitimate
  value. `0` is shown; `null` is not displayed as `0`. Precipitation is an
  amount, not a probability.
- **Refresh respects FastAPI TTL**: Refresh reissues the normal weather request.
  `X-Cache: HIT` during TTL is correct; the browser does not bypass the cache.

## Documentation

See `DOCS/` for architecture, API reference, testing, build plan, interview prep, challenge log, and resilience.

## Known Limitations

- Frontend-only types (UI state, preferences, recents/favorites) remain handwritten; only the FastAPI public contract is generated
- WeatherAI Free has no city-name weather endpoint; place search is Photon via FastAPI
- Optional current extras are omitted from the UI when upstream does not send them
- In-memory cache resets on backend restart
- Application rate limiter and circuit breaker are **process-local** (one
  FastAPI worker on one instance in the selected topology; Redis deferred)
- AI summaries consume a separate, smaller quota (200/mo vs 1000/mo)
- AI summary availability depends on the upstream plan: on the currently tested
  Free plan, `ai=true` requests succeed but the upstream returned no AI summary
  (`ai_summary: null`). The application boundary supports the feature and
  renders the summary whenever the upstream provides one.
- Deployment status: **NOT DEPLOYED / NOT VERIFIED** — see `DOCS/deployment.md`.
