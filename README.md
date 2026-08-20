# WeatherAI Dashboard

QA Engineer take-home assignment. A full-stack weather dashboard integrating
the [WeatherAI API](https://weather-ai.co/docs), built with a deliberate
focus on testing, error handling, and reliability.

## Architecture

```
Browser
  │  same-origin request
  ▼
Next.js /api/weather  (Route Handler — validates params, thin proxy)
  │  server-to-server, cache: "no-store"
  ▼
FastAPI /weather  (owns: auth, retries, normalization, TTL cache)
  │  Bearer token, exponential backoff
  ▼
WeatherAI API  (api.weather-ai.co)
```

The frontend has no knowledge of WeatherAI, its auth scheme, or its error
codes. The backend treats WeatherAI as an untrusted, potentially slow,
potentially unavailable external dependency.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.12, Pydantic, httpx
- **Testing**: Vitest + React Testing Library (frontend), pytest + respx (backend)

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

Visit `http://localhost:3000` — enter coordinates or click "My Location".

### Running Tests

```bash
# Backend (81 tests, ~99% coverage of app/)
cd backend && source .venv/bin/activate
ruff check app/ tests/
pytest --cov=app --cov-report=term-missing

# Frontend (191 tests)
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

CI (`.github/workflows/ci.yml`) runs backend ruff + pytest with coverage, and
frontend lint, `tsc --noEmit`, and vitest on every push and pull request.

## Features

- Current weather with temperature, wind, and conditions
- 7-day forecast grid
- Hourly forecast scroll
- Metric/Imperial unit toggle (persisted to localStorage)
- Browser geolocation detection
- Cache HIT/MISS indicator
- AI summary display (when available)
- Loading skeletons and error states with retry
- Typed error propagation (400, 401, 429, 502, 503, 504)

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/weather?lat=&lon=` | Weather data (browser-facing) |
| `GET /health` | Backend health check |

Query parameters: `lat` (required), `lon` (required), `days` (1-7),
`units` (metric\|imperial), `ai` (true\|false), `lang` (string).

## Engineering Decisions

- **Two-service architecture**: API key never reaches the browser.
- **Single cache layer**: FastAPI owns caching; Next.js uses `cache: "no-store"` to avoid double-caching.
- **Two-layer data models**: Upstream models (raw API) vs public contract (application shape) — decoupled so upstream changes don't silently propagate.
- **Typed error handling**: Each upstream error (401, 429, 500, 503, timeout) maps to a specific typed exception with distinct HTTP response.
- **No geocoding service**: WeatherAI doesn't offer Free-plan city search. UI uses coordinate input + browser geolocation.

## Documentation

See `DOCS/` for detailed architecture, API reference, build plan, interview prep, and challenge log.

## Known Limitations

- TypeScript types are manually synced with backend Pydantic models
- No city name search (WeatherAI Free plan limitation)
- In-memory cache resets on backend restart
- AI summaries consume a separate, smaller quota (200/mo vs 1000/mo)
- AI summary availability depends on the upstream plan: on the currently tested
  Free plan, `ai=true` requests succeed but the upstream returned no AI summary
  (`ai_summary: null`). The application boundary supports the feature and
  renders the summary whenever the upstream provides one.
- Deployment status: **NOT DEPLOYED / NOT VERIFIED** — see `DOCS/deployment.md`.
