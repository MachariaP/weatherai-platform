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

function renderHero(overrides: Partial<typeof MOCK_CURRENT> = {}, props: {
  units?: "metric" | "imperial";
  location?: string;
  cacheStatus?: string | null;
} = {}) {
  return render(
    <CurrentWeather
      data={{ ...MOCK_CURRENT, ...overrides }}
      units={props.units ?? "metric"}
      location={props.location ?? "Nairobi"}
      cacheStatus={props.cacheStatus ?? null}
    />
  );
}

describe("CurrentWeather", () => {
  it("renders temperature with the metric unit", () => {
    renderHero();
    expect(screen.getByText("23")).toBeDefined();
    expect(screen.getByText("°C")).toBeDefined();
  });

  it("renders wind in imperial units", () => {
    renderHero({}, { units: "imperial" });
    expect(screen.getByText("5 mph")).toBeDefined();
    expect(screen.getByText("°F")).toBeDefined();
  });

  it("renders weather description", () => {
    renderHero();
    expect(screen.getByText("Mainly clear")).toBeDefined();
  });

  it("renders location label", () => {
    renderHero();
    expect(screen.getByText("Nairobi")).toBeDefined();
  });

  it("renders wind and direction details", () => {
    renderHero();
    expect(screen.getByText("5 km/h")).toBeDefined();
    expect(screen.getByText("From S")).toBeDefined();
  });

  it("shows Live badge on cache miss", () => {
    renderHero({}, { cacheStatus: "MISS" });
    expect(screen.getByText("Live")).toBeDefined();
  });

  it("shows Cached badge on cache hit", () => {
    renderHero({}, { cacheStatus: "HIT" });
    expect(screen.getByText("Cached")).toBeDefined();
  });

  it("omits the freshness badge when no cache status is available", () => {
    renderHero({}, { cacheStatus: null });
    expect(screen.queryByText(/Live|Cached/)).toBeNull();
  });

  it("shows Unavailable when observed_at is null", () => {
    renderHero({ observed_at: null });
    expect(screen.getByText("Unavailable")).toBeDefined();
  });

  it("does not invent feels-like, humidity, or precipitation metrics", () => {
    renderHero();
    expect(screen.queryByText(/feels/i)).toBeNull();
    expect(screen.queryByText(/humidity/i)).toBeNull();
    expect(screen.queryByText(/^precipitation$/i)).toBeNull();
  });

  it("falls back when description is missing", () => {
    renderHero({ weather_description: "" });
    expect(screen.getByText("Conditions unavailable")).toBeDefined();
  });

  it("falls back when temperature is not a number", () => {
    renderHero({ temperature: Number.NaN });
    expect(screen.getByText("Unavailable")).toBeDefined();
    expect(screen.queryByText("°C")).toBeNull();
  });

  it("renders zero wind as a real value", () => {
    renderHero({ wind_speed: 0 });
    expect(screen.getByText("0 km/h")).toBeDefined();
  });

  it("labels daytime conditions", () => {
    renderHero();
    expect(screen.getByText("Day")).toBeDefined();
  });
});