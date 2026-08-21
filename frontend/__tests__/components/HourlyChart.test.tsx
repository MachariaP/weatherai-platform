/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HourlyChart } from "@/components/weather/HourlyChart";
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
    precipitation: null,
    weather_code: 61,
    weather_description: "Slight rain",
  },
];

describe("HourlyChart", () => {
  it("shows temperature by default and lets the user switch to precipitation", () => {
    render(<HourlyChart hours={HOURS} units="metric" />);
    expect(screen.getByRole("region", { name: "Hourly evolution" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Temperature" }).getAttribute("aria-checked")).toBe(
      "true"
    );
    fireEvent.click(screen.getByRole("radio", { name: "Precipitation" }));
    expect(screen.getByRole("radio", { name: "Precipitation" }).getAttribute("aria-checked")).toBe(
      "true"
    );
    expect(screen.queryByRole("radio", { name: "Wind" })).toBeNull();
  });

  it("hides the precipitation tab when every amount is null", () => {
    render(
      <HourlyChart
        hours={[{ ...HOURS[0], precipitation: null }, { ...HOURS[1], precipitation: null }]}
        units="metric"
      />
    );
    expect(screen.getByRole("radio", { name: "Temperature" })).toBeDefined();
    expect(screen.queryByRole("radio", { name: "Precipitation" })).toBeNull();
  });

  it("keeps the precipitation tab when the amount is verified zero", () => {
    render(
      <HourlyChart hours={[{ ...HOURS[0], precipitation: 0 }]} units="metric" />
    );
    expect(screen.getByRole("radio", { name: "Precipitation" })).toBeDefined();
  });

  it("shows an empty state without crashing", () => {
    render(<HourlyChart hours={[]} units="metric" />);
    expect(screen.getByText("Hourly evolution is not available.")).toBeDefined();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("plots every provided hour when range is all", () => {
    const many: HourlyForecast[] = Array.from({ length: 30 }, (_, i) => ({
      time: `2026-08-${20 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`,
      temperature: 10 + i,
      precipitation: 0,
      weather_code: 1,
      weather_description: "Clear",
    }));
    render(<HourlyChart hours={many} units="metric" range="all" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/over 30 hours/);
  });

  it("emphasizes the selected hour from shared exploration state", () => {
    render(
      <HourlyChart hours={HOURS} units="metric" range="all" selectedTime="2026-08-20T11:00" />
    );
    const circles = document.querySelectorAll("circle");
    expect(circles[1]?.getAttribute("r")).toBe("4.5");
    expect(circles[0]?.getAttribute("r")).toBe("2");
  });

  it("keeps the Now marker while a future selected marker moves", () => {
    const hours = [
      HOURS[0],
      HOURS[1],
      {
        time: "2026-08-20T12:00",
        temperature: 21,
        precipitation: 0,
        weather_code: 3,
        weather_description: "Overcast",
      },
    ];
    const observedAt = "2026-08-20T10:30";
    const { rerender } = render(
      <HourlyChart
        hours={hours}
        units="metric"
        range="all"
        observedAt={observedAt}
        selectedTime="2026-08-20T10:00"
      />
    );
    expect(screen.getByTestId("chart-now-marker")).toBeDefined();
    expect(screen.queryByTestId("chart-selected-marker")).toBeNull();
    rerender(
      <HourlyChart
        hours={hours}
        units="metric"
        range="all"
        observedAt={observedAt}
        selectedTime="2026-08-20T12:00"
      />
    );
    const nowX = screen.getByTestId("chart-now-marker").getAttribute("x1");
    const selectedX = screen.getByTestId("chart-selected-marker").getAttribute("x1");
    expect(nowX).toBeTruthy();
    expect(selectedX).toBeTruthy();
    expect(selectedX).not.toBe(nowX);
  });
});
