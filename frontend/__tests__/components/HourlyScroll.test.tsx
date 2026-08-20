/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HourlyScroll } from "@/components/weather/HourlyScroll";
import type { HourlyForecast } from "@/lib/types";

afterEach(cleanup);

const HOURS: HourlyForecast[] = [
  {
    time: "2026-08-20T10:00",
    temperature: 18.4,
    precipitation: 0,
    weather_code: 1,
    weather_description: "Mainly clear",
  },
  {
    time: "2026-08-20T11:00",
    temperature: 19.6,
    precipitation: 1.2,
    weather_code: 61,
    weather_description: "Slight rain",
  },
  {
    time: "2026-08-20T12:00",
    temperature: 21,
    precipitation: 0.4,
    weather_code: 3,
    weather_description: "Overcast",
  },
];

describe("HourlyScroll", () => {
  it("renders normal hourly data", () => {
    render(<HourlyScroll hours={HOURS} units="metric" />);
    expect(screen.getByRole("region", { name: "Hourly forecast" })).toBeDefined();
    expect(screen.getByText("Mainly clear")).toBeDefined();
    expect(screen.getByText("Slight rain")).toBeDefined();
    expect(screen.getByText("18°")).toBeDefined();
    expect(screen.getByText("20°")).toBeDefined();
    expect(screen.getByText("0 mm")).toBeDefined();
    expect(screen.getByText("1 mm")).toBeDefined();
    expect(screen.getByText("0.4 mm")).toBeDefined();
    expect(screen.queryByText(/%|chance/i)).toBeNull();
  });

  it("shows a fallback when hourly data is missing", () => {
    render(<HourlyScroll hours={undefined} units="metric" />);
    expect(screen.getByText("Hourly forecast is not available.")).toBeDefined();
  });

  it("shows a fallback for an empty array", () => {
    render(<HourlyScroll hours={[]} units="metric" />);
    expect(screen.getByText("Hourly forecast is not available.")).toBeDefined();
    expect(screen.queryByRole("list", { name: "Hourly forecast times" })).toBeNull();
  });

  it("shows hourly precipitation amounts in the contract units, never as a percent", () => {
    render(<HourlyScroll hours={HOURS} units="imperial" />);
    expect(screen.getByText("0 in")).toBeDefined();
    expect(screen.getByText("1 in")).toBeDefined();
    expect(screen.getByText("0.4 in")).toBeDefined();
    expect(screen.queryByText(/%|chance of rain/i)).toBeNull();
  });

  it("hides hourly precipitation when FastAPI sent null", () => {
    render(
      <HourlyScroll
        hours={[{ ...HOURS[1], precipitation: null }]}
        units="metric"
      />
    );
    expect(screen.getByText("Slight rain")).toBeDefined();
    expect(screen.queryByText(/mm/)).toBeNull();
    expect(screen.queryByText("0 mm")).toBeNull();
  });

  it("renders long hourly arrays without dropping items", () => {
    const long = Array.from({ length: 48 }, (_, i) => ({
      ...HOURS[0],
      time: `2026-08-${String(20 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`,
      temperature: i,
      weather_description: `Hour ${i}`,
    }));
    render(<HourlyScroll hours={long} units="metric" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(48);
    expect(screen.getByText("Hour 47")).toBeDefined();
  });

  it("handles malformed optional fields", () => {
    const malformed = {
      time: "",
      temperature: Number.NaN,
      precipitation: Number.NaN,
      weather_code: Number.NaN,
      weather_description: "",
    } as HourlyForecast;
    render(<HourlyScroll hours={[malformed]} units="metric" />);
    expect(screen.getByText("Unavailable")).toBeDefined();
    expect(screen.getByText("Conditions unavailable")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.queryByText(/mm/)).toBeNull();
  });

  it("is a focusable horizontally scrollable row", () => {
    render(<HourlyScroll hours={HOURS} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });
    expect(list.className).toMatch(/overflow-x-auto/);
    expect(list.getAttribute("tabindex")).toBe("0");
  });

  it("scrolls with arrow keys, Home, and End", () => {
    render(<HourlyScroll hours={HOURS} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    Object.defineProperty(list, "scrollBy", { configurable: true, value: scrollBy });
    Object.defineProperty(list, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(list, "scrollWidth", { configurable: true, value: 900 });

    fireEvent.keyDown(list, { key: "ArrowRight" });
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    fireEvent.keyDown(list, { key: "Home" });
    fireEvent.keyDown(list, { key: "End" });

    expect(scrollBy).toHaveBeenCalledWith({ left: 108, behavior: "smooth" });
    expect(scrollBy).toHaveBeenCalledWith({ left: -108, behavior: "smooth" });
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
    expect(scrollTo).toHaveBeenCalledWith({ left: 900, behavior: "smooth" });
  });
});
