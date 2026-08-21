/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HourlyScroll } from "@/components/weather/HourlyScroll";
import type { HourlyForecast } from "@/lib/types";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const HOURS: HourlyForecast[] = [
  {
    time: "2026-08-20T10:00",
    temperature: 18.4,
    precipitation: 0,
    weather_code: 1,
    weather_description: "Mainly clear",
  },
  {
    time: "2026-08-20T11:00",
    temperature: 19.6,
    precipitation: 1.2,
    weather_code: 61,
    weather_description: "Slight rain",
  },
  {
    time: "2026-08-20T12:00",
    temperature: 21,
    precipitation: 0.4,
    weather_code: 3,
    weather_description: "Overcast",
  },
];

function hoursForDay(date = "2026-08-20"): HourlyForecast[] {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${date}T${String(i).padStart(2, "0")}:00`,
    temperature: i,
    precipitation: 0,
    weather_code: 1,
    weather_description: `Hour ${i}`,
  }));
}

describe("HourlyScroll", () => {
  it("renders normal hourly data", () => {
    render(<HourlyScroll hours={HOURS} units="metric" />);
    expect(screen.getByRole("region", { name: "Hourly forecast" })).toBeDefined();
    expect(screen.getByText("Mainly clear")).toBeDefined();
    expect(screen.getByText("Slight rain")).toBeDefined();
    expect(screen.getByText("18°")).toBeDefined();
    expect(screen.getByText("20°")).toBeDefined();
    expect(screen.getByText("0 mm")).toBeDefined();
    expect(screen.getByText("1 mm")).toBeDefined();
    expect(screen.getByText("0.4 mm")).toBeDefined();
    expect(screen.queryByText(/%|chance/i)).toBeNull();
  });

  it("shows a fallback when hourly data is missing", () => {
    render(<HourlyScroll hours={undefined} units="metric" />);
    expect(screen.getByText("Hourly forecast is not available.")).toBeDefined();
  });

  it("shows a fallback for an empty array", () => {
    render(<HourlyScroll hours={[]} units="metric" />);
    expect(screen.getByText("Hourly forecast is not available.")).toBeDefined();
    expect(screen.queryByRole("list", { name: "Hourly forecast times" })).toBeNull();
  });

  it("shows hourly precipitation amounts in the contract units, never as a percent", () => {
    render(<HourlyScroll hours={HOURS} units="imperial" />);
    expect(screen.getByText("0 in")).toBeDefined();
    expect(screen.getByText("1 in")).toBeDefined();
    expect(screen.getByText("0.4 in")).toBeDefined();
    expect(screen.queryByText(/%|chance of rain/i)).toBeNull();
  });

  it("hides hourly precipitation when FastAPI sent null", () => {
    render(
      <HourlyScroll
        hours={[{ ...HOURS[1], precipitation: null }]}
        units="metric"
      />
    );
    expect(screen.getByText("Slight rain")).toBeDefined();
    expect(screen.queryByText(/mm/)).toBeNull();
    expect(screen.queryByText("0 mm")).toBeNull();
  });

  it("renders long hourly arrays without dropping items", () => {
    const long = Array.from({ length: 48 }, (_, i) => ({
      ...HOURS[0],
      time: `2026-08-${String(20 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`,
      temperature: i,
      weather_description: `Hour ${i}`,
    }));
    render(<HourlyScroll hours={long} units="metric" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(48);
    expect(screen.getByText("Hour 47")).toBeDefined();
  });

  it("handles malformed optional fields", () => {
    const malformed = {
      time: "",
      temperature: Number.NaN,
      precipitation: Number.NaN,
      weather_code: Number.NaN,
      weather_description: "",
    } as HourlyForecast;
    render(<HourlyScroll hours={[malformed]} units="metric" />);
    expect(screen.getByText("Unavailable")).toBeDefined();
    expect(screen.getByText("Conditions unavailable")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.queryByText(/mm/)).toBeNull();
  });

  it("is a focusable horizontally scrollable row", () => {
    render(<HourlyScroll hours={HOURS} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });
    expect(list.className).toMatch(/overflow-x-auto/);
    expect(list.getAttribute("tabindex")).toBe("0");
  });

  it("scrolls with arrow keys, Home, and End", () => {
    render(<HourlyScroll hours={HOURS} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    Object.defineProperty(list, "scrollBy", { configurable: true, value: scrollBy });
    Object.defineProperty(list, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(list, "scrollWidth", { configurable: true, value: 900 });

    fireEvent.keyDown(list, { key: "ArrowRight" });
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    fireEvent.keyDown(list, { key: "Home" });
    fireEvent.keyDown(list, { key: "End" });

    expect(scrollBy).toHaveBeenCalledWith({ left: 108, behavior: "smooth" });
    expect(scrollBy).toHaveBeenCalledWith({ left: -108, behavior: "smooth" });
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
    expect(scrollTo).toHaveBeenCalledWith({ left: 900, behavior: "smooth" });
  });

  it("aligns the Now card to the start of the strip on load", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:30:00"));
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function mockRect(this: HTMLElement) {
        const left =
          this.getAttribute("aria-current") === "true"
            ? 480
            : this.getAttribute("role") === "list"
              ? 16
              : 0;
        return {
          x: left,
          y: 0,
          width: 80,
          height: 80,
          top: 0,
          right: left + 80,
          bottom: 80,
          left,
          toJSON() {
            return this;
          },
        };
      }
    );

    render(<HourlyScroll hours={hoursForDay()} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });

    expect(screen.getByText("Now")).toBeDefined();
    expect(screen.getByRole("listitem", { current: true }).textContent).toContain(
      "Now"
    );
    expect(list.scrollLeft).toBe(464);
  });

  it("realigns Now when hourly data is replaced after a refresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:30:00"));
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function mockRect(this: HTMLElement) {
        const left =
          this.getAttribute("aria-current") === "true" ? 320 : 0;
        return {
          x: left,
          y: 0,
          width: 80,
          height: 80,
          top: 0,
          right: left + 80,
          bottom: 80,
          left,
          toJSON() {
            return this;
          },
        };
      }
    );

    const first = hoursForDay();
    const { rerender } = render(<HourlyScroll hours={first} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });
    expect(list.scrollLeft).toBe(320);

    list.scrollLeft = 80;
    rerender(<HourlyScroll hours={first} units="metric" />);
    expect(list.scrollLeft).toBe(80);

    rerender(<HourlyScroll hours={[...first]} units="metric" />);
    expect(list.scrollLeft).toBe(400);
  });

  it("does not auto-scroll when no hour is the current hour", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T08:00:00"));

    render(<HourlyScroll hours={hoursForDay()} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });

    expect(screen.queryByText("Now")).toBeNull();
    expect(screen.queryByRole("listitem", { current: true })).toBeNull();
    expect(list.scrollLeft).toBe(0);
  });

  it("marks a selected hour without replacing the Now current marker", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:30:00"));
    const onSelectTime = vi.fn();
    render(
      <HourlyScroll
        hours={hoursForDay()}
        units="metric"
        selectedTime="2026-08-20T14:00"
        onSelectTime={onSelectTime}
      />
    );
    expect(screen.getByRole("listitem", { current: true }).textContent).toContain("Now");
    fireEvent.click(screen.getByRole("button", { name: /Hour 14/ }));
    expect(onSelectTime).toHaveBeenCalledWith("2026-08-20T14:00");
  });

  it("shows a right-edge fade when more hours remain", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return this.getAttribute("role") === "list" ? 200 : 80;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return this.getAttribute("role") === "list" ? 800 : 80;
      },
    });
    render(<HourlyScroll hours={hoursForDay()} units="metric" />);
    expect(screen.getByTestId("hourly-scroll-fade-right")).toBeDefined();
    expect(screen.queryByTestId("hourly-scroll-fade-left")).toBeNull();
  });

  it("hides the right fade at the end of the strip", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return this.getAttribute("role") === "list" ? 200 : 80;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return this.getAttribute("role") === "list" ? 800 : 80;
      },
    });
    render(<HourlyScroll hours={hoursForDay()} units="metric" />);
    const list = screen.getByRole("list", { name: "Hourly forecast times" });
    Object.defineProperty(list, "scrollLeft", { configurable: true, writable: true, value: 600 });
    fireEvent.scroll(list);
    expect(screen.queryByTestId("hourly-scroll-fade-right")).toBeNull();
    expect(screen.getByTestId("hourly-scroll-fade-left")).toBeDefined();
  });
});
