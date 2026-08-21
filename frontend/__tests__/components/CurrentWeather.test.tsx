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
  lat?: number;
  lon?: number;
} = {}) {
  return render(
    <CurrentWeather
      data={{ ...MOCK_CURRENT, ...overrides }}
      units={props.units ?? "metric"}
      location={props.location ?? "Nairobi"}
      cacheStatus={props.cacheStatus ?? null}
      lat={props.lat}
      lon={props.lon}
    />
  );
}

describe("CurrentWeather", () => {
  it("renders temperature with the metric unit", () => {
    renderHero();
    expect(screen.getByText("23°")).toBeDefined();
    expect(screen.getByText(/°C/)).toBeDefined();
  });

  it("renders wind in imperial units", () => {
    renderHero({}, { units: "imperial" });
    expect(screen.getByText("mph")).toBeDefined();
    expect(screen.getByText(/°F/)).toBeDefined();
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
    expect(screen.getByText("km/h")).toBeDefined();
    expect(screen.getByText("Direction: S")).toBeDefined();
  });

  it("keeps cache freshness out of the hero card", () => {
    renderHero({}, { cacheStatus: "MISS" });
    expect(screen.queryByText(/Live|Cached/)).toBeNull();
    renderHero({}, { cacheStatus: "HIT" });
    expect(screen.queryByText(/Live|Cached/)).toBeNull();
  });

  it("omits the freshness badge when no cache status is available", () => {
    renderHero({}, { cacheStatus: null });
    expect(screen.queryByText(/Live|Cached/)).toBeNull();
  });

  it("does not invent feels-like, humidity, or precipitation metrics", () => {
    renderHero();
    expect(screen.queryByText(/feels like/i)).toBeNull();
    expect(screen.queryByText(/humidity/i)).toBeNull();
    expect(screen.queryByText(/uv index/i)).toBeNull();
    expect(screen.queryByText(/precipitation/i)).toBeNull();
    expect(screen.queryByText(/pressure/i)).toBeNull();
  });

  it("shows last-24h precipitation only when FastAPI sent precip_last_24h", () => {
    renderHero({ precip_last_24h: 0 });
    expect(screen.getByText("Precipitation")).toBeDefined();
    expect(screen.getByText("0 mm")).toBeDefined();
    expect(screen.getByText("In last 24h")).toBeDefined();
  });

  it("shows optional extras only when they are finite", () => {
    renderHero({
      feels_like: 24.2,
      humidity: 45,
      uv_index: 6,
      pressure: 1012,
    });
    expect(screen.getByText(/Feels like 24°/)).toBeDefined();
    expect(screen.getByText("Humidity")).toBeDefined();
    expect(screen.getByText("45%")).toBeDefined();
    expect(screen.getByText("UV index")).toBeDefined();
    expect(screen.getByText("High")).toBeDefined();
    expect(screen.getByText("Pressure")).toBeDefined();
    expect(screen.getByText("hPa")).toBeDefined();
    expect(screen.queryByText(/falling/i)).toBeNull();
  });

  it("renders four-decimal coordinates when lat/lon are passed through", () => {
    renderHero({}, { lat: -1.2921, lon: 36.8219 });
    expect(screen.getByText("-1.2921, 36.8219")).toBeDefined();
  });

  it("falls back when description is missing", () => {
    renderHero({ weather_description: "" });
    expect(screen.getByText("Conditions unavailable")).toBeDefined();
  });

  it("falls back when temperature is not a number", () => {
    renderHero({ temperature: Number.NaN });
    expect(screen.getByText("Unavailable")).toBeDefined();
    expect(screen.queryByText("23°")).toBeNull();
  });

  it("renders zero wind as a real value", () => {
    renderHero({ wind_speed: 0 });
    expect(screen.getByText("0")).toBeDefined();
    expect(screen.getByText("km/h")).toBeDefined();
  });

  it("labels daytime conditions", () => {
    renderHero();
    expect(screen.getByText(/Daytime/)).toBeDefined();
  });
});
