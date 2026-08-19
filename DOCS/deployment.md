# Deployment Status & Readiness

## Status

**NOT DEPLOYED / NOT VERIFIED**

As of the Phase 4 reconciliation, there is no verifiable deployment:

- no `.vercel/` directory or `vercel.json`
- no Dockerfile or container config
- no configured Git remote
- no deployment URL that can be verified
- only a successful **local** production build (`npm run build`)

Nothing in this document should be read as a claim that the application is
deployed.

## Target Architecture

The two-service architecture requires **two** hosting targets:

```
Browser ─▶ Next.js (Vercel-compatible) ─▶ FastAPI (publicly reachable) ─▶ WeatherAI
```

The frontend is Next.js/Vercel-compatible. The backend is a FastAPI process
that must be publicly reachable over HTTPS so the deployed frontend can call it.

## Deployment Readiness Checklist

| # | Item | Requirement | Status |
|---|---|---|---|
| 1 | Frontend hosting | Next.js-compatible host (e.g. Vercel) serving `frontend/`; `npm run build` must succeed | local build verified |
| 2 | Backend hosting | Publicly reachable HTTPS endpoint running FastAPI (`uvicorn app.main:app`) with `backend/` env vars | not provisioned |
| 3 | `BACKEND_URL` | Frontend env var (server-side only, no `NEXT_PUBLIC_` prefix) pointing at the deployed backend HTTPS URL | local only (`http://localhost:8000`) |
| 4 | WeatherAI API key | `WEATHERAI_API_KEY` set in the backend environment only; never in the frontend | present locally only |
| 5 | CORS | FastAPI `CORS_ORIGINS` must include the production frontend origin (currently `["http://localhost:3000"]`) | local only |
| 6 | Environment variables | Frontend: `BACKEND_URL`. Backend: `WEATHERAI_API_KEY`, optional `WEATHERAI_BASE_URL`, `CORS_ORIGINS` | documented in `.env*.example` |
| 7 | Health endpoint | `GET /health` reachable from the frontend host (no external dependency) | verified locally |
| 8 | E2E verification | After deploy: MISS → HIT sequence, units, 400 validation, backend-down error, AI behavior (see README E2E notes) | not performed |
| 9 | Security re-check | No credentials in built bundles or Git history (see audit) | verified locally |

## What Would Need to Happen to Deploy

1. Choose and provision a backend host (the prompt for this phase does not
   authorize picking one; this is a decision for review).
2. Provision frontend hosting (e.g. Vercel) with `BACKEND_URL` set server-side.
3. Set `CORS_ORIGINS` on the backend to the production frontend origin.
4. Run the E2E acceptance sequence against the deployed pair.
5. Record evidence (URLs, MISS/HIT output) before claiming deployment.

Deployment is intentionally not performed in this phase. Any deployment claim
must be backed by verifiable evidence.