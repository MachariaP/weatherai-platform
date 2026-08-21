/**
 * Tests for lib/api-client.ts — the typed client that talks to FastAPI.
 *
 * We mock global fetch to simulate FastAPI responses without a running
 * backend.  This tests the client layer in isolation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchGeocode, fetchGeolocate, fetchReverse, fetchWeather } from "@/lib/api-client";
import type { WeatherResponse } from "@/lib/types";

const MOCK_WEATHER: WeatherResponse = {
  lat: -1.29,
  lon: 36.82,
  units: "metric",
  current: {
    temperature: 22.5,
    wind_speed: 5.0,
    wind_direction: 180,
    weather_code: 1,
    weather_description: "Mainly clear",
    is_day: true,
    observed_at: "2026-08-19T12:00",
  },
  daily: [
    {
      date: "2026-08-19",
      temp_max: 26,
      temp_min: 15,
      precipitation: 0,
      weather_code: 1,
      weather_description: "Mainly clear",
    },
  ],
  hourly: [
    {
      time: "2026-08-19T12:00",
      temperature: 22.5,
      precipitation: 0,
      weather_code: 1,
      weather_description: "Mainly clear",
    },
  ],
  ai_summary: null,
};

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number; headers?: Headers }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
    headers: init?.headers ?? new Headers(),
  };
}

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", "http://localhost:8000");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("fetchWeather", () => {
  it("returns data on successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(MOCK_WEATHER, { headers: new Headers({ "X-Cache": "MISS" }) })
      )
    );

    const result = await fetchWeather({ lat: -1.29, lon: 36.82 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lat).toBe(-1.29);
      expect(result.cacheStatus).toBe("MISS");
    }
  });

  it("returns cache HIT status from header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(MOCK_WEATHER, { headers: new Headers({ "X-Cache": "HIT" }) })
      )
    );

    const result = await fetchWeather({ lat: -1.29, lon: 36.82 });
    expect(result.ok && result.cacheStatus).toBe("HIT");
  });

  it("forwards all query parameters", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_WEATHER));
    vi.stubGlobal("fetch", mockFetch);

    await fetchWeather({
      lat: 0,
      lon: 0,
      days: 3,
      ai: true,
      units: "imperial",
      lang: "es",
    });

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe("/weather");
    expect(calledUrl.origin).toBe("http://localhost:8000");
    expect(calledUrl.searchParams.get("lat")).toBe("0");
    expect(calledUrl.searchParams.get("lon")).toBe("0");
    expect(calledUrl.searchParams.get("days")).toBe("3");
    expect(calledUrl.searchParams.get("ai")).toBe("true");
    expect(calledUrl.searchParams.get("units")).toBe("imperial");
    expect(calledUrl.searchParams.get("lang")).toBe("es");
  });

  it("omits optional parameters when not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_WEATHER));
    vi.stubGlobal("fetch", mockFetch);

    await fetchWeather({ lat: 1, lon: 2 });

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.has("days")).toBe(false);
    expect(calledUrl.searchParams.has("ai")).toBe(false);
    expect(calledUrl.searchParams.has("units")).toBe(false);
    expect(calledUrl.searchParams.has("lang")).toBe(false);
  });

  it("uses cache: no-store", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_WEATHER));
    vi.stubGlobal("fetch", mockFetch);

    await fetchWeather({ lat: 1, lon: 2 });

    expect(mockFetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("calls FastAPI /weather, not WeatherAI", async () => {
    const mockFetch = vi.fn().mockResolvedValue(jsonResponse(MOCK_WEATHER));
    vi.stubGlobal("fetch", mockFetch);

    await fetchWeather({ lat: 1, lon: 2 });

    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("http://localhost:8000/weather");
    expect(calledUrl).not.toContain("weather-ai");
    expect(calledUrl).not.toContain("api.weather-ai.co");
  });

  it("preserves backend error shape on 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "bad_request", message: "lat must be between -90 and 90" },
          { ok: false, status: 400 }
        )
      )
    );

    const result = await fetchWeather({ lat: 999, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error.error).toBe("bad_request");
    }
  });

  it("preserves backend 403 plan_restriction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "plan_restriction", message: "Feature not available on this plan" },
          { ok: false, status: 403 }
        )
      )
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error.error).toBe("plan_restriction");
    }
  });

  it("preserves backend 429 rate_limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "rate_limit", message: "API quota exhausted" },
          { ok: false, status: 429 }
        )
      )
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.error.error).toBe("rate_limit");
    }
  });

  it("preserves backend 502 upstream_auth (WeatherAI 401 is never forwarded as 401)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "upstream_auth", message: "Service configuration error" },
          { ok: false, status: 502 }
        )
      )
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error.error).toBe("upstream_auth");
    }
  });

  it("preserves backend 502 upstream_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "upstream_error", message: "Weather service temporarily unavailable" },
          { ok: false, status: 502 }
        )
      )
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error.error).toBe("upstream_error");
    }
  });

  it("handles non-JSON error responses gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error("not json")),
        headers: new Headers(),
      })
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error.message).toContain("502");
      expect(JSON.stringify(result.error)).not.toContain("not json");
    }
  });

  it("returns 502 for malformed JSON on a 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("Unexpected token")),
        headers: new Headers(),
      })
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error.error).toBe("malformed_response");
      expect(JSON.stringify(result.error)).not.toContain("Unexpected token");
    }
  });

  it("returns 502 when a 200 body is not the public weather contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ temperature: 22, weathercode: 1 }))
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error.error).toBe("malformed_response");
    }
  });

  it("preserves backend 429 rate_limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "rate_limited", message: "Too many requests" },
          { ok: false, status: 429 }
        )
      )
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.error.error).toBe("rate_limited");
    }
  });

  it("preserves backend 503 upstream_unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: "upstream_unavailable",
            message: "Weather service is temporarily unavailable.",
          },
          { ok: false, status: 503 }
        )
      )
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error.error).toBe("upstream_unavailable");
    }
  });

  it("returns 503 when backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error.error).toBe("backend_unavailable");
      expect(JSON.stringify(result.error)).not.toContain("fetch failed");
    }
  });

  it("uses a 15_000 ms AbortSignal timeout for weather", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(MOCK_WEATHER)));

    await fetchWeather({ lat: 0, lon: 0 });

    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    expect(timeoutSpy).not.toHaveBeenCalledWith(8_000);
  });

  it("accepts a response that resolves within the weather timeout budget", async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(
          new DOMException("The operation was aborted due to timeout", "TimeoutError")
        );
      }, ms);
      return controller.signal;
    });

    const mockFetch = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(jsonResponse(MOCK_WEATHER)), 14_000);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(
              init.signal?.reason ??
                new DOMException("The operation was aborted due to timeout", "TimeoutError")
            );
          });
        })
    );
    vi.stubGlobal("fetch", mockFetch);

    const pending = fetchWeather({ lat: 0, lon: 0 });
    await vi.advanceTimersByTimeAsync(14_000);
    const result = await pending;

    expect(result.ok).toBe(true);
  });

  it("returns 504 when the weather timeout elapses before the backend responds", async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(
          new DOMException("The operation was aborted due to timeout", "TimeoutError")
        );
      }, ms);
      return controller.signal;
    });

    const mockFetch = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              init.signal?.reason ??
                new DOMException("The operation was aborted due to timeout", "TimeoutError")
            );
          });
        })
    );
    vi.stubGlobal("fetch", mockFetch);

    const pending = fetchWeather({ lat: 0, lon: 0 });
    await vi.advanceTimersByTimeAsync(15_000);
    const result = await pending;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(504);
      expect(result.error.error).toBe("backend_timeout");
      expect(result.error.message).toBe("Backend did not respond in time");
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns 504 on timeout", async () => {
    const timeoutError = new DOMException("Signal timed out", "TimeoutError");
    const mockFetch = vi.fn().mockRejectedValue(timeoutError);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(504);
      expect(result.error.error).toBe("backend_timeout");
      expect(JSON.stringify(result.error)).not.toContain("BACKEND_URL");
      expect(JSON.stringify(result.error)).not.toContain("weather-ai");
      expect(JSON.stringify(result.error)).not.toContain("wai_");
      expect(JSON.stringify(result.error)).not.toContain("Authorization");
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the caller request ID on weather timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Signal timed out", "TimeoutError"))
    );

    const result = await fetchWeather({ lat: 0, lon: 0 }, "trace-timeout-01");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.requestId).toBe("trace-timeout-01");
    }
  });

  it("returns 503 when BACKEND_URL is not set", async () => {
    vi.unstubAllEnvs();
    delete process.env.BACKEND_URL;

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error.error).toBe("backend_unavailable");
      expect(JSON.stringify(result.error)).not.toContain("BACKEND_URL");
    }
  });
});

describe("fetchGeocode", () => {
  it("maps FastAPI candidates without leaking geocoder hosts", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya", country: "Kenya" },
          {
            lat: 41.7756,
            lon: -88.3806,
            label: "Nairobi, United States",
            region: "Illinois",
            country: "United States",
          },
        ],
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchGeocode("Nairobi");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.results).toHaveLength(2);
      expect(result.data.results[0].label).toBe("Nairobi, Kenya");
    }
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("http://localhost:8000/geocode");
    expect(calledUrl).toContain("q=Nairobi");
    expect(calledUrl).not.toContain("nominatim");
    expect(calledUrl).not.toContain("photon");
    expect(calledUrl).not.toContain("weather-ai");
  });

  it("returns 504 on timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Signal timed out", "TimeoutError"))
    );
    const result = await fetchGeocode("Nairobi");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(504);
      expect(result.error.error).toBe("backend_timeout");
    }
  });
});

describe("fetchGeolocate", () => {
  it("calls FastAPI /geolocate and does not leak upstream hosts", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchGeolocate("8.8.8.8");
    expect(result.ok).toBe(true);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("http://localhost:8000/geolocate");
    expect(calledUrl).not.toContain("ipwho");
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      headers: { "X-Forwarded-For": "8.8.8.8" },
    });
  });
});

describe("fetchReverse", () => {
  it("calls FastAPI /reverse, not an upstream host", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse({ lat: 0, lon: 0, label: "Gulf of Guinea" })
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchReverse(0, 0);
    expect(result.ok).toBe(true);
    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("http://localhost:8000/reverse");
    expect(calledUrl).not.toContain("nominatim");
  });
});
