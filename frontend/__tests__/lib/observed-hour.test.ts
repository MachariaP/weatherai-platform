/**
 * @vitest-environment node
 *
 * Provider-observation hourly Now regressions.
 * These helpers must not use browser Date / local timezone for matching.
 */
import { describe, it, expect } from "vitest";
import {
  formatSelectedHourLabel,
  formatScrubberValueText,
  hourRelation,
  isObservedHour,
  naiveHourKey,
} from "@/lib/format";
import {
  nextHourlyWindow,
  observedHourIndex,
  toChartPoints,
} from "@/lib/hourly-chart";
import type { HourlyForecast } from "@/lib/types";

function hour(
  time: string,
  temperature = 18
): HourlyForecast {
  return {
    time,
    temperature,
    precipitation: 0,
    weather_code: 1,
    weather_description: "Clear",
  };
}

describe("naiveHourKey", () => {
  it("extracts YYYY-MM-DDTHH from minute and second stamps", () => {
    expect(naiveHourKey("2026-08-21T09:45")).toBe("2026-08-21T09");
    expect(naiveHourKey("2026-08-21T09:00")).toBe("2026-08-21T09");
    expect(naiveHourKey("2026-08-21T09:00:00")).toBe("2026-08-21T09");
  });

  it("returns null for missing or malformed values", () => {
    expect(naiveHourKey(null)).toBeNull();
    expect(naiveHourKey("")).toBeNull();
    expect(naiveHourKey("not-a-date")).toBeNull();
    expect(naiveHourKey("2026-08-21")).toBeNull();
    expect(naiveHourKey("2026-08-21 09:00")).toBeNull();
  });
});

describe("isObservedHour / nextHourlyWindow", () => {
  it("matches the observation hour bucket (09:45 → 09:00)", () => {
    const hours = [
      hour("2026-08-21T08:00"),
      hour("2026-08-21T09:00"),
      hour("2026-08-21T10:00"),
    ];
    expect(isObservedHour("2026-08-21T09:00", "2026-08-21T09:45")).toBe(true);
    expect(isObservedHour("2026-08-21T08:00", "2026-08-21T09:45")).toBe(false);
    expect(nextHourlyWindow(hours, "2026-08-21T09:45")[0].time).toBe(
      "2026-08-21T09:00"
    );
    expect(toChartPoints(hours, "2026-08-21T09:45").map((p) => p.isNow)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("does not use Date and is invariant under process TZ for matching", () => {
    const source = `${isObservedHour.toString()}\n${naiveHourKey.toString()}\n${nextHourlyWindow.toString()}`;
    expect(source).not.toMatch(/new Date\(/);
    expect(source).not.toMatch(/Date\.now/);
    expect(isObservedHour("2026-08-21T09:00", "2026-08-21T09:45")).toBe(true);
    expect(process.env.TZ ?? "(unset)").toBeTruthy();
  });

  it("labels no Now when observed_at is missing", () => {
    const hours = [hour("2026-08-21T08:00"), hour("2026-08-21T09:00")];
    expect(nextHourlyWindow(hours, null)[0].time).toBe("2026-08-21T08:00");
    expect(toChartPoints(hours, null).every((p) => !p.isNow)).toBe(true);
    expect(observedHourIndex(hours, null)).toBe(-1);
  });

  it("labels no Now when observed_at is malformed", () => {
    const hours = [hour("2026-08-21T09:00")];
    expect(isObservedHour("2026-08-21T09:00", "yesterday")).toBe(false);
    expect(toChartPoints(hours, "bogus")[0].isNow).toBe(false);
  });

  it("ignores malformed hourly times safely", () => {
    const hours = [hour(""), hour("nope"), hour("2026-08-21T09:00")];
    const windowed = nextHourlyWindow(hours, "2026-08-21T09:45");
    expect(windowed.map((h) => h.time)).toEqual(["2026-08-21T09:00"]);
  });

  it("does not invent Now when the observation hour row is missing", () => {
    const hours = [
      hour("2026-08-21T08:00"),
      hour("2026-08-21T10:00"),
      hour("2026-08-21T11:00"),
    ];
    expect(observedHourIndex(hours, "2026-08-21T09:45")).toBe(-1);
    expect(nextHourlyWindow(hours, "2026-08-21T09:45")[0].time).toBe(
      "2026-08-21T08:00"
    );
    expect(toChartPoints(hours, "2026-08-21T09:45").every((p) => !p.isNow)).toBe(
      true
    );
  });

  it("matches across midnight on the observation day", () => {
    const hours = [
      hour("2026-08-21T23:00"),
      hour("2026-08-22T00:00"),
      hour("2026-08-22T01:00"),
    ];
    expect(isObservedHour("2026-08-21T23:00", "2026-08-21T23:45")).toBe(true);
    expect(nextHourlyWindow(hours, "2026-08-21T23:45")[0].time).toBe(
      "2026-08-21T23:00"
    );
    expect(hourRelation("2026-08-22T00:00", "2026-08-21T23:45")).toBe("future");
  });

  it("matches after midnight observation", () => {
    const hours = [
      hour("2026-08-21T23:00"),
      hour("2026-08-22T00:00"),
      hour("2026-08-22T01:00"),
    ];
    expect(isObservedHour("2026-08-22T00:00", "2026-08-22T00:15")).toBe(true);
    expect(nextHourlyWindow(hours, "2026-08-22T00:15")[0].time).toBe(
      "2026-08-22T00:00"
    );
    expect(hourRelation("2026-08-21T23:00", "2026-08-22T00:15")).toBe("past");
  });

  it("uses the first duplicate matching hour as the authoritative Now", () => {
    const hours = [
      hour("2026-08-21T09:00", 17),
      hour("2026-08-21T09:00", 18),
      hour("2026-08-21T10:00", 19),
    ];
    expect(observedHourIndex(hours, "2026-08-21T09:45")).toBe(0);
    const points = toChartPoints(hours, "2026-08-21T09:45");
    expect(points[0].isNow).toBe(true);
    expect(points[1].isNow).toBe(false);
    expect(points[1].label).toBe("09:00");
  });
});

describe("hourRelation relative to observed_at", () => {
  const observed = "2026-08-21T09:45";

  it("classifies past, observation bucket, and future", () => {
    expect(hourRelation("2026-08-21T08:00", observed)).toBe("past");
    expect(hourRelation("2026-08-21T09:00", observed)).toBe("now");
    expect(hourRelation("2026-08-21T10:00", observed)).toBe("future");
  });

  it("formats selected and scrubber labels from the provider timeline", () => {
    expect(formatSelectedHourLabel("2026-08-21T09:00", observed)).toBe("Now");
    expect(formatSelectedHourLabel("2026-08-21T14:00", observed)).toBe(
      "Forecast at 14:00"
    );
    expect(formatSelectedHourLabel("2026-08-21T08:00", observed)).toBe("At 08:00");
    expect(formatScrubberValueText("2026-08-21T09:00", observed)).toBe(
      "Current conditions at 09:00"
    );
  });

  it("never labels Now when observation is missing", () => {
    expect(hourRelation("2026-08-21T09:00", null)).toBe("future");
    expect(formatSelectedHourLabel("2026-08-21T09:00", null)).toBe(
      "Forecast at 09:00"
    );
  });
});
