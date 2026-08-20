# Testing

How this project is tested, and which layer owns which checks.

## Pyramid

```
Backend
  ├── pytest unit tests          (normalize, cache, client, geocode)
  ├── route/integration tests    (FastAPI + respx; no live WeatherAI)
  └── optional real WeatherAI smoke  (backend/tests/smoke_real_api.py — not CI)

Frontend
  ├── Vitest                     (functions, hooks, providers, components, /api route units)
  └── Playwright                 (browser journeys against mocked /api/*)

CI
  ├── backend ruff + pytest --cov=app
  ├── frontend generate/verify API types (no upstream)
  ├── frontend lint, typecheck, Vitest
  ├── frontend production build (`npm run build`)
  └── Playwright deterministic browser suite
```

Live WeatherAI, Photon, and ipwho.is are **not** used by CI.

## Vitest

Purpose: fast, deterministic checks of pure logic and component edge cases.

```bash
cd frontend
npm run generate:api-types   # FastAPI OpenAPI → lib/generated/api-schema.ts
npm test
npm run typecheck
npm run lint
```

jsdom tests use `http://127.0.0.1:9876/` (not port 3000) and cancel native form
submit so they cannot hang on a leftover Next.js process.

## Playwright (deterministic browser suite)

Purpose: user-visible flows that cross SearchBar, URL state, recents,
`useWeather`, and the dashboard. Playwright intercepts **browser** requests to:

- `GET /api/weather`
- `GET /api/geocode`
- `GET /api/reverse`
- `GET /api/geolocate`

Those intercepts are the Next.js UI/API contract. FastAPI and upstream services
are covered by pytest, not by this suite.

```bash
cd frontend
npx playwright install chromium   # once per machine
npm run test:e2e                  # starts its own server on 127.0.0.1:3100
npm run test:e2e:ui               # interactive runner
```

| Environment | App server |
|---|---|
| Local `npm run test:e2e` | `npm run build` then `next start` on port **3100** |
| CI | job runs `npm run build`, then Playwright starts `next start` on **3100** |

The suite uses production `next start`, not `next dev`. The Next.js 16
dev overlay (`nextjs-portal`) intercepts pointer events and is not the
product UI. Port **3100** avoids leftover `:3000` Next.js processes.

CI already builds before Playwright, so the Playwright job does not
rebuild. Local `npm run test:e2e` builds first unless you set `CI=1`
with an existing `frontend/.next`.

Out-of-order weather responses are covered in Playwright (`weather.spec.ts`)
and by Vitest abort/request-id checks in `useWeather`. Browser coverage is
kept to one delayed-fulfillment journey rather than a three-way A→B→C
timing matrix.

Phase D adds representative Playwright journeys for:

- forecast range 7 → 3 (`days=3` on `/api/weather`, three returned daily rows)
- saved place: save Nairobi, visit London, return via Saved (no extra geocode)

Lower-level storage, limit, and preference fallback details stay in Vitest.

Playwright is a **separate CI job** from lint/Vitest/`tsc` so Chromium install
does not slow the unit job. Failed CI runs upload `test-results/` and
`playwright-report/` (screenshots + traces). Successful runs do not keep video.

The frontend unit job regenerates public API types from FastAPI OpenAPI and
fails if `lib/generated/api-schema.ts` differs from git. That step needs Python
and `backend/requirements.txt`; it does not call WeatherAI, Photon, or
ipwho.is. Typecheck runs after the drift check so stale generated types cannot
silently compile.

Retries are **0**. Flakes must be fixed, not hidden.

## Commands

```bash
# Backend
cd backend && source .venv/bin/activate
ruff check .
pytest --cov=app --cov-report=term-missing

# Frontend unit
cd frontend
npm run generate:api-types
npm test && npm run typecheck && npm run lint && npm run build
npm run check:api-types   # regenerate + fail on git diff

# Browser E2E (mocked /api)
cd frontend
npm run test:e2e
```

## Live full-stack acceptance (not automated, not CI)

Used later during deployment acceptance (Phase H). Requires a running Next.js
app, FastAPI, and a real `WEATHERAI_API_KEY` on the **backend only**.

```
Browser → Next.js /api/* → FastAPI → WeatherAI / Photon / ipwho.is
```

Manual checklist (do not add these to CI):

1. Place search (Photon via FastAPI) → suggestions → weather **MISS**
2. Refresh or repeat request inside TTL → **HIT** (`X-Cache`) is allowed
3. Units metric → imperial → new cache key, values match the contract
4. AI off by default; `ai=true` may still return `ai_summary: null` on Free
5. Invalid `/?lat=999&lon=0` → no weather fetch
6. Stop FastAPI → Next.js `/api/weather` surfaces a safe unavailable/timeout UI
7. Confirm the browser never calls WeatherAI, Photon, or ipwho.is directly

This path is **not automated** in this repository today.
