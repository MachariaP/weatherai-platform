# WeatherAI QA project

QA Engineer take-home assignment. A small full-stack application that
integrates the [WeatherAI API](https://weather-ai.co/docs), built with a
deliberate focus on testing, error handling, and reliability — matching
the role's emphasis on QA engineering rather than just feature building.

**Status: Phase 0 — foundation only.** No weather functionality yet. This
milestone establishes the monorepo, both applications, environment
configuration, health checks, and CI, and proves the frontend can reach
the backend. Weather integration, caching, and UI features land in later
phases (tracked in commit history).

## Architecture

```
frontend/  Next.js (TypeScript, App Router)
              │  server-side fetch, same-origin API boundary
              ▼
backend/   FastAPI (Python)
              │  owns: validation, WeatherAI auth, caching,
              │        retries, error translation
              ▼
        WeatherAI API (api.weather-ai.co)
```

The frontend has no knowledge of WeatherAI, its auth scheme, or its error
codes — it only knows our own backend's API shape. The backend treats
WeatherAI as an untrusted, potentially slow, potentially unavailable
external dependency, and is where the testing/reliability story lives.

## Prerequisites

- Python 3.12+
- Node.js 20+
- A WeatherAI API key ([get one here](https://weather-ai.co/docs)) — not
  required for Phase 0, since nothing calls WeatherAI yet

## Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # fill in WEATHERAI_API_KEY once Phase 1 lands
uvicorn app.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok","service":"weatherai-qa-backend"}`

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Visit `http://localhost:3000` — with the backend running, the page reports
backend status as **reachable**.

### Tests

```bash
# backend
cd backend && pytest

# frontend (test suite lands in Phase 5)
cd frontend && npm run lint && npx tsc --noEmit
```

## Engineering decisions

- **Monorepo, not two repos.** The frontend and backend are tightly
  coupled for this assignment, deployed independently, and reviewed
  together. A monorepo means one README, one CI pipeline, one clone —
  less overhead for a 48-hour assignment. If these became independently
  owned services, splitting them would be straightforward.
- **FastAPI owns weather data caching.** Next.js Route Handlers/Server
  Components use `cache: "no-store"` deliberately, so there is exactly one
  cache to reason about and test, not two that could disagree.
- **No free-text city search.** WeatherAI's API doesn't expose a
  geocoding/search endpoint on any plan tier (confirmed by reading the
  docs before building). Location input is lat/lon, IP-based auto-detect
  (`/v1/weather-geo?ip=auto`), or a small hardcoded list of preset cities —
  not a second external API, which would add an unnecessary dependency the
  assignment doesn't ask for.
- **AI summaries default OFF.** The Free plan's AI sub-quota (200/mo) is
  much smaller than the general request quota (1,000/mo) and easy to
  exhaust from repeated demo reloads. AI summaries are opt-in per request.
- **`/health` never calls WeatherAI.** This endpoint answers "is our
  process up," not "is WeatherAI up" — those are different questions with
  different failure modes, and conflating them would make the app look
  broken whenever the external API has an issue.

## Known limitations

_(This section will grow as later phases land. Documented honestly rather
than hidden.)_

- Phase 0 has no weather functionality yet — by design, see Status above.

## Roadmap

- [x] Phase 0 — monorepo, health checks, CI, frontend↔backend connectivity
- [ ] Phase 1 — WeatherAI client, validation, error translation
- [ ] Phase 2 — backend test suite (unit, integration, boundary tests)
- [ ] Phase 3 — frontend data layer
- [ ] Phase 4 — frontend UI
- [ ] Phase 5 — frontend test suite
- [ ] Phase 6 — integration pass against the real API
- [ ] Phase 7 — CI test jobs finalized
- [ ] Phase 8 — deployment
- [ ] Phase 9 — docs finalized
- [ ] Phase 10 — final QA pass
