import { describe, it, expect } from "vitest";
import {
  DEFAULT_FORECAST_DAYS,
  parseForecastDays,
  forecastRangeLabel,
} from "@/lib/forecast-days";

describe("parseForecastDays", () => {
  it("defaults to 7", () => {
    expect(DEFAULT_FORECAST_DAYS).toBe(7);
    expect(parseForecastDays(null)).toBe(7);
    expect(parseForecastDays("")).toBe(7);
  });

  it("accepts 3, 5, and 7", () => {
    expect(parseForecastDays("3")).toBe(3);
    expect(parseForecastDays("5")).toBe(5);
    expect(parseForecastDays("7")).toBe(7);
  });

  it("falls back to 7 for unsupported or corrupt values", () => {
    expect(parseForecastDays("1")).toBe(7);
    expect(parseForecastDays("4")).toBe(7);
    expect(parseForecastDays("8")).toBe(7);
    expect(parseForecastDays("foo")).toBe(7);
    expect(parseForecastDays("{not json")).toBe(7);
    expect(parseForecastDays("3.2")).toBe(7);
  });

  it("labels the requested range", () => {
    expect(forecastRangeLabel(3)).toBe("3-day forecast");
    expect(forecastRangeLabel(7)).toBe("7-day forecast");
  });
});
