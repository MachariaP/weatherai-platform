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

**Error Responses:**

| Status | Error Code | When |
|---|---|---|
| 400 | `bad_request` | Invalid or missing query params |
| 401 | `auth_error` | API key missing or invalid |
| 429 | `rate_limited` | Upstream rate limit exceeded |
| 502 | `upstream_error` | WeatherAI returned an unrecoverable error |
| 503 | `backend_unavailable` | FastAPI backend is unreachable |
| 504 | `backend_timeout` | FastAPI backend did not respond in time |

**Error Shape:**

```json
{
  "error": "bad_request",
  "message": "lat is required and must be between -90 and 90"
}
```

---

## Backend (Internal)

### GET `/health`

FastAPI health check. Returns `200` with `{ "status": "ok" }`.

Not exposed to the browser — used by Next.js or infrastructure to verify the backend is running.
