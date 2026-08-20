/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WeatherLoading } from "@/components/ui/LoadingSkeleton";

afterEach(cleanup);

describe("WeatherLoading", () => {
  it("announces loading current, hourly, and daily weather", () => {
    render(<WeatherLoading />);
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByRole("region", { name: "Loading current weather" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Loading hourly forecast" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Loading 7-day forecast" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Loading AI insight" })).toBeNull();
  });

  it("includes the AI skeleton only when AI is enabled", () => {
    render(<WeatherLoading showAi />);
    expect(screen.getByRole("region", { name: "Loading AI insight" })).toBeDefined();
  });

  it("uses motion-safe pulse instead of always-on animation", () => {
    const { container } = render(<WeatherLoading />);
    const pulses = container.querySelectorAll(".motion-safe\\:animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });
});
