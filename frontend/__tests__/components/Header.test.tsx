/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Header } from "@/components/ui/Header";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </LocationProvider>
  );
}

function renderHeader() {
  return render(<Header />, { wrapper });
}

describe("Header shell controls", () => {
  it("renders brand, search, geolocation, units, and AI controls once", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "WeatherAI home" })).toBeDefined();
    expect(screen.getByRole("form", { name: "Search by coordinates" })).toBeDefined();
    expect(screen.getAllByLabelText("Latitude")).toHaveLength(1);
    expect(screen.getAllByLabelText("Longitude")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Use my location" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Temperature units" })).toBeDefined();
    expect(screen.getByRole("switch", { name: "AI insights" })).toBeDefined();
  });

  it("keeps search reachable on a stacked mobile layout class", () => {
    const { container } = renderHeader();
    const searchWrap = container.querySelector(".order-3.w-full");
    expect(searchWrap).not.toBeNull();
    expect(searchWrap?.className).toMatch(/md:flex-1/);
  });

  it("switches units from metric to imperial", () => {
    renderHeader();
    const fahrenheit = screen.getByRole("button", { name: "Fahrenheit" });
    expect(screen.getByRole("button", { name: "Celsius" }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    fireEvent.click(fahrenheit);
    expect(fahrenheit.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("units")).toBe("imperial");
  });

  it("toggles the AI preference on and off", () => {
    renderHeader();
    const toggle = screen.getByRole("switch", { name: "AI insights" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("ai")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("sets location from coordinate search", () => {
    renderHeader();
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-1.29" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "36.82" } });
    fireEvent.submit(screen.getByRole("form", { name: "Search by coordinates" }));
    expect(screen.getByText(/Location set to/)).toBeDefined();
  });

  it("uses geolocation success to set coordinates", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: 51.5074,
              longitude: -0.1278,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON() {
                return {};
              },
            },
            timestamp: Date.now(),
            toJSON() {
              return {};
            },
          });
        },
      },
    });

    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText(/Location set to/)).toBeDefined();
  });

  it("shows a safe geolocation failure without leaking internals", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => {
          error?.({
            code: 1,
            message: "User denied Geolocation (chrome-internal)",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      },
    });

    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText("Location permission was denied")).toBeDefined();
    expect(screen.queryByText(/chrome-internal/)).toBeNull();
  });
});
