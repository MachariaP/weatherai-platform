import { describe, it, expect } from "vitest";
import {
  formatTemp,
  formatWind,
  formatWindDirection,
  formatCoordinates,
  formatDayName,
  formatHour,
  formatTime,
  formatDate,
  formatPrecip,
  formatPrecipAmount,
  formatForecastDate,
  formatLatLon,
  parseLatLonQuery,
  uvBand,
} from "@/lib/format";

describe("formatTemp", () => {
  it("rounds to a whole degree", () => {
    expect(formatTemp(22.5)).toBe("23°");
  });
});

describe("formatWind", () => {
  it("uses km/h for metric", () => {
    expect(formatWind(5.4, "metric")).toBe("5 km/h");
  });

  it("uses mph for imperial", () => {
    expect(formatWind(5.4, "imperial")).toBe("5 mph");
  });
});

describe("formatWindDirection", () => {
  it("maps degrees to compass points", () => {
    expect(formatWindDirection(0)).toBe("N");
    expect(formatWindDirection(90)).toBe("E");
    expect(formatWindDirection(180)).toBe("S");
    expect(formatWindDirection(270)).toBe("W");
    expect(formatWindDirection(45)).toBe("NE");
  });

  it("normalizes out-of-range degrees", () => {
    expect(formatWindDirection(360)).toBe("N");
    expect(formatWindDirection(-90)).toBe("W");
  });
});

describe("formatCoordinates", () => {
  it("renders honest coordinate labels with hemispheres", () => {
    expect(formatCoordinates(-1.29, 36.82)).toBe("1.29° S, 36.82° E");
    expect(formatCoordinates(40.7128, -74.006)).toBe("40.71° N, 74.01° W");
  });
});

describe("formatDayName", () => {
  it("labels today and tomorrow", () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(formatDayName(todayStr)).toBe("Today");

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    expect(formatDayName(tomorrowStr)).toBe("Tomorrow");
  });

  it("renders a short weekday for other days", () => {
    expect(formatDayName("2030-01-15")).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
  });
});

describe("formatHour", () => {
  it("formats an ISO time as a 12-hour hour", () => {
    expect(formatHour("2026-08-19T14:00")).toMatch(/^2/);
  });
});

describe("formatTime / formatDate", () => {
  it("formats observed_at values", () => {
    expect(formatTime("2026-08-19T12:00")).toMatch(/12:00/);
    expect(formatDate("2026-08-19T12:00")).toBe("Aug 19");
  });

  it("returns null for invalid values", () => {
    expect(formatTime(null)).toBeNull();
    expect(formatTime("not-a-date")).toBeNull();
    expect(formatDate(null)).toBeNull();
  });
});

describe("formatPrecip", () => {
  it("renders millimeters for metric", () => {
    expect(formatPrecip(2)).toBe("2 mm");
    expect(formatPrecip(0.3)).toBe("0.3 mm");
    expect(formatPrecip(0)).toBe("");
  });

  it("renders inches for imperial without converting the value", () => {
    expect(formatPrecip(0.3, "imperial")).toBe("0.3 in");
    expect(formatPrecip(2, "imperial")).toBe("2 in");
  });

  it("omits non-finite precipitation", () => {
    expect(formatPrecip(Number.NaN)).toBe("");
  });
});

describe("formatPrecipAmount", () => {
  it("includes zero totals from FastAPI", () => {
    expect(formatPrecipAmount(0)).toBe("0 mm");
    expect(formatPrecipAmount(2.4, "imperial")).toBe("2 in");
  });

  it("does not invent a value for non-finite precipitation", () => {
    expect(formatPrecipAmount(Number.NaN)).toBe("Unavailable");
  });
});

describe("formatLatLon", () => {
  it("renders four-decimal coordinates", () => {
    expect(formatLatLon(-1.2921, 36.8219)).toBe("-1.2921, 36.8219");
  });

  it("returns null when a coordinate is not finite", () => {
    expect(formatLatLon(Number.NaN, 36)).toBeNull();
  });
});

describe("parseLatLonQuery", () => {
  it("parses comma-separated coordinates", () => {
    expect(parseLatLonQuery("-1.2921, 36.8219")).toEqual({
      lat: -1.2921,
      lon: 36.8219,
    });
  });

  it("rejects a place name", () => {
    expect(parseLatLonQuery("Nairobi")).toBeNull();
  });
});

describe("uvBand", () => {
  it("labels a numeric UV index without inventing a value", () => {
    expect(uvBand(6)).toBe("High");
    expect(uvBand(1)).toBe("Low");
  });
});

describe("formatForecastDate", () => {
  it("formats a calendar date", () => {
    expect(formatForecastDate("2026-08-20")).toBe("Aug 20");
  });

  it("returns null for missing or invalid dates", () => {
    expect(formatForecastDate("")).toBeNull();
    expect(formatForecastDate("not-a-date")).toBeNull();
  });
});