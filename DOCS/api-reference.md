# API Reference

## Browser-Facing

### GET `/api/weather`

Next.js route handler. Validates params, proxies to FastAPI, forwards the response.

**Query Parameters:**

| Param | Required | Type | Default | Constraints |
|---|---|---|---|---|
| `lat` | Yes | number | — | -90 to 90 |
| `lon` | Yes | number | — | -180 to 180 |
| `days` | No | number | 7 | 1–7 |
| `units` | No | string | `metric` | `metric` or `imperial` |
| `ai` | No | string | `false` | `true` or `false` |
| `lang` | No | string | — | Language code |

**Success Response (200):**

```json
{
  "current": {
    "temperature": 22.5,
    "feels_like": 21.0,
    "humidity": 65,
    "wind_speed": 12.3,
    "wind_direction": "NW",
    "condition": "Partly cloudy",
    "icon": "partly-cloudy"
  },
  "daily": [
    {
      "date": "2026-08-19",
      "high": 25.0,
      "low": 18.0,
      "condition": "Sunny",
      "icon": "sunny"
    }
  ],
  "hourly": [
    {
      "time": "2026-08-19T14:00:00",
      "temperature": 23.0,
      "condition": "Partly cloudy",
      "icon": "partly-cloudy"
    }
  ],
  "ai_summary": "Expect warm and dry conditions throughout the day..."
}
```

**Headers:**

| Header | Values | Description |
|---|---|---|
| `X-Cache` | `HIT` or `MISS` | Whether the FastAPI cache served this response |
| `X-RateLimit-Reset` | unix epoch (429 only) | When the upstream quota resets; only present if upstream provided it |

**Error Responses:**

| Status | Error Code | When |
|---|---|---|
| 400 | `bad_request` | Invalid or missing query params (frontend validation) or upstream rejected the request |
| 403 | `plan_restriction` | WeatherAI returned 403 — requested feature not available on the current plan |
| 429 | `rate_limit` | Upstream rate limit / quota exhausted |
| 502 | `upstream_auth` | WeatherAI rejected our credentials (upstream 401) — deliberately surfaced as a server-side configuration error, never as a client auth error |
| 502 | `upstream_error` | WeatherAI returned an unrecoverable 5xx (after retries) or an unclassified upstream error |
| 502 | `malformed_response` | Upstream returned non-JSON, a non-object body, or data that failed normalization |
| 503 | `backend_unavailable` | Next.js could not reach the FastAPI backend |
| 504 | `backend_timeout` | Next.js did not receive a response from FastAPI in time |
| 504 | `timeout` | WeatherAI did not respond within the backend timeout |

**Error Shape:**

```json
{
  "error": "bad_request",
  "message": "lat is required and must be between -90 and 90"
}
```

> **Note on 401:** the backend never returns `401`. Upstream authentication failures (WeatherAI 401) are mapped to `502 upstream_auth` so the browser cannot distinguish a client error from a server configuration problem.

---

## Backend (Internal)

### GET `/health`

FastAPI health check. Returns `200` with `{ "status": "ok" }`.

Not exposed to the browser — used by Next.js or infrastructure to verify the backend is running.
