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

- TypeScript types mirroring the `Weather*` contract
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
