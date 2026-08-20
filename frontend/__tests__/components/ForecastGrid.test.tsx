/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ForecastGrid } from "@/components/weather/ForecastGrid";
import type { ForecastDay } from "@/lib/types";

afterEach(cleanup);

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
    render(<ForecastGrid days={DAYS} units="metric" />);
    expect(screen.getByRole("region", { name: "7-day forecast" })).toBeDefined();
    expect(screen.getByText("Mainly clear")).toBeDefined();
    expect(screen.getByText("Slight rain")).toBeDefined();
    const daily = screen.getByRole("region", { name: "7-day forecast" });
    expect(daily.textContent).toContain("25°");
    expect(daily.textContent).toContain("14°");
    expect(screen.getByText("2 mm")).toBeDefined();
  });

  it("shows a fallback when daily data is missing", () => {
    render(<ForecastGrid days={undefined} units="metric" />);
    expect(screen.getByText("Daily forecast is not available.")).toBeDefined();
  });

  it("shows a fallback for an empty array", () => {
    render(<ForecastGrid days={[]} units="metric" />);
    expect(screen.getByText("Daily forecast is not available.")).toBeDefined();
    expect(screen.queryByRole("list", { name: "Daily forecast days" })).toBeNull();
  });

  it("labels precipitation in imperial units without converting", () => {
    render(<ForecastGrid days={DAYS} units="imperial" />);
    expect(screen.getByText("2 in")).toBeDefined();
    expect(screen.getByText("0.3 in")).toBeDefined();
    expect(screen.queryByText(/mm/)).toBeNull();
  });

  it("caps long arrays at seven days", () => {
    const long = Array.from({ length: 12 }, (_, i) => ({
      ...DAYS[0],
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      weather_description: `Day ${i + 1}`,
    }));
    render(<ForecastGrid days={long} units="metric" />);
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
    render(<ForecastGrid days={[malformed]} units="metric" />);
    expect(screen.getByText("Unavailable")).toBeDefined();
    expect(screen.getByText("Conditions unavailable")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByText(/mm/)).toBeNull();
  });

  it("uses a horizontally scrollable row that becomes a grid on medium screens", () => {
    render(<ForecastGrid days={DAYS} units="metric" />);
    const list = screen.getByRole("list", { name: "Daily forecast days" });
    expect(list.className).toMatch(/overflow-x-auto/);
    expect(list.className).toMatch(/md:grid/);
    expect(list.getAttribute("tabindex")).toBe("0");
  });

  it("scrolls the daily row with arrow keys", () => {
    render(<ForecastGrid days={DAYS} units="metric" />);
    const list = screen.getByRole("list", { name: "Daily forecast days" });
    const scrollBy = vi.fn();
    Object.assign(list, { scrollBy });
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(scrollBy).toHaveBeenCalledWith({ left: 124, behavior: "smooth" });
  });
});
