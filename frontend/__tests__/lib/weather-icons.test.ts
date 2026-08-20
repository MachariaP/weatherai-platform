import { describe, it, expect } from "vitest";
import { getWeatherIconName } from "@/lib/weather-icons";

describe("getWeatherIconName", () => {
  it("maps clear sky to clear-day during day", () => {
    expect(getWeatherIconName(0, true)).toBe("clear-day");
  });

  it("maps clear sky to clear-night at night", () => {
    expect(getWeatherIconName(0, false)).toBe("clear-night");
  });

  it("maps partly cloudy codes to partly-day/partly-night by is_day", () => {
    expect(getWeatherIconName(1, true)).toBe("partly-day");
    expect(getWeatherIconName(2, false)).toBe("partly-night");
  });

  it("maps overcast to cloudy", () => {
    expect(getWeatherIconName(3)).toBe("cloudy");
  });

  it("maps fog codes to fog", () => {
    expect(getWeatherIconName(45)).toBe("fog");
    expect(getWeatherIconName(48)).toBe("fog");
  });

  it("maps rain codes to rain", () => {
    expect(getWeatherIconName(63)).toBe("rain");
    expect(getWeatherIconName(80)).toBe("rain");
  });

  it("maps snow codes to snow", () => {
    expect(getWeatherIconName(71)).toBe("snow");
    expect(getWeatherIconName(75)).toBe("snow");
  });

  it("maps thunderstorm codes to storm", () => {
    expect(getWeatherIconName(95)).toBe("storm");
    expect(getWeatherIconName(99)).toBe("storm");
  });

  it("falls back to unknown for unrecognized codes", () => {
    expect(getWeatherIconName(999)).toBe("unknown");
  });
});