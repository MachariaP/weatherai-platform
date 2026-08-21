/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { WeatherAtmosphere } from "@/components/weather/WeatherAtmosphere";

afterEach(cleanup);

describe("WeatherAtmosphere", () => {
  it("is aria-hidden and tagged for clear day", () => {
    const { container } = render(<WeatherAtmosphere code={0} isDay />);
    const layer = container.querySelector(".weather-atmosphere");
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    expect(layer?.getAttribute("data-atm")).toBe("CLEAR");
    expect(layer?.getAttribute("data-day")).toBe("day");
  });

  it("tags clear night", () => {
    const { container } = render(<WeatherAtmosphere code={0} isDay={false} />);
    const layer = container.querySelector(".weather-atmosphere");
    expect(layer?.getAttribute("data-atm")).toBe("CLEAR");
    expect(layer?.getAttribute("data-day")).toBe("night");
  });

  it("tags rain", () => {
    const { container } = render(<WeatherAtmosphere code={61} isDay />);
    expect(container.querySelector(".weather-atmosphere")?.getAttribute("data-atm")).toBe(
      "RAIN"
    );
  });

  it("tags snow and fog", () => {
    const { container: snow } = render(<WeatherAtmosphere code={71} isDay />);
    expect(snow.querySelector(".weather-atmosphere")?.getAttribute("data-atm")).toBe("SNOW");
    cleanup();
    const { container: fog } = render(<WeatherAtmosphere code={45} isDay />);
    expect(fog.querySelector(".weather-atmosphere")?.getAttribute("data-atm")).toBe("FOG");
  });

  it("renders nothing for unknown codes", () => {
    const { container } = render(<WeatherAtmosphere code={999} isDay />);
    expect(container.querySelector(".weather-atmosphere")).toBeNull();
  });
});
