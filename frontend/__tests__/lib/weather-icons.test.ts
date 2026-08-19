import { describe, it, expect } from "vitest";
import { getWeatherIcon } from "@/lib/weather-icons";

describe("getWeatherIcon", () => {
  it("returns sun for clear sky during day", () => {
    expect(getWeatherIcon(0, true)).toBe("☀️");
  });

  it("returns moon for clear sky at night", () => {
    expect(getWeatherIcon(0, false)).toBe("🌙");
  });

  it("returns cloud for overcast", () => {
    expect(getWeatherIcon(3)).toBe("☁️");
  });

  it("returns rain for moderate rain", () => {
    expect(getWeatherIcon(63)).toBe("🌧️");
  });

  it("returns thunderstorm for code 95", () => {
    expect(getWeatherIcon(95)).toBe("⛈️");
  });

  it("returns fallback for unknown code", () => {
    expect(getWeatherIcon(999)).toBe("🌡️");
  });
});
