/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("heading", { name: "Look up the weather" })).toBeDefined();
    expect(screen.getByText(/latitude and longitude/i)).toBeDefined();
    expect(screen.getByText(/city search is not available/i)).toBeDefined();
  });

  it("offers coordinate search and my location", () => {
    renderEmpty();
    expect(screen.getByRole("button", { name: /use my location/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /search by coordinates/i })).toBeDefined();
  });

  it("focuses the coordinate fields from the empty-state action", () => {
    renderEmpty();
    const lat = screen.getByLabelText("Latitude");
    fireEvent.click(screen.getByRole("button", { name: /search by coordinates/i }));
    expect(document.activeElement).toBe(lat);
  });

  it("does not offer city search", () => {
    renderEmpty();
    expect(screen.queryByPlaceholderText(/city/i)).toBeNull();
    expect(screen.queryByLabelText(/city/i)).toBeNull();
  });

  it("does not surface a geolocation error initially", () => {
    renderEmpty();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an unavailable-location alert when geolocation is denied", () => {
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
    expect(screen.getByRole("alert").textContent).toMatch(/permission was denied/i);
    expect(screen.queryByText(/chrome-internal/)).toBeNull();
  });
});
