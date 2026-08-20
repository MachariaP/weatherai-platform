# API Reference

## Browser-Facing

These routes are Next.js Route Handlers. They validate params, proxy to FastAPI,
and never call WeatherAI, Photon, or the IP-lookup provider.

### GET `/api/weather`

**Query Parameters:**

| Param | Required | Type | Default | Constraints |
|---|---|---|---|---|
| `lat` | Yes | number | — | -90 to 90 |
| `lon` | Yes | number | — | -180 to 180 |
| `days` | No | number | 7 | 1–7 |

The UI exposes **3 / 5 / 7** days as a persisted viewing preference
(`forecastDays`). FastAPI remains authoritative for the 1–7 range. `days` is
not added to the shareable location URL.
| `units` | No | string | `metric` | `metric` or `imperial` |
| `ai` | No | string | `false` | `true` or `false` |
| `lang` | No | string | `en` (FastAPI) | Language code passed through to WeatherAI |

**Success Response (200)** — public `WeatherResponse` (not the WeatherAI raw shape):

```json
{
  "lat": -1.2864,
  "lon": 36.8172,
  "units": "metric",
  "place_name": "Nairobi, Kenya",
  "current": {
    "temperature": 22.5,
    "wind_speed": 5.0,
    "wind_direction": 180,
    "weather_code": 1,
    "weather_description": "Mainly clear",
    "is_day": true,
    "observed_at": "2026-08-19T12:00",
    "feels_like": 21.0,
    "humidity": 65,
    "uv_index": 7,
    "pressure": 1013,
    "precip_last_24h": 0.4
  },
  "daily": [
    {
      "date": "2026-08-19",
      "temp_max": 25.0,
      "temp_min": 18.0,
      "precipitation": 0,
      "weather_code": 1,
      "weather_description": "Mainly clear"
    }
  ],
  "hourly": [
    {
      "time": "2026-08-19T14:00",
      "temperature": 23.0,
      "precipitation": 0,
      "weather_code": 1,
      "weather_description": "Mainly clear"
    }
  ],
  "ai_summary": null
}
```

`daily[].precipitation` and `hourly[].precipitation` are **amounts**, not
probabilities. Do not treat them as a chance of rain.

| JSON | Meaning |
|---|---|
| `"precipitation": 0` or `0.0` | Verified zero precipitation |
| `"precipitation": 2.7` | Verified amount in the response `units` (`mm` metric, `in` imperial) |
| `"precipitation": null` | Upstream value unavailable — UI must not display `0` |

`current.observed_at` is passed through from WeatherAI `current.time`. Typical
values are timezone-naive ISO-like strings (`2026-08-19T12:00`). The UI prints
those clock digits (`Observed 12:00`) and does not convert them to the selected
location's timezone.

Optional current extras (`feels_like`, `humidity`, `uv_index`, `pressure`,
`precip_last_24h`) and `place_name` are nullable. The UI hides tiles when they
are null. WeatherAI is always called with coordinates only. `place_name` comes
from FastAPI reverse geocoding (Photon), not from WeatherAI.

**Manual refresh:** the dashboard Refresh control reissues the same
`GET /api/weather` request (`cache: "no-store"` on Next.js). It does **not**
bypass FastAPI's TTL cache, does not send `refresh`/`force`/`no_cache` query
params, and does not invalidate cache from the browser. A response with
`X-Cache: HIT` during TTL is correct.

**Headers:**

| Header | Values | Description |
|---|---|---|
| `X-Cache` | `HIT` or `MISS` | Whether the FastAPI weather cache served this response |
| `X-Request-ID` | opaque id | Correlation ID; Next.js forwards or generates, FastAPI echoes |
| `Retry-After` | seconds (application 429) | When to retry after `rate_limited` |
| `X-RateLimit-Reset` | unix epoch (upstream 429 only) | When the upstream quota resets; only present if upstream provided it |

**Error Responses:**

| Status | Error Code | When |
|---|---|---|
| 400 | `bad_request` | Invalid or missing query params, or upstream rejected the request |
| 403 | `plan_restriction` | WeatherAI returned 403 — feature not on the current plan |
| 429 | `rate_limited` | Application limiter: too many uncached weather requests |
| 429 | `rate_limit` | Upstream WeatherAI quota exhausted |
| 502 | `upstream_auth` | WeatherAI rejected credentials (upstream 401) — never returned as HTTP 401 |
| 502 | `upstream_error` | Unrecoverable upstream 5xx after retries, or unclassified error |
| 502 | `malformed_response` | Non-JSON, non-object, or data that failed normalization |
| 503 | `upstream_unavailable` | WeatherAI circuit is open (cache HIT still served) |
| 503 | `backend_unavailable` | Next.js could not reach FastAPI |
| 504 | `backend_timeout` | Next.js did not receive a FastAPI response in time |
| 504 | `timeout` | WeatherAI did not respond within the backend timeout |

**Error Shape:**

```json
{
  "error": "bad_request",
  "message": "lat is required and must be between -90 and 90"
}
```

### GET `/api/geocode`

Thin proxy to FastAPI `GET /geocode?q=`. Resolves a place name to coordinates.
Photon URLs never appear in the response.

| Param | Required | Constraints |
|---|---|---|
| `q` | Yes | Non-empty place query (min length 2 at the Next.js boundary) |

**Success (200):** `{ "results": [ { "lat": -1.2864, "lon": 36.8172, "label": "Nairobi, Kenya", "country": "Kenya" } ] }`

Each candidate always has `lat`, `lon`, and `label`. `region` and `country` are
included only when the geocoder provided them — they are omitted, not emptied,
when unknown.

An empty match is still 200: `{ "results": [] }`. That is not an application
failure.

Photon URLs and raw Feature objects never appear in the body.

**Errors:** 400 `bad_request` (query too short at the Next.js boundary), 503
`backend_unavailable` / `geocode_unavailable`, 504 timeout.

### GET `/api/reverse`

Thin proxy to FastAPI `GET /reverse?lat=&lon=`.

**Success (200):** `{ "lat": ..., "lon": ..., "label": "Nairobi, Kenya" }`

**Errors:** 400, 404 `not_found` when Photon has no usable name, 503, 504.

### GET `/api/geolocate`

Thin proxy to FastAPI `GET /geolocate`. Approximates lat/lon from the caller's
public IP when browser GPS is unavailable. Next.js may forward `X-Forwarded-For`.
The JSON body never includes an IP address or the lookup-provider URL.

**Success (200):** `{ "lat": -1.2833, "lon": 36.8167, "label": "Nairobi, Kenya" }`

**Errors:** 404, 503, 504 — same stable codes as geocode. Permission-denied GPS
in the browser does **not** call this route.

### Location in the UI (not HTTP)

Coordinates remain the weather identity. The dashboard canonical URL is
`/?lat=&lon=`. `?q=` is not used as identity.

Recent locations are browser `localStorage` only (`weatherai:recent-locations`),
capped at about 8 entries of `{ lat, lon, label }`. Weather payloads are never
stored there.

---

## Backend (Internal)

FastAPI routes used only via Next.js (or local tooling), not from the browser
directly in production.

| Endpoint | Description |
|---|---|
| `GET /weather` | Normalized weather; `X-Cache: HIT\|MISS` |
| `GET /geocode?q=` | Photon search → `{ results: [ { lat, lon, label, region?, country? } ] }` |
| `GET /reverse?lat=&lon=` | Photon reverse → `{ lat, lon, label }` |
| `GET /geolocate` | IP approximation → `{ lat, lon, label }` |
| `GET /health` | Liveness of this process only (`{ "status": "ok" }`). Does not call WeatherAI. |

Public response models are declared on those routes (`WeatherResponse`,
`GeocodeSearchResponse`, `GeocodeResult`, `ApiError`). FastAPI OpenAPI is the
machine-readable contract. Frontend types are generated from it:

```bash
cd frontend && npm run generate:api-types
```

Do not edit `frontend/lib/generated/api-schema.ts`. Stable aliases live in
`frontend/lib/types.ts`. Upstream WeatherAI / Photon / ipwho.is models are not
published in OpenAPI.

See `DOCS/resilience.md` for cache/limiter/circuit ordering, logging, and
the process-local limitation.
