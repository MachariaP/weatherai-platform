# Challenges & Discoveries

Lessons learned during development, documented for interview prep and future reference.

---

## Challenge 1: API Documentation vs Reality (Phase 1)

**When:** Phase 1 — smoke test against real WeatherAI API

**What happened:** The upstream response models were built from the WeatherAI documentation, which shows a nested structure (`location.name`, `current.temp_c`, `forecast.forecastday[]`). The smoke test against the real API failed — every field parsed as `None` on a 200 OK response.

**The real API shape differs from the docs:**

| What the docs say | What the API actually returns |
|---|---|
| `location.name`, `location.country` | `lat` and `lon` as flat top-level fields, no location object |
| `current.temp_c`, `current.wind_kph` | `current.temperature`, `current.windspeed` |
| `forecast.forecastday[]` (nested) | `daily[]` and `hourly[]` as top-level arrays |
| `X-RateLimit-Remaining` header | No rate-limit headers on the Free plan |

**Why it matters:**

1. A 200 status code does not mean the data is usable. The response was valid JSON, Pydantic parsed it without error, but every field was `None` because the real keys didn't match the documented ones.
2. Documentation drifts from reality. Docs are a hypothesis, not a fact — the smoke test is what verified the actual contract.
3. Automated tests with mocked responses would never have caught this, because the mocks were built from the same (incorrect) docs. Only a real API call revealed the gap.

**How it was fixed:**

- Updated `UpstreamWeatherResponse` and related models in `app/models.py` to match the real API shape.
- The fix was contained to the upstream model layer only — no route code, no retry logic, no frontend code changed.
- This was possible because upstream models (`Upstream*`) were deliberately separated from our public API models (`Weather*`). The two-layer architecture absorbed the mismatch at the boundary.

**The principle:** Test against the contract you were given (docs). Verify against the system you actually depend on (real API). When they disagree, trust reality and document the gap.

**Interview delivery:** This is a strong answer for "tell me about a bug you found" or "why do you separate smoke tests from unit tests?" The key point is that two test categories catch different classes of bugs — automated tests verify your own logic, smoke tests verify your assumptions about external systems.
