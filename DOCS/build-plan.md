# Build Plan

Phase-by-phase plan for the WeatherAI QA project.

---

## Scope Status (reconciled)

- **Phases 0–3** were the originally approved implementation boundary. They are
  implemented, tested, and verified.
- **Phases 4–10** were implemented additionally, beyond the approved Phase 3
  boundary. They have been independently audited and are **retained
  provisionally** because they do not violate the original architecture
  (verified against the frozen contract in `architecture.md`).
- The reconciliation phase validates and hardens that work rather than
  expanding scope. It does not add product features.
- Deployment is **NOT DEPLOYED / NOT VERIFIED** — see `deployment.md`.
  Phase G selected Vercel + one Render FastAPI worker; Redis is deferred.
- **Phase A0 + A (location discovery)** — stabilize existing geocode/UI work,
  then add suggestion lists, recent locations, and shareable `/?lat=&lon=`
  URLs.
- **Phase B (precipitation + refresh)** — honest optional precipitation
  amounts (zero is data; missing is not zero) and a last-updated / Refresh
  control that respects the FastAPI TTL cache.
- **Phase C (browser E2E + CI build gate)** — Playwright journeys against
  mocked `/api/*`, plus `npm run build` in CI.
- **Phase D (forecast range + saved places)** — UI for existing `days`, and
  local favorites. Later phases are not in this increment.
- **Phase F (observability + rate limit + circuit breaker)** — process-local
  WeatherAI protection and JSON request logs. See `DOCS/resilience.md`.
- **Phase G (deployment topology)** — Vercel + one Render FastAPI worker.
  Redis is not required for that topology. Deployment itself is Phase H.

---

## Phase 0: Foundation ✅

- FastAPI + Next.js project scaffold
- Health check endpoints
- Git init, project structure, environment config

## Phase 1: WeatherAI Client ✅

- Typed HTTP client for the WeatherAI API
- Retry logic with exponential backoff on 5xx
- Error mapping (upstream errors → structured responses)
- Smoke test against real API (discovered doc/reality mismatch — see `challenges.md`)

## Phase 2: Normalization + Cache ✅

- Two-layer data models: `Upstream*` (raw) vs `Weather*` (public contract)
- `normalize()` function to transform between layers
- In-memory TTL cache on the FastAPI side
- Unit tests for normalization

## Phase 3: Next.js Data Boundary ✅

- TypeScript types mirroring the `Weather*` contract (later generated from OpenAPI in Phase E)
- `api-client.ts` — server-side fetch to FastAPI
- `/api/weather` route handler — validates params, delegates, forwards `X-Cache`
- `cache: "no-store"` to avoid double-caching
- Tests for the route handler

## Phase 4: Hooks + Context Providers

- `useWeather` hook (fetch, loading, error state)
- Unit toggle context (metric/imperial)
- Location context

## Phase 5: Layout, Header, Search, Unit Toggle

- App shell and responsive layout
- Header with branding
- Location search input
- Metric/imperial toggle

## Phase 6: Current Weather Card + AI Summary

- Current conditions display (temp, wind, humidity, condition icon)
- AI-generated weather summary (optional, `ai=true`)

## Phase 7: 7-Day Forecast + Hourly Scroll

- Daily forecast cards (7 days)
- Horizontally scrollable hourly forecast

## Phase 8: Loading / Error / Empty States

- Skeleton loaders
- Error boundaries with user-friendly messages
- Empty state for no location selected

## Phase 9: Tests

- Unit tests for hooks, utilities, normalization
- Integration tests for API routes
- Component tests for key UI pieces

## Phase 10: README + Deploy

- Comprehensive README (setup, env vars, architecture overview)
- Deployment config (Docker or platform-specific)
- Final cleanup and polish

## Phase C: Browser E2E + CI build gate

- Playwright Chromium (+ one mobile viewport) against mocked Next.js `/api/*`
- CI production build gate and a separate Playwright job
- Live WeatherAI acceptance remains manual — see `testing.md`

## Phase D: Forecast range + saved places

- Forecast range preference (3/5/7 days, default 7) using existing FastAPI `days`
- Local saved places (`localStorage`, max 20, coordinate identity)
- No backend product change; extra pytest coverage that `days` is part of the cache key

## Phase E: Generated public API types

- FastAPI `response_model` for public weather/geocode/error/health schemas
- `openapi-typescript` generates `frontend/lib/generated/api-schema.ts`
- `npm run generate:api-types` / CI drift check
- Frontend-only types remain handwritten

## Phase F: Observability, rate limiting, circuit breaker

- JSON request logs with `X-Request-ID`
- Application limiter on uncached WeatherAI calls (cache HIT bypass)
- Circuit breaker around retried WeatherAI calls
- Process-local only; see `DOCS/resilience.md`

## Phase G: Deployment topology (no live deploy)

- Selected: Next.js on Vercel, FastAPI on Render, **1 instance × 1 worker**
- Redis **not required** for that topology (see `DOCS/deployment.md`)
- Production CORS: explicit origins only; wildcard rejected
- `/health` remains liveness; no `/ready` endpoint
- Phase H is the actual provision/deploy step

## Advanced exploration UI (frontend)

- Interactive hourly SVG chart (dashboard: next 24 hours from the current
  hour; drill-down: all hours for the selected date; temperature and
  precipitation only — hourly wind is not on the public contract)
- Forecast-day drill-down from existing `hourly[]` (honest empty state when a
  later daily row has no hourly coverage)
- Unified location switcher (search, saved, recent, GPS, coordinates, compare)
- Explicit two-place compare via existing `/api/weather`, `ai` omitted
- Subtle `motion-safe` transitions; no new backend contract

