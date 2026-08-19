# Interview Prep — Technical Q&A

Answers framed for a technical interview context.

---

## Q: Why a two-service architecture instead of calling WeatherAI directly from Next.js?

**A:** Three reasons. First, **security** — the API key stays on the FastAPI server and never reaches the browser or even the Next.js server-side bundle where a misconfiguration (`NEXT_PUBLIC_` prefix) could leak it. Second, **separation of concerns** — retry logic, caching, rate-limit handling, and data normalization are Python-native concerns that don't belong in a Next.js route handler. Third, **replaceability** — if we swap WeatherAI for another provider, only the FastAPI layer changes. The frontend contract stays identical.

---

## Q: How do you handle API key security?

**A:** The API key lives exclusively in the FastAPI backend's environment. Next.js knows `BACKEND_URL` (deliberately without a `NEXT_PUBLIC_` prefix, so it's server-side only) but never the API key itself. The browser talks to `/api/weather` on Next.js, which proxies to FastAPI. There's no path for the key to reach the client.

---

## Q: Explain the retry strategy.

**A:** Exponential backoff on 5xx responses only. A 4xx is a client error — retrying won't help. For 5xx, we retry with increasing delays (e.g., 1s, 2s, 4s) up to a configurable max. This absorbs transient upstream failures without overwhelming a struggling service. If all retries fail, we return a `502 upstream_error` to the caller.

---

## Q: Why two layers of data models?

**A:** `Upstream*` models match the real WeatherAI response shape. `Weather*` models define our public contract. The `normalize()` function bridges them. This matters because the upstream API shape is outside our control — when we discovered the docs were wrong (see `challenges.md`), we only had to update the `Upstream*` models. No route code, no frontend code, no tests broke. The boundary absorbed the change.

---

## Q: How does caching work and why only one cache layer?

**A:** FastAPI has an in-memory TTL cache keyed on the request params. When a cache hit occurs, it sets `X-Cache: HIT` and skips the upstream call. Next.js uses `cache: "no-store"` on its fetch to FastAPI, so it doesn't add a second cache layer. Two caches would create stale-data bugs and make cache invalidation unpredictable. One cache, one source of truth.

---

## Q: How do you handle the API documentation being wrong?

**A:** This actually happened in Phase 1. The WeatherAI docs describe a nested structure (`location.name`, `forecast.forecastday[]`), but the real API returns flat fields (`lat`, `lon`, `daily[]`). We got 200 OK responses where every field parsed as `None` because Pydantic silently accepted the mismatched keys.

The fix was simple because the two-layer model architecture isolated the blast radius. We updated `Upstream*` models to match reality, and the `normalize()` function handled the rest. The lesson: docs are a hypothesis, smoke tests are the proof. Mocked tests built from docs would never have caught this. (Full write-up in `challenges.md`.)

---

## Q: What does your error handling strategy look like?

**A:** Errors are classified and mapped at each boundary:

1. **FastAPI** catches upstream errors and maps them to structured responses with appropriate HTTP codes (401, 429, 502).
2. **Next.js** validates query params (400), handles FastAPI being unreachable (503) or slow (504), and forwards everything else.
3. **Every error** follows the same shape: `{ error: "<code>", message: "<human-readable>" }`.
4. **The browser** never sees raw upstream errors or stack traces.

---

## Q: How do you test this?

**A:** Multiple layers:

- **Unit tests** — normalization logic, param validation, error mapping. These use mocked data.
- **Smoke tests** — hit the real WeatherAI API with real credentials. These verify our assumptions about the external system. They're what caught the doc mismatch.
- **Route handler tests** — test the Next.js `/api/weather` handler with mocked FastAPI responses.
- **Integration tests** — end-to-end through both services.

The key insight: mocked tests verify *our* logic, smoke tests verify *our assumptions about external systems*. They catch different classes of bugs.

---

## Q: What would you do differently in production?

**A:**

- **Redis** instead of in-memory cache — survives restarts, works across multiple backend instances.
- **Rate limiting** on the Next.js layer to protect the backend from abusive clients.
- **Structured logging** (JSON) with correlation IDs flowing through both services.
- **Circuit breaker** pattern — after N consecutive upstream failures, fail fast for a cooldown period instead of burning through retries.
- **Monitoring/alerting** — track cache hit rates, upstream latency, error rates.
- **API versioning** — version the public contract so frontend and backend can evolve independently.
