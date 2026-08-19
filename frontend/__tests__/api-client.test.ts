/**
 * Tests for lib/api-client.ts — the typed client that talks to FastAPI.
 *
 * We mock global fetch to simulate FastAPI responses without a running
 * backend.  This tests the client layer in isolation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWeather } from "@/lib/api-client";
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

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", "http://localhost:8000");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("fetchWeather", () => {
  it("returns data on successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_WEATHER),
        headers: new Headers({ "X-Cache": "MISS" }),
      })
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
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_WEATHER),
        headers: new Headers({ "X-Cache": "HIT" }),
      })
    );

    const result = await fetchWeather({ lat: -1.29, lon: 36.82 });
    expect(result.ok && result.cacheStatus).toBe("HIT");
  });

  it("forwards all query parameters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER),
      headers: new Headers(),
    });
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
    expect(calledUrl.searchParams.get("lat")).toBe("0");
    expect(calledUrl.searchParams.get("lon")).toBe("0");
    expect(calledUrl.searchParams.get("days")).toBe("3");
    expect(calledUrl.searchParams.get("ai")).toBe("true");
    expect(calledUrl.searchParams.get("units")).toBe("imperial");
    expect(calledUrl.searchParams.get("lang")).toBe("es");
  });

  it("omits optional parameters when not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchWeather({ lat: 1, lon: 2 });

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.has("days")).toBe(false);
    expect(calledUrl.searchParams.has("ai")).toBe(false);
    expect(calledUrl.searchParams.has("units")).toBe(false);
    expect(calledUrl.searchParams.has("lang")).toBe(false);
  });

  it("uses cache: no-store", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchWeather({ lat: 1, lon: 2 });

    expect(mockFetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("preserves backend error shape on 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: "bad_request",
            message: "lat must be between -90 and 90",
          }),
      })
    );

    const result = await fetchWeather({ lat: 999, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error.error).toBe("bad_request");
    }
  });

  it("preserves backend error shape on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: "auth_error",
            message: "Invalid API key",
          }),
      })
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error.error).toBe("auth_error");
    }
  });

  it("preserves backend error shape on 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: "rate_limited",
            message: "Too many requests",
          }),
      })
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
    }
  });

  it("preserves backend error shape on 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: "server_error",
            message: "Upstream server error",
          }),
      })
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
    }
  });

  it("handles non-JSON error responses gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error("not json")),
      })
    );

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error.message).toContain("502");
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
    }
  });

  it("returns 504 on timeout", async () => {
    const timeoutError = new DOMException("Signal timed out", "TimeoutError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    const result = await fetchWeather({ lat: 0, lon: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(504);
      expect(result.error.error).toBe("backend_timeout");
    }
  });

  it("throws when BACKEND_URL is not set", async () => {
    vi.unstubAllEnvs();
    delete process.env.BACKEND_URL;

    await expect(fetchWeather({ lat: 0, lon: 0 })).rejects.toThrow(
      "BACKEND_URL is not set"
    );
  });
});
