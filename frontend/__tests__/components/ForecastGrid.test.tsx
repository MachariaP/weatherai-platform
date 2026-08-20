/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ForecastGrid } from "@/components/weather/ForecastGrid";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import type { ForecastDay } from "@/lib/types";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}

const DAYS: ForecastDay[] = [
  {
    date: "2026-08-20",
    temp_max: 24.6,
    temp_min: 14.2,
    precipitation: 0,
    weather_code: 1,
    weather_description: "Mainly clear",
  },
  {
    date: "2026-08-21",
    temp_max: 22.1,
    temp_min: 13.8,
    precipitation: 2.4,
    weather_code: 61,
    weather_description: "Slight rain",
  },
  {
    date: "2026-08-22",
    temp_max: 21,
    temp_min: 12,
    precipitation: 0.3,
    weather_code: 3,
    weather_description: "Overcast",
  },
];

describe("ForecastGrid", () => {
  it("renders normal daily data", () => {
    render(<ForecastGrid days={DAYS} units="metric" />, { wrapper });
    expect(screen.getByRole("region", { name: "7-day forecast" })).toBeDefined();
    expect(screen.getByText("Mainly clear")).toBeDefined();
    expect(screen.getByText("Slight rain")).toBeDefined();
    const daily = screen.getByRole("region", { name: "7-day forecast" });
    expect(daily.textContent).toContain("25°");
    expect(daily.textContent).toContain("14°");
    expect(screen.getByText("2 mm")).toBeDefined();
    expect(screen.queryByText("%")).toBeNull();
    expect(screen.getByRole("group", { name: "Forecast range" })).toBeDefined();
  });

  it("labels the heading from the requested range and still renders returned days", () => {
    localStorage.setItem("forecastDays", "3");
    render(<ForecastGrid days={DAYS} units="metric" requestedDays={3} />, { wrapper });
    expect(screen.getByRole("region", { name: "3-day forecast" })).toBeDefined();
    expect(screen.getByRole("button", { name: "3 days" }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("region", { name: "7-day forecast" })).toBeNull();
  });

  it("shows a fallback when daily data is missing", () => {
    render(<ForecastGrid days={undefined} units="metric" />, { wrapper });
    expect(screen.getByText("Daily forecast is not available.")).toBeDefined();
  });

  it("shows a fallback for an empty array", () => {
    render(<ForecastGrid days={[]} units="metric" />, { wrapper });
    expect(screen.getByText("Daily forecast is not available.")).toBeDefined();
    expect(screen.queryByRole("list", { name: "Daily forecast days" })).toBeNull();
  });

  it("shows precipitation amounts, including verified zero, never as a percent", () => {
    render(<ForecastGrid days={DAYS} units="imperial" />, { wrapper });
    expect(screen.getByText("0 in")).toBeDefined();
    expect(screen.getByText("2 in")).toBeDefined();
    expect(screen.getByText("0.3 in")).toBeDefined();
    expect(screen.queryByText(/%|chance/i)).toBeNull();
  });

  it("hides daily precipitation when FastAPI sent null", () => {
    render(
      <ForecastGrid days={[{ ...DAYS[1], precipitation: null }]} units="metric" />,
      { wrapper }
    );
    expect(screen.getByText("Slight rain")).toBeDefined();
    expect(screen.queryByText(/mm/)).toBeNull();
    expect(screen.queryByText("0 mm")).toBeNull();
  });

  it("caps long arrays at seven days", () => {
    const long = Array.from({ length: 12 }, (_, i) => ({
      ...DAYS[0],
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      weather_description: `Day ${i + 1}`,
    }));
    render(<ForecastGrid days={long} units="metric" />, { wrapper });
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText("Day 7")).toBeDefined();
    expect(screen.queryByText("Day 8")).toBeNull();
  });

  it("handles malformed optional fields", () => {
    const malformed = {
      date: "",
      temp_max: Number.NaN,
      temp_min: Number.NaN,
      precipitation: Number.NaN,
      weather_code: Number.NaN,
      weather_description: "",
    } as ForecastDay;
    render(<ForecastGrid days={[malformed]} units="metric" />, { wrapper });
    expect(screen.getByText("Unavailable")).toBeDefined();
    expect(screen.getByText("Conditions unavailable")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByText(/mm/)).toBeNull();
  });

  it("renders days as a vertical list", () => {
    render(<ForecastGrid days={DAYS} units="metric" />, { wrapper });
    const list = screen.getByRole("list", { name: "Daily forecast days" });
    expect(list.className).toMatch(/overflow-hidden/);
    expect(list.getAttribute("tabindex")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
