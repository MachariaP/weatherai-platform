/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  chartSummary,
  hourDateKey,
  nextHourlyWindow,
  precipitationAvailable,
  toChartPoints,
  tooltipFields,
} from "@/lib/hourly-chart";
import type { HourlyForecast } from "@/lib/types";

const OBSERVED = "2026-08-20T11:15";

const HOURS: HourlyForecast[] = [
  {
    time: "2026-08-20T10:00",
    temperature: 18,
    precipitation: null,
    weather_code: 1,
    weather_description: "Mainly clear",
  },
  {
    time: "2026-08-20T11:00",
    temperature: 19,
    precipitation: 0,
    weather_code: 1,
    weather_description: "Mainly clear",
  },
  {
    time: "2026-08-20T12:00",
    temperature: 21,
    precipitation: 1.2,
    weather_code: 61,
    weather_description: "Slight rain",
  },
];

describe("hourly chart adapters", () => {
  it("windows from the observation hour for the next 24 rows", () => {
    const long = Array.from({ length: 48 }, (_, i) => {
      const hour = i % 24;
      const day = 20 + Math.floor(i / 24);
      return {
        time: `2026-08-${day}T${String(hour).padStart(2, "0")}:00`,
        temperature: i,
        precipitation: 0,
        weather_code: 1,
        weather_description: "Clear",
      };
    });
    const windowed = nextHourlyWindow(long, OBSERVED);
    expect(windowed[0].time).toBe("2026-08-20T11:00");
    expect(windowed).toHaveLength(24);
    expect(windowed[windowed.length - 1].time).toBe("2026-08-21T10:00");
  });

  it("starts at the first row when no observation hour matches", () => {
    expect(nextHourlyWindow(HOURS, null)[0].time).toBe("2026-08-20T10:00");
    expect(nextHourlyWindow(HOURS, "2026-08-21T09:45")[0].time).toBe(
      "2026-08-20T10:00"
    );
  });

  it("keeps a short series when fewer than 24 rows remain", () => {
    const windowed = nextHourlyWindow(HOURS, OBSERVED);
    expect(windowed.map((row) => row.time)).toEqual([
      "2026-08-20T11:00",
      "2026-08-20T12:00",
    ]);
  });

  it("does not label a fallback first row as Now", () => {
    const points = toChartPoints(HOURS, null);
    expect(points[0].isNow).toBe(false);
    expect(points[0].label).toBe("10:00");
  });

  it("treats verified zero precipitation as available and null as absent", () => {
    expect(precipitationAvailable(HOURS)).toBe(true);
    expect(precipitationAvailable([HOURS[0]])).toBe(false);
    const points = toChartPoints(HOURS, OBSERVED);
    expect(points[0].precipitation).toBeNull();
    expect(points[1].precipitation).toBe(0);
  });

  it("maps tooltip fields without inventing wind or probability", () => {
    const point = toChartPoints(HOURS, OBSERVED)[2];
    const fields = tooltipFields(point, "metric");
    expect(fields.map((row) => row.label)).toEqual([
      "Time",
      "Temperature",
      "Condition",
      "Precipitation",
    ]);
    expect(fields.some((row) => /wind|%/i.test(row.label + row.value))).toBe(false);
    const dry = tooltipFields(toChartPoints(HOURS, OBSERVED)[0], "metric");
    expect(dry.some((row) => row.label === "Precipitation")).toBe(false);
  });

  it("summarizes empty and one-point windows without crashing", () => {
    expect(chartSummary([], "temperature", "metric")).toMatch(/no hourly evolution/i);
    const one = toChartPoints([HOURS[0]], null);
    expect(chartSummary(one, "temperature", "metric")).toMatch(/18°/);
  });

  it("extracts a date key from hourly timestamps", () => {
    expect(hourDateKey("2026-08-20T15:00")).toBe("2026-08-20");
    expect(hourDateKey("")).toBeNull();
    expect(hourDateKey(undefined)).toBeNull();
  });
});
