/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EmptyState } from "@/components/weather/EmptyState";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { SearchBar } from "@/components/ui/SearchBar";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderEmpty() {
  return render(
    <LocationProvider>
      <SearchBar />
      <EmptyState />
    </LocationProvider>
  );
}

describe("EmptyState", () => {
  it("explains the coordinate lookup workflow", () => {
    renderEmpty();
    expect(screen.getByRole("heading", { name: "Your weather, at a glance." })).toBeDefined();
    expect(screen.getByText(/enter coordinates or use your location/i)).toBeDefined();
    expect(screen.queryByText(/city search is not available/i)).toBeNull();
  });

  it("offers coordinate search and my location", () => {
    renderEmpty();
    expect(screen.getByRole("button", { name: /use my location/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /search by coordinates/i })).toBeDefined();
  });

  it("shows capability labels from the empty-state canvas", () => {
    renderEmpty();
    expect(screen.getByText("7-day forecast")).toBeDefined();
    expect(screen.getByText("Hourly outlook")).toBeDefined();
    expect(screen.getByText("AI insights")).toBeDefined();
  });

  it("focuses the coordinate fields from the empty-state action", () => {
    renderEmpty();
    const lat = screen.getByLabelText("Latitude");
    fireEvent.click(screen.getByRole("button", { name: /search by coordinates/i }));
    expect(document.activeElement).toBe(lat);
  });

  it("does not surface a geolocation error initially", () => {
    renderEmpty();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an unavailable-location alert when geolocation is denied", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback
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

    renderEmpty();
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/permission was denied/i);
    });
    expect(screen.queryByText(/chrome-internal/)).toBeNull();
  });
});
