/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CurrentWeather } from "@/components/weather/CurrentWeather";
import type { CurrentWeather as CurrentWeatherData } from "@/lib/types";

afterEach(cleanup);

const MOCK_CURRENT: CurrentWeatherData = {
  temperature: 22.5,
  wind_speed: 5.0,
  wind_direction: 180,
  weather_code: 1,
  weather_description: "Mainly clear",
  is_day: true,
  observed_at: "2026-08-19T12:00",
};

describe("CurrentWeather", () => {
  it("renders temperature", () => {
    render(
      <CurrentWeather
        data={MOCK_CURRENT}
        units="metric"
        location="Nairobi"
        cacheStatus="MISS"
      />
    );
    expect(screen.getByText("23")).toBeDefined();
  });

  it("renders weather description", () => {
    render(
      <CurrentWeather
        data={MOCK_CURRENT}
        units="metric"
        location="Nairobi"
        cacheStatus={null}
      />
    );
    expect(screen.getByText("Mainly clear")).toBeDefined();
  });

  it("renders location label", () => {
    render(
      <CurrentWeather
        data={MOCK_CURRENT}
        units="metric"
        location="Nairobi"
        cacheStatus={null}
      />
    );
    expect(screen.getByText("Nairobi")).toBeDefined();
  });

  it("renders cache status badge when present", () => {
    render(
      <CurrentWeather
        data={MOCK_CURRENT}
        units="metric"
        location="Test"
        cacheStatus="HIT"
      />
    );
    expect(screen.getByText("Cache: HIT")).toBeDefined();
  });

  it("handles null observed_at", () => {
    render(
      <CurrentWeather
        data={{ ...MOCK_CURRENT, observed_at: null }}
        units="metric"
        location="Test"
        cacheStatus={null}
      />
    );
    expect(screen.queryByText(/Updated:/)).toBeNull();
  });
});
