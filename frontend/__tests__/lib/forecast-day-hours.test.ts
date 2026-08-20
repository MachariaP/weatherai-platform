/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { hoursForForecastDay } from "@/lib/forecast-day-hours";
import type { HourlyForecast } from "@/lib/types";

const HOURS: HourlyForecast[] = [
  {
    time: "2026-08-20T22:00",
    temperature: 16,
    precipitation: 0,
    weather_code: 1,
    weather_description: "Clear",
  },
  {
    time: "2026-08-21T01:00",
    temperature: 14,
    precipitation: 0.2,
    weather_code: 61,
    weather_description: "Rain",
  },
  {
    time: "2026-08-21T09:00",
    temperature: 18,
    precipitation: null,
    weather_code: 2,
    weather_description: "Partly cloudy",
  },
];

describe("hoursForForecastDay", () => {
  it("filters hourly rows by the daily date prefix", () => {
    const day = hoursForForecastDay(HOURS, "2026-08-21");
    expect(day).toHaveLength(2);
    expect(day[0].time).toBe("2026-08-21T01:00");
  });

  it("returns an empty list when the day has no hourly coverage", () => {
    expect(hoursForForecastDay(HOURS, "2026-08-22")).toEqual([]);
  });

  it("does not invent rows for missing or malformed dates", () => {
    expect(hoursForForecastDay(HOURS, "")).toEqual([]);
    expect(hoursForForecastDay(undefined, "2026-08-21")).toEqual([]);
  });
});
