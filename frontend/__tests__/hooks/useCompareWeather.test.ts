/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { useCompareWeather } from "@/hooks/useCompareWeather";
import type { Location } from "@/components/providers/LocationProvider";
import type { WeatherResponse } from "@/lib/types";

const NAIROBI: Location = { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" };
const MOMBASA: Location = { lat: -4.0435, lon: 39.6682, label: "Mombasa, Kenya" };
const KISUMU: Location = { lat: -0.0917, lon: 34.768, label: "Kisumu, Kenya" };

function weatherFor(loc: Location, temperature: number): WeatherResponse {
  return {
    lat: loc.lat,
    lon: loc.lon,
    units: "metric",
    current: {
      temperature,
      wind_speed: 8,
      wind_direction: 90,
      weather_code: 1,
      weather_description: "Clear",
      is_day: true,
      observed_at: "2026-08-20T10:00",
    },
    daily: [
      {
        date: "2026-08-20",
        temp_max: temperature + 2,
        temp_min: temperature - 4,
        precipitation: 0,
        weather_code: 1,
        weather_description: "Clear",
      },
    ],
    hourly: [],
    ai_summary: "should not be requested",
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useCompareWeather", () => {
  it("does not fetch until locations are selected", () => {
    renderHook(() => useCompareWeather([], "metric", 3));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches only the selected locations without ai=true", async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const lat = new URL(url, "http://local.test").searchParams.get("lat");
      const loc = lat === NAIROBI.lat.toFixed(4) || lat === String(NAIROBI.lat) ? NAIROBI : MOMBASA;
      const temp = loc === NAIROBI ? 22 : 29;
      return Promise.resolve(jsonResponse(weatherFor(loc, temp)));
    });

    const { result } = renderHook(() =>
      useCompareWeather([NAIROBI, MOMBASA], "metric", 3)
    );

    await waitFor(() => {
      expect(result.current.every((slot) => slot.status === "success")).toBe(true);
    });
    expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
    for (const call of vi.mocked(fetch).mock.calls) {
      const url = String(call[0]);
      expect(url).toMatch(/^\/api\/weather\?/);
      expect(url).not.toContain("ai=true");
      expect(url).not.toMatch(/weather-ai|photon|ipwho/i);
    }
  });

  it("does not fetch a third favorite when only two are passed", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(weatherFor(NAIROBI, 22)));
    renderHook(() => useCompareWeather([NAIROBI, MOMBASA, KISUMU], "metric", 3));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBe(2));
    const urls = vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("lat=-0.0917"))).toBe(false);
  });

  it("keeps a successful location when the other fails", async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("lat=-4.0435")) {
        return Promise.resolve(
          jsonResponse(
            { error: "backend_unavailable", message: "Weather service temporarily unavailable" },
            false,
            503
          )
        );
      }
      return Promise.resolve(jsonResponse(weatherFor(NAIROBI, 22)));
    });

    const { result } = renderHook(() =>
      useCompareWeather([NAIROBI, MOMBASA], "metric", 3)
    );
    await waitFor(() => {
      expect(result.current[0].status).toBe("success");
      expect(result.current[1].status).toBe("error");
    });
    expect(result.current[0].data?.current.temperature).toBe(22);
    expect(result.current[1].data).toBeNull();
  });

  it("does not refetch the first place when a second is added", async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const lat = new URL(url, "http://local.test").searchParams.get("lat");
      const loc = lat === String(NAIROBI.lat) ? NAIROBI : MOMBASA;
      return Promise.resolve(jsonResponse(weatherFor(loc, loc === NAIROBI ? 22 : 29)));
    });
    const { rerender } = renderHook(
      ({ locs }: { locs: Location[] }) => useCompareWeather(locs, "metric", 3),
      { initialProps: { locs: [NAIROBI] } }
    );
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBe(1));
    rerender({ locs: [NAIROBI, MOMBASA] });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBe(2));
    const urls = vi.mocked(fetch).mock.calls.map((call) => String(call[0]));
    expect(urls.filter((url) => url.includes(`lat=${NAIROBI.lat}`))).toHaveLength(1);
    expect(urls.filter((url) => url.includes(`lat=${MOMBASA.lat}`))).toHaveLength(1);
  });

  it("refetches when units change", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(weatherFor(NAIROBI, 22)));
    const { rerender } = renderHook(
      ({ units }: { units: "metric" | "imperial" }) =>
        useCompareWeather([NAIROBI], units, 3),
      { initialProps: { units: "metric" as "metric" | "imperial" } }
    );
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBe(1));
    rerender({ units: "imperial" });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBe(2));
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("units=imperial");
  });
});
