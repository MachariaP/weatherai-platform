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

---

## Challenge 2: AI summary default and Free-plan behavior (Phase 4 reconciliation)

**When:** Phase 4 — reconciliation audit against the live API

**What the docs say:** The WeatherAI docs describe `ai` as `Include AI summary. Default: true` and warn to pass `?ai=false` to "skip Gemini AI summaries and preserve your AI quota."

**What our backend does:** `app/client.py` sends `ai=false` explicitly on every request unless the caller requested AI. This is deliberate — our Engineering Decision is that AI summaries are OFF by default, because the Free plan has a separate, smaller AI quota (200 AI requests/month vs 1,000 general requests/month). We do not rely on the upstream default, which is the opposite of ours.

**What the live API actually returns:** With a real Free-plan key, both `ai=true` and `ai=false` requests returned `200` with `ai_summary: null` in the observed tests. No rate-limit headers were returned either (see Challenge 1). The WeatherAI documentation does not currently explain why a Free-plan request with `ai=true` may return no summary, so we document the observation without speculating about the cause.

**Why it matters:**

1. The public contract (`ai_summary: string | null`) already handles this correctly — the UI renders the summary only when present.
2. Quota protection is implemented at the request layer, not the presentation layer: the parameter is only sent as `ai=true` when the user explicitly enables it.
3. It reinforces Challenge 1: docs are a hypothesis, the smoke test is the proof.

**Interview delivery:** This pairs with Challenge 1 — "what surprised you about the real API?" The AI summary is implemented at the application boundary, but availability depends on the upstream plan and response. We don't fake a summary and we don't speculate in the docs; we verify and document.
