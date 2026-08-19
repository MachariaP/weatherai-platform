/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWeather } from "@/hooks/useWeather";
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

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER),
      headers: new Headers({ "x-cache": "MISS" }),
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useWeather", () => {
  it("does not fetch when lat/lon are null", () => {
    renderHook(() => useWeather(null, null));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches weather when lat/lon provided", async () => {
    const { result } = renderHook(() => useWeather(-1.29, 36.82));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.lat).toBe(-1.29);
    expect(result.current.error).toBeNull();
    expect(result.current.cacheStatus).toBe("MISS");
  });

  it("sets error on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: "bad_request",
            message: "Invalid coordinates",
          }),
        headers: new Headers(),
      })
    );

    const { result } = renderHook(() => useWeather(999, 0));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.error).toBe("bad_request");
    expect(result.current.data).toBeNull();
  });

  it("sets network error on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    const { result } = renderHook(() => useWeather(0, 0));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.error).toBe("network_error");
  });

  it("passes units to the fetch URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useWeather(0, 0, "imperial"));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("units=imperial");
  });

  it("passes ai=true when enabled", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useWeather(0, 0, "metric", true));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("ai=true");
  });

  it("omits ai param when disabled (default)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_WEATHER),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useWeather(0, 0, "metric", false));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).not.toContain("ai=");
  });
});
