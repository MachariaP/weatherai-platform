/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { CompareView } from "@/components/weather/CompareView";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { ViewProvider } from "@/components/providers/ViewProvider";
import { FAVORITE_STORAGE_KEY } from "@/lib/favorite-locations";

const FAVORITES = [
  { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" },
  { lat: -4.0435, lon: 39.6682, label: "Mombasa, Kenya" },
  { lat: -0.0917, lon: 34.768, label: "Kisumu, Kenya" },
];

function wrapper({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <PreferencesProvider>
        <ViewProvider>{children}</ViewProvider>
      </PreferencesProvider>
    </LocationProvider>
  );
}

beforeEach(() => {
  localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(FAVORITES));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      const lat = new URL(url, "http://local.test").searchParams.get("lat");
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            lat: Number(lat),
            lon: 0,
            units: "metric",
            current: {
              temperature: lat?.startsWith("-1.28") ? 22 : 29,
              wind_speed: 6,
              wind_direction: 80,
              weather_code: 1,
              weather_description: lat?.startsWith("-1.28") ? "Overcast" : "Clear",
              is_day: true,
              observed_at: "2026-08-20T10:00",
            },
            daily: [
              {
                date: "2026-08-20",
                temp_max: 24,
                temp_min: 14,
                precipitation: 0,
                weather_code: 1,
                weather_description: "Clear",
              },
            ],
            hourly: [],
            ai_summary: null,
          }),
        headers: new Headers(),
      });
    })
  );
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("CompareView", () => {
  it("does not fetch weather until a saved place is chosen, and caps selection at two", async () => {
    render(<CompareView />, { wrapper });
    expect(screen.getByRole("heading", { name: "Compare places" })).toBeDefined();
    await waitFor(() => expect(screen.getByRole("button", { name: "Nairobi, Kenya" })).toBeDefined());
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Nairobi, Kenya" }));
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Kisumu, Kenya" }));
    expect(screen.getByRole("button", { name: "Mombasa, Kenya" })).toHaveProperty("disabled", true);
  });

  it("renders independent headings after two successful loads", async () => {
    render(<CompareView />, { wrapper });
    await waitFor(() => expect(screen.getByRole("button", { name: "Nairobi, Kenya" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Nairobi, Kenya" }));
    fireEvent.click(screen.getByRole("button", { name: "Mombasa, Kenya" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Nairobi, Kenya" })).toBeDefined();
      expect(screen.getByRole("heading", { name: "Mombasa, Kenya" })).toBeDefined();
    });
    expect(screen.getByText("Overcast")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Mombasa, Kenya" })).toBeDefined();
  });
});
