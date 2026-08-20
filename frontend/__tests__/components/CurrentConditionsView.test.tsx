/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { WeatherResponse } from "@/lib/types";
import { CurrentConditionsView } from "@/components/weather/CurrentConditionsView";
import { Header } from "@/components/ui/Header";
import { BottomNav } from "@/components/ui/BottomNav";
import { LocationProvider, useLocation } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { ViewProvider } from "@/components/providers/ViewProvider";

const MOCK_WEATHER: WeatherResponse = {
  lat: -1.2921,
  lon: 36.8219,
  units: "metric",
  current: {
    temperature: 19.9,
    wind_speed: 4,
    wind_direction: 111,
    weather_code: 3,
    weather_description: "Overcast",
    is_day: true,
    observed_at: "2026-08-20T10:45",
  },
  daily: [],
  hourly: [],
  ai_summary: null,
};

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(body),
    headers: new Headers({ "x-cache": "MISS" }),
  };
}

function SeedNairobi() {
  const { setLocation } = useLocation();
  return (
    <button
      type="button"
      onClick={() =>
        setLocation({ lat: -1.2921, lon: 36.8219, label: "Nairobi, Kenya" })
      }
    >
      Seed Nairobi
    </button>
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <PreferencesProvider>
        <ViewProvider>
          <Header />
          <SeedNairobi />
          {children}
          <BottomNav />
        </ViewProvider>
      </PreferencesProvider>
    </LocationProvider>
  );
}

function searchNairobi() {
  fireEvent.click(screen.getByRole("button", { name: "Seed Nairobi" }));
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(MOCK_WEATHER)));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("CurrentConditionsView", () => {
  it("keeps the lookup prompt until a location is chosen", () => {
    render(<CurrentConditionsView />, { wrapper });
    expect(screen.getByRole("heading", { name: "Your weather, at a glance." })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Current weather" })).toBeNull();
  });

  it("shows loading instead of a malformed error while the first request is in flight", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {}))
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    expect(screen.getByRole("region", { name: "Loading current weather" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Loading hourly forecast" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Loading 7-day forecast" })).toBeDefined();
    expect(screen.queryByText("Current weather is unavailable")).toBeNull();
    expect(screen.queryByRole("region", { name: "Current weather" })).toBeNull();
  });

  it("renders current weather from the public contract", async () => {
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("region", { name: "Current weather" })).toBeDefined());
    expect(screen.getByText("Overcast")).toBeDefined();
    expect(screen.getByText("20°")).toBeDefined();
    expect(screen.getByRole("region", { name: "Current weather" }).textContent).toContain("°C");
    expect(screen.getByText("Hourly forecast is not available.")).toBeDefined();
    expect(screen.getByText("Daily forecast is not available.")).toBeDefined();
  });

  it("omits AI insight when the preference is off", async () => {
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();
    await waitFor(() => expect(screen.getByText("Overcast")).toBeDefined());
    expect(screen.queryByRole("region", { name: "AI weather insight" })).toBeNull();
  });

  it("shows an honest empty AI state when enabled and summary is null", async () => {
    localStorage.setItem("ai", "true");
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() =>
      expect(screen.getByText("No AI summary is available for this location.")).toBeDefined()
    );
  });

  it("renders a backend AI summary when provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ ...MOCK_WEATHER, ai_summary: "Warm afternoon with light wind." })
      )
    );
    localStorage.setItem("ai", "true");
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() =>
      expect(screen.getByText("Warm afternoon with light wind.")).toBeDefined()
    );
  });

  it("shows a safe AI error when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "plan_restriction", message: "Feature not available on this plan" },
          { ok: false, status: 403 }
        )
      )
    );
    localStorage.setItem("ai", "true");
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByText("AI insight unavailable")).toBeDefined();
    expect(screen.getByText("AI insight could not be loaded for this request.")).toBeDefined();
  });

  it("handles a malformed payload without current weather", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ lat: 0, lon: 0, units: "metric" }))
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByText("Weather data incomplete")).toBeDefined();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Current weather" })).toBeNull();
  });

  it("renders hourly and 7-day outlook from the public arrays", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...MOCK_WEATHER,
          daily: [
            {
              date: "2026-08-21",
              temp_max: 26,
              temp_min: 16,
              precipitation: 1,
              weather_code: 1,
              weather_description: "Mainly clear",
            },
          ],
          hourly: [
            {
              time: "2026-08-20T15:00",
              temperature: 23,
              precipitation: 0,
              weather_code: 1,
              weather_description: "Mainly clear",
            },
          ],
        })
      )
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("region", { name: "Hourly forecast" })).toBeDefined());
    expect(screen.getByRole("region", { name: "7-day forecast" })).toBeDefined();
    expect(screen.getByText("23°")).toBeDefined();
    expect(screen.getByText("26°")).toBeDefined();
    expect(screen.queryByText("Hourly forecast is not available.")).toBeNull();
    expect(screen.queryByText("Daily forecast is not available.")).toBeNull();
  });

  it("shows forecast fallbacks when daily and hourly arrays are empty", async () => {
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();
    await waitFor(() => expect(screen.getByText("Overcast")).toBeDefined());
    expect(screen.getByText("Hourly forecast is not available.")).toBeDefined();
    expect(screen.getByText("Daily forecast is not available.")).toBeDefined();
  });

  it("shows a safe 400 invalid-coordinates error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "bad_request", message: "lat must be between -90 and 90" },
          { ok: false, status: 400 }
        )
      )
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByText("Invalid coordinates")).toBeDefined();
    expect(screen.getByText("lat must be between -90 and 90")).toBeDefined();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
  });

  it("shows a safe 503 unavailable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "backend_unavailable", message: "Backend is unreachable" },
          { ok: false, status: 503 }
        )
      )
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByText("Weather unavailable")).toBeDefined());
    expect(screen.queryByText("Backend is unreachable")).toBeNull();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
  });

  it("shows a timeout error without technical details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: "backend_timeout", message: "Backend did not respond in time" },
          { ok: false, status: 504 }
        )
      )
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByText("Request timed out")).toBeDefined());
    expect(screen.getByText(/too long/i)).toBeDefined();
    expect(screen.queryByText(/Backend did not respond/)).toBeNull();
  });

  it("retries a failed request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: "timeout", message: "Weather service did not respond in time" },
          { ok: false, status: 504 }
        )
      )
      .mockResolvedValueOnce(jsonResponse(MOCK_WEATHER));
    vi.stubGlobal("fetch", fetchMock);

    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("button", { name: /retry/i })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByRole("region", { name: "Current weather" })).toBeDefined());
    expect(screen.getByText("Overcast")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("tolerates incomplete current values without inventing data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...MOCK_WEATHER,
          current: {
            ...MOCK_WEATHER.current,
            temperature: Number.NaN,
            weather_description: "",
            observed_at: null,
          },
        })
      )
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("region", { name: "Current weather" })).toBeDefined());
    expect(screen.getByText("Conditions unavailable")).toBeDefined();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.queryByText("feels like")).toBeNull();
  });

  it("hides humidity and UV when the contract did not send them", async () => {
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();
    await waitFor(() => expect(screen.getByText("Overcast")).toBeDefined());
    expect(screen.queryByText(/humidity/i)).toBeNull();
    expect(screen.queryByText(/uv index/i)).toBeNull();
  });

  it("renders a mobile bottom nav with the dashboard views", async () => {
    render(<CurrentConditionsView />, { wrapper });
    const nav = screen.getByRole("navigation", { name: "Mobile views" });
    expect(nav.className).toMatch(/md:hidden/);
    expect(screen.getAllByRole("button", { name: "Dashboard" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Forecast" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "AI Insights" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Settings" }).length).toBeGreaterThan(0);
  });

  it("opens settings where unit and AI toggles still persist", () => {
    render(<CurrentConditionsView />, { wrapper });
    fireEvent.click(screen.getAllByRole("button", { name: "Settings" })[0]);
    expect(screen.getByRole("region", { name: "Settings" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Fahrenheit" }));
    expect(localStorage.getItem("units")).toBe("imperial");
    fireEvent.click(screen.getByRole("switch", { name: "AI insights" }));
    expect(localStorage.getItem("ai")).toBe("true");
  });

  it("fills coordinates from a city geocode before fetching weather", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/geocode")) {
        return Promise.resolve(
          jsonResponse({
            results: [{ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya", country: "Kenya" }],
          })
        );
      }
      return Promise.resolve(jsonResponse({ ...MOCK_WEATHER, place_name: "Nairobi, Kenya" }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CurrentConditionsView />, { wrapper });
    fireEvent.change(screen.getByLabelText("Location or coordinates"), {
      target: { value: "Nairobi" },
    });
    await waitFor(() => expect(screen.getByRole("option", { name: /Nairobi, Kenya/ })).toBeDefined());
    fireEvent.click(screen.getByRole("option", { name: /Nairobi, Kenya/ }));

    await waitFor(() =>
      expect(screen.getAllByText("Nairobi, Kenya").length).toBeGreaterThan(0)
    );
    expect(screen.getByText("Overcast")).toBeDefined();
    expect(window.location.search).toContain("lat=-1.2864");
    expect(fetchMock.mock.calls.some((call) => String(call[0]).startsWith("/api/weather"))).toBe(
      true
    );
  });
});
