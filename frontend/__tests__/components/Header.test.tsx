/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Header } from "@/components/ui/Header";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { ViewProvider } from "@/components/providers/ViewProvider";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <PreferencesProvider>
        <ViewProvider>{children}</ViewProvider>
      </PreferencesProvider>
    </LocationProvider>
  );
}

function renderHeader() {
  return render(<Header />, { wrapper });
}

describe("Header shell controls", () => {
  it("renders brand, search, geolocation, and settings without unit or AI toggles", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "WeatherAI home" })).toBeDefined();
    expect(screen.getByRole("form", { name: "Search location" })).toBeDefined();
    expect(screen.getAllByLabelText("Latitude")).toHaveLength(1);
    expect(screen.getAllByLabelText("Longitude")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Use my location" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Settings" })).toBeDefined();
    expect(screen.queryByRole("group", { name: "Temperature units" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "AI insights" })).toBeNull();
  });

  it("keeps search reachable on a stacked mobile layout class", () => {
    const { container } = renderHeader();
    const searchWrap = container.querySelector(".order-3.w-full");
    expect(searchWrap).not.toBeNull();
    expect(searchWrap?.className).toMatch(/md:flex-1/);
  });

  it("sets location from coordinate search", () => {
    renderHeader();
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-1.29" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "36.82" } });
    fireEvent.submit(screen.getByRole("form", { name: "Search location" }));
    expect(screen.getByText(/Location set to/)).toBeDefined();
  });

  it("uses geolocation success to set coordinates", async () => {
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
    await waitFor(() => {
      expect(screen.getByText(/Location set to/)).toBeDefined();
    });
  });

  it("shows a safe geolocation failure without leaking internals", async () => {
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
    await waitFor(() => {
      expect(screen.getByText("Location permission was denied")).toBeDefined();
    });
    expect(screen.queryByText(/chrome-internal/)).toBeNull();
  });
});
