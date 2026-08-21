/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HourlyExploration } from "@/components/weather/HourlyExploration";
import type { HourlyForecast } from "@/lib/types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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

describe("HourlyExploration", () => {
  it("treats the current hour as Now, not a forecast", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:30:00"));
    render(<HourlyExploration hours={HOURS} units="metric" />);
    expect(screen.queryByText(/Forecast at/)).toBeNull();
    expect(screen.getByRole("slider", { name: "Hourly weather timeline" }).getAttribute("aria-valuetext")).toBe(
      "Current conditions at 10:00"
    );
  });

  it("labels a future hour as forecast when the strip is selected", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:30:00"));
    render(<HourlyExploration hours={HOURS} units="metric" />);
    fireEvent.click(screen.getByRole("button", { name: /Slight rain/ }));
    expect(screen.getByRole("status").textContent).toMatch(/Forecast at/);
    expect(screen.getByRole("status").textContent).toMatch(/Slight rain/);
    expect(screen.getByRole("button", { name: /Slight rain/ }).getAttribute("aria-pressed")).toBe(
      "true"
    );
  });

  it("updates the shared hour from the timeline scrubber", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:30:00"));
    render(<HourlyExploration hours={HOURS} units="metric" />);
    fireEvent.change(screen.getByRole("slider", { name: "Hourly weather timeline" }), {
      target: { value: "2" },
    });
    expect(screen.getByRole("status").textContent).toMatch(/Forecast at/);
    expect(screen.getByRole("status").textContent).toMatch(/Overcast/);
    expect(
      screen.getByRole("slider", { name: "Hourly weather timeline" }).getAttribute("aria-valuetext")
    ).toMatch(/Forecast at/);
  });

  it("returns to current conditions when Now is selected again", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:30:00"));
    render(<HourlyExploration hours={HOURS} units="metric" />);
    fireEvent.change(screen.getByRole("slider", { name: "Hourly weather timeline" }), {
      target: { value: "1" },
    });
    expect(screen.getByRole("status").textContent).toMatch(/Forecast at/);
    fireEvent.change(screen.getByRole("slider", { name: "Hourly weather timeline" }), {
      target: { value: "0" },
    });
    expect(screen.queryByText(/Forecast at/)).toBeNull();
  });

  it("selects a chart hour with the keyboard and keeps the strip in sync", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:30:00"));
    render(<HourlyExploration hours={HOURS} units="metric" />);
    fireEvent.keyDown(screen.getByRole("img"), { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: /Slight rain/ }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(
      screen.getByRole("slider", { name: "Hourly weather timeline" }).getAttribute("aria-valuenow")
    ).toBe("1");
  });

  it("uses the same next-24 window for strip, scrubber, and chart", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:30:00"));
    const long = Array.from({ length: 36 }, (_, i) => {
      const hour = i % 24;
      const day = 20 + Math.floor(i / 24);
      return {
        time: `2026-08-${day}T${String(hour).padStart(2, "0")}:00`,
        temperature: i,
        precipitation: 0,
        weather_code: 1,
        weather_description: `Hour ${i}`,
      };
    });
    render(<HourlyExploration hours={long} units="metric" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(24);
    expect(screen.getByRole("heading", { name: "Next 24 hours" })).toBeDefined();
    expect(screen.getByText("Tomorrow 09:00")).toBeDefined();
    expect(screen.queryByText("Hour 9")).toBeNull();
    expect(screen.getByText("Hour 10")).toBeDefined();
    expect(screen.getByText("Hour 33")).toBeDefined();
  });

  it("does not label a fallback first hour as Now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T09:30:00"));
    render(<HourlyExploration hours={HOURS} units="metric" />);
    expect(screen.queryByText("Now")).toBeNull();
    expect(
      screen.getByRole("slider", { name: "Hourly weather timeline" }).getAttribute("aria-valuetext")
    ).toBe("At 10:00");
    fireEvent.click(screen.getByRole("button", { name: /Slight rain/ }));
    expect(screen.getByRole("status").textContent).toMatch(/^At 11:00/);
  });

  it("keeps strip, chart, and scrubber on one selected time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T10:30:00"));
    render(<HourlyExploration hours={HOURS} units="metric" />);
    fireEvent.click(screen.getByRole("button", { name: /Overcast/ }));
    expect(screen.getByRole("button", { name: /Overcast/ }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(
      screen.getByRole("slider", { name: "Hourly weather timeline" }).getAttribute("aria-valuenow")
    ).toBe("2");
    const circles = screen.getByRole("img").querySelectorAll("circle");
    expect(circles[2]?.getAttribute("r")).toBe("4.5");
    expect(circles[0]?.getAttribute("r")).toBe("2");
  });
});
