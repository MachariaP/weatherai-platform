/**
 * Tests for app/api/weather/route.ts — the Next.js Route Handler.
 *
 * We mock the api-client's fetchWeather to test the route in isolation.
 * This verifies validation, error propagation, and header forwarding
 * without a running FastAPI backend.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/weather/route";
import { NextRequest } from "next/server";
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
  daily: [],
  hourly: [],
  ai_summary: null,
};

vi.mock("@/lib/api-client", () => ({
  fetchWeather: vi.fn(),
}));

import { fetchWeather } from "@/lib/api-client";
const mockFetchWeather = vi.mocked(fetchWeather);

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/weather");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/weather", () => {
  // ---- Validation ----

  it("returns 400 when lat is missing", async () => {
    const res = await GET(makeRequest({ lon: "36" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("bad_request");
  });

  it("returns 400 when lon is missing", async () => {
    const res = await GET(makeRequest({ lat: "-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for lat out of range", async () => {
    const res = await GET(makeRequest({ lat: "91", lon: "0" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("lat");
  });

  it("returns 400 for lon out of range", async () => {
    const res = await GET(makeRequest({ lat: "0", lon: "181" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric lat", async () => {
    const res = await GET(makeRequest({ lat: "abc", lon: "0" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid days", async () => {
    const res = await GET(makeRequest({ lat: "0", lon: "0", days: "0" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid units", async () => {
    const res = await GET(makeRequest({ lat: "0", lon: "0", units: "kelvin" }));
    expect(res.status).toBe(400);
  });

  // ---- Successful request ----

  it("returns 200 with weather data on success", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: true,
      data: MOCK_WEATHER,
      cacheStatus: "MISS",
    });

    const res = await GET(makeRequest({ lat: "-1.29", lon: "36.82" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lat).toBe(-1.29);
  });

  it("forwards X-Cache header from backend", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: true,
      data: MOCK_WEATHER,
      cacheStatus: "HIT",
    });

    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.headers.get("X-Cache")).toBe("HIT");
  });

  // ---- Parameter forwarding ----

  it("forwards optional parameters to fetchWeather", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: true,
      data: MOCK_WEATHER,
      cacheStatus: null,
    });

    await GET(
      makeRequest({
        lat: "0",
        lon: "0",
        days: "3",
        ai: "true",
        units: "imperial",
        lang: "es",
      })
    );

    expect(mockFetchWeather).toHaveBeenCalledWith({
      lat: 0,
      lon: 0,
      days: 3,
      ai: true,
      units: "imperial",
      lang: "es",
    });
  });

  // ---- Error propagation ----

  it("propagates 401 from backend", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: false,
      status: 401,
      error: { error: "auth_error", message: "Invalid API key" },
    });

    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("auth_error");
  });

  it("propagates 429 from backend", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: false,
      status: 429,
      error: { error: "rate_limited", message: "Too many requests" },
    });

    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.status).toBe(429);
  });

  it("propagates 503 (backend unavailable)", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: false,
      status: 503,
      error: {
        error: "backend_unavailable",
        message: "Backend is unreachable",
      },
    });

    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("backend_unavailable");
  });

  it("propagates 504 (backend timeout)", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: false,
      status: 504,
      error: {
        error: "backend_timeout",
        message: "Backend did not respond in time",
      },
    });

    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error).toBe("backend_timeout");
  });

  // ---- Edge cases ----

  it("accepts lat=0 and lon=0 (valid coordinates)", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: true,
      data: { ...MOCK_WEATHER, lat: 0, lon: 0 },
      cacheStatus: null,
    });

    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.status).toBe(200);
  });

  it("accepts boundary values lat=-90, lon=-180", async () => {
    mockFetchWeather.mockResolvedValue({
      ok: true,
      data: { ...MOCK_WEATHER, lat: -90, lon: -180 },
      cacheStatus: null,
    });

    const res = await GET(makeRequest({ lat: "-90", lon: "-180" }));
    expect(res.status).toBe(200);
  });
});
