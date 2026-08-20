/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
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

function okResponse(data: WeatherResponse = MOCK_WEATHER, cache = "MISS") {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    headers: new Headers({ "x-cache": cache }),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse()));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useWeather", () => {
  it("stays idle and does not fetch when lat/lon are null", () => {
    const { result } = renderHook(() => useWeather(null, null));

    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is loading as soon as lat/lon appear on an existing hook instance", () => {
    const { result, rerender } = renderHook(
      ({ lat, lon }: { lat: number | null; lon: number | null }) =>
        useWeather(lat, lon),
      { initialProps: { lat: null as number | null, lon: null as number | null } }
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.isLoading).toBe(false);

    rerender({ lat: -1.29, lon: 36.82 });

    expect(result.current.status).toBe("loading");
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("exposes a loading state while the request is in flight", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));

    const { result } = renderHook(() => useWeather(-1.29, 36.82));

    await waitFor(() => expect(result.current.status).toBe("loading"));
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveFetch?.(okResponse());
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
  });

  it("fetches weather when lat/lon provided", async () => {
    const { result } = renderHook(() => useWeather(-1.29, 36.82));

    await waitFor(() => expect(result.current.status).toBe("success"));

    expect(result.current.data?.lat).toBe(-1.29);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.cacheStatus).toBe("MISS");
  });

  it("calls GET /api/weather and never WeatherAI", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", mockFetch);

    renderHook(() => useWeather(-1.29, 36.82));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl.startsWith("/api/weather?")).toBe(true);
    expect(calledUrl).not.toContain("weather-ai");
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
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

    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.error?.error).toBe("bad_request");
    expect(result.current.data).toBeNull();
  });

  it("sets network error on fetch failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    const { result } = renderHook(() => useWeather(0, 0));

    await waitFor(() => expect(result.current.status).toBe("error"));

    expect(result.current.error?.error).toBe("network_error");
    expect(JSON.stringify(result.current.error)).not.toContain("Failed to fetch");
  });

  it("retries the request when refetch is called", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () =>
          Promise.resolve({
            error: "upstream_error",
            message: "Weather service temporarily unavailable",
          }),
        headers: new Headers(),
      })
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", mockFetch);

    const { result } = renderHook(() => useWeather(0, 0));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.error).toBe("upstream_error");

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data?.lat).toBe(-1.29);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("refetches when units change to imperial", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", mockFetch);

    const { rerender } = renderHook(
      ({ units }: { units: "metric" | "imperial" }) =>
        useWeather(0, 0, units, false),
      { initialProps: { units: "metric" as "metric" | "imperial" } }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(String(mockFetch.mock.calls[0][0])).toContain("units=metric");

    rerender({ units: "imperial" });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(String(mockFetch.mock.calls[1][0])).toContain("units=imperial");
  });

  it("refetches when the AI preference is enabled", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", mockFetch);

    const { rerender } = renderHook(
      ({ ai }: { ai: boolean }) => useWeather(0, 0, "metric", ai),
      { initialProps: { ai: false } }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(String(mockFetch.mock.calls[0][0])).not.toContain("ai=");

    rerender({ ai: true });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(String(mockFetch.mock.calls[1][0])).toContain("ai=true");
  });

  it("refetches when location coordinates change", async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", mockFetch);

    const { rerender } = renderHook(
      ({ lat, lon }: { lat: number; lon: number }) => useWeather(lat, lon),
      { initialProps: { lat: 0, lon: 0 } }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    rerender({ lat: -1.29, lon: 36.82 });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const secondUrl = String(mockFetch.mock.calls[1][0]);
    expect(secondUrl).toContain("lat=-1.29");
    expect(secondUrl).toContain("lon=36.82");
  });

  it("returns to idle and clears data when location is removed", async () => {
    const { result, rerender } = renderHook(
      ({ lat, lon }: { lat: number | null; lon: number | null }) =>
        useWeather(lat, lon),
      { initialProps: { lat: -1.29 as number | null, lon: 36.82 as number | null } }
    );

    await waitFor(() => expect(result.current.status).toBe("success"));

    rerender({ lat: null, lon: null });

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("aborts the in-flight request on unmount", async () => {
    const mockFetch = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", mockFetch);

    const { unmount } = renderHook(() => useWeather(0, 0));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    unmount();

    const signal = mockFetch.mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });
});
