/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { WeatherResponse } from "@/lib/types";
import { CurrentConditionsView } from "@/components/weather/CurrentConditionsView";
import { Header } from "@/components/ui/Header";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";

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

function wrapper({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <PreferencesProvider>
        <Header />
        {children}
      </PreferencesProvider>
    </LocationProvider>
  );
}

function searchNairobi() {
  fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-1.2921" } });
  fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "36.8219" } });
  fireEvent.submit(screen.getByRole("form", { name: "Search by coordinates" }));
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(MOCK_WEATHER)));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("CurrentConditionsView", () => {
  it("keeps the lookup prompt until a location is chosen", () => {
    render(<CurrentConditionsView />, { wrapper });
    expect(screen.getByRole("heading", { name: "Look up the weather" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Current weather" })).toBeNull();
  });

  it("shows loading instead of a malformed error while the first request is in flight", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {}))
    );
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    expect(screen.getByText("Loading current weather…")).toBeDefined();
    expect(screen.queryByText("Current weather is unavailable")).toBeNull();
  });

  it("renders current weather from the public contract", async () => {
    render(<CurrentConditionsView />, { wrapper });
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("region", { name: "Current weather" })).toBeDefined());
    expect(screen.getByText("Overcast")).toBeDefined();
    expect(screen.getByText("20")).toBeDefined();
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
    render(<CurrentConditionsView />, { wrapper });
    fireEvent.click(screen.getByRole("switch", { name: "AI insights" }));
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
    render(<CurrentConditionsView />, { wrapper });
    fireEvent.click(screen.getByRole("switch", { name: "AI insights" }));
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
    render(<CurrentConditionsView />, { wrapper });
    fireEvent.click(screen.getByRole("switch", { name: "AI insights" }));
    searchNairobi();

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByText("Plan restriction")).toBeDefined();
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
    expect(screen.getByText("Current weather is unavailable")).toBeDefined();
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
});
