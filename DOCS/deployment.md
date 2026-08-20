# Deployment topology (Phase G)

## Status

**NOT DEPLOYED / NOT VERIFIED**

This phase records the **intended** production topology. It does not provision
hosts, push secrets, or publish URLs. Phase H performs the actual deploy.

There is still no `.vercel/` directory, Dockerfile, or live URL. A local
`npm run build` is not a deployment.

## Selected topology

Take-home constraints: simple reviewer experience, HTTPS, server-side secrets,
low/no cost, observable logs, no Kubernetes.

```
Browser
  ↓ HTTPS, same-origin
Next.js on Vercel (Hobby)
  ↓ BACKEND_URL (server-side only)
FastAPI on Render Web Service
  1 instance × 1 uvicorn worker
  ↓
WeatherAI / Photon / ipwho.is
```

| Side | Host | Why |
|---|---|---|
| Frontend | **Vercel** | Native Next.js, HTTPS, server-only env vars, no extra Node process to operate |
| Backend | **Render Web Service** | Public HTTPS, env vars, logs, health-check path, **one instance** by default |

Do not run multiple uvicorn workers on Render. Do not enable autoscale. Recents
and favorites stay in the browser; they do not affect this topology.

## Process model

**Expected worker count: 1**  
**Expected replica / instance count: 1**

Start command (Render, or any similar PaaS):

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
```

`--workers 1` is required. Extra workers fork extra processes and split the
in-memory weather cache, geocode cache, rate limiter, and circuit breaker.

## Redis decision

**Classification: NOT REQUIRED FOR CURRENT DEPLOYMENT**

Evidence:

- The selected backend is **one process**.
- `WeatherCache` is already an in-process TTL dict behind a swap-ready protocol.
- The limiter and breaker are process-local by design (Phase F).
- WeatherAI Free quota is small; a reviewer demo does not need a global cache
  fabric.
- Redis would add a paid/always-on dependency, credentials, failure modes, and
  CI complexity without changing reviewer-visible behavior.

Redis becomes **recommended later** only if the topology changes to:

- `uvicorn --workers N` with N > 1, or
- more than one FastAPI replica / instance

Then implement **shared weather cache first** (quota), then a **shared uncached
limiter**. Keep the circuit breaker **process-local** unless a later review
proves coordinated fail-fast is worth the extra state.

Do not add Redis only to survive Render free-tier spin-down. An empty cache
after a cold start is an honest MISS.

## Environment variables

Set these on the host. Never commit real values. Never use `NEXT_PUBLIC_*`
for secrets or `BACKEND_URL`.

### Frontend (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `BACKEND_URL` | yes | Public HTTPS origin of FastAPI, no trailing path. Example: `https://weatherai-qa.onrender.com` |

### Backend (Render)

| Variable | Required | Notes |
|---|---|---|
| `WEATHERAI_API_KEY` | yes | `wai_…` — backend only |
| `WEATHERAI_BASE_URL` | no | Default `https://api.weather-ai.co` |
| `CORS_ORIGINS` | yes in prod | Exact HTTPS frontend origin, e.g. `https://your-app.vercel.app`. No `*` |
| `RATE_LIMIT_REQUESTS` | no | Default 60 |
| `RATE_LIMIT_WINDOW_SECONDS` | no | Default 60 |
| `CIRCUIT_FAILURE_THRESHOLD` | no | Default 5 |
| `CIRCUIT_COOLDOWN_SECONDS` | no | Default 30 |

There is no `REDIS_URL`. Local `.env` files stay the development defaults.

## CORS

The browser talks to Next.js, not FastAPI. CORS still matters for FastAPI
docs, direct API checks, and any accidental browser call.

- Development: `CORS_ORIGINS=["http://localhost:3000"]`
- Production: set `CORS_ORIGINS` to the **known** Vercel origin after it exists
- Wildcard `*` is rejected at settings load
- Credentials are disabled
- `X-Request-ID`, `X-Cache`, and `Retry-After` are exposed

Do not hardcode a Vercel URL that has not been provisioned.

## Health

`GET /health` is **liveness** of this FastAPI process. It must not call
WeatherAI, Photon, or Redis (none is deployed).

A separate `/ready` endpoint is **not** added. The selected host can probe
`/health`. Readiness that depended on WeatherAI would flap during upstream
outages while the app is still correctly serving cache HITs.

## Cold start and restart

Render free instances may sleep. On process start:

| State | After restart / cold start |
|---|---|
| Weather cache | empty → first request is MISS |
| Geocode cache | empty |
| Rate limiter | full allowance |
| Circuit breaker | CLOSED |

That is expected for memory mode.

## What Phase H must still do

1. Create the Render web service with the start command above, `workers 1`.
2. Create the Vercel project for `frontend/`.
3. Set `BACKEND_URL` and `CORS_ORIGINS` to the real HTTPS origins.
4. Set `WEATHERAI_API_KEY` on Render only.
5. Confirm `GET /health` over HTTPS, then a MISS → HIT weather sequence.
6. Record URLs before claiming the app is deployed.
