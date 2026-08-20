/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  LocationProvider,
  useLocation,
  type Location,
} from "@/components/providers/LocationProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <LocationProvider>{children}</LocationProvider>;
}

const NAIROBI: Location = {
  lat: -1.2921,
  lon: 36.8219,
  label: "1.29° S, 36.82° E",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LocationProvider", () => {
  it("starts with no location and not detecting", () => {
    const { result } = renderHook(() => useLocation(), { wrapper });

    expect(result.current.location).toBeNull();
    expect(result.current.detecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("stores a selected location", () => {
    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.setLocation(NAIROBI);
    });

    expect(result.current.location).toEqual(NAIROBI);
    expect(result.current.error).toBeNull();
    expect(result.current.detecting).toBe(false);
  });

  it("updates when a new location is selected", () => {
    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => result.current.setLocation(NAIROBI));
    act(() =>
      result.current.setLocation({
        lat: 51.5074,
        lon: -0.1278,
        label: "51.51° N, 0.13° W",
      })
    );

    expect(result.current.location?.lat).toBe(51.5074);
    expect(result.current.location?.lon).toBe(-0.1278);
  });

  it("detects browser geolocation into lat/lon", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          success: PositionCallback,
        ) => {
          success({
            coords: {
              latitude: -1.29214,
              longitude: 36.82194,
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

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    expect(result.current.location?.lat).toBe(-1.2921);
    expect(result.current.location?.lon).toBe(36.8219);
    expect(result.current.detecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("records an error when geolocation is unavailable", () => {
    vi.stubGlobal("navigator", {});

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.error).toMatch(/not supported/i);
  });

  it("records an error when geolocation is denied", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => {
          error?.({
            code: 1,
            message: "User denied geolocation",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      },
    });

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    expect(result.current.error).toBe("Location permission was denied");
    expect(result.current.detecting).toBe(false);
    expect(result.current.location).toBeNull();
  });

  it("records a safe error when position is unavailable", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => {
          error?.({
            code: 2,
            message: "Position update is unavailable (internal)",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      },
    });

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    expect(result.current.error).toBe("Your position is currently unavailable");
    expect(JSON.stringify(result.current.error)).not.toContain("internal");
  });

  it("records a safe error when geolocation times out", () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => {
          error?.({
            code: 3,
            message: "Timeout exceeded at GeolocationPositionError",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      },
    });

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    expect(result.current.error).toBe("Location request timed out");
    expect(JSON.stringify(result.current.error)).not.toContain("GeolocationPositionError");
  });

  it("clears a previous geolocation error when a location is set", () => {
    vi.stubGlobal("navigator", {});
    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => result.current.detectLocation());
    expect(result.current.error).not.toBeNull();

    act(() => result.current.setLocation(NAIROBI));

    expect(result.current.error).toBeNull();
    expect(result.current.location).toEqual(NAIROBI);
  });

  it("throws when used outside LocationProvider", () => {
    expect(() => renderHook(() => useLocation())).toThrow(
      /must be inside LocationProvider/
    );
  });
});
