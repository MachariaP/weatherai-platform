/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
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
  localStorage.clear();
  window.history.replaceState(null, "", "/");
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

  it("detects browser geolocation into lat/lon", async () => {
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

    await waitFor(() => {
      expect(result.current.location?.lat).toBe(-1.2921);
    });
    expect(result.current.location?.lon).toBe(36.8219);
    expect(result.current.detecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("records an error when geolocation is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/not supported|unavailable/i);
    });
    expect(result.current.location).toBeNull();
  });

  it("records an error when geolocation is denied", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
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

    await waitFor(() => {
      expect(result.current.error).toBe("Location permission was denied");
    });
    expect(result.current.detecting).toBe(false);
    expect(result.current.location).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records a safe error when position is unavailable", async () => {
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
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Your position is currently unavailable");
    });
    expect(JSON.stringify(result.current.error)).not.toContain("internal");
  });

  it("records a safe error when geolocation times out", async () => {
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
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/unavailable|timed out/i);
    });
    expect(JSON.stringify(result.current.error)).not.toContain("GeolocationPositionError");
  });

  it("falls back to IP geolocation when the browser cannot get a fix", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => {
          error?.({
            code: 2,
            message: "Position unavailable",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" }),
      })
    );

    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => {
      result.current.detectLocation();
    });

    await waitFor(() => {
      expect(result.current.location?.label).toBe("Nairobi, Kenya");
    });
    expect(result.current.location?.lat).toBe(-1.2864);
    expect(result.current.error).toBeNull();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe("/api/geolocate");
  });

  it("clears a previous geolocation error when a location is set", async () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => result.current.detectLocation());
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    act(() => result.current.setLocation(NAIROBI));

    expect(result.current.error).toBeNull();
    expect(result.current.location).toEqual(NAIROBI);
  });

  it("throws when used outside LocationProvider", () => {
    expect(() => renderHook(() => useLocation())).toThrow(
      /must be inside LocationProvider/
    );
  });

  it("records recents, dedupes by rounded coordinates, and can clear them", () => {
    const { result } = renderHook(() => useLocation(), { wrapper });

    act(() => result.current.setLocation(NAIROBI));
    act(() =>
      result.current.setLocation({
        lat: -1.29214,
        lon: 36.82194,
        label: "Nairobi, Kenya",
      })
    );
    act(() =>
      result.current.setLocation({
        lat: 51.5074,
        lon: -0.1278,
        label: "London, United Kingdom",
      })
    );

    expect(result.current.recents).toHaveLength(2);
    expect(result.current.recents[0].label).toBe("London, United Kingdom");
    expect(result.current.recents[1].label).toBe("Nairobi, Kenya");
    expect(window.location.search).toContain("lat=51.5074");

    act(() => result.current.clearRecents());
    expect(result.current.recents).toHaveLength(0);
    expect(result.current.location?.label).toBe("London, United Kingdom");
  });

  it("restores a location from the canonical URL", async () => {
    window.history.replaceState(null, "", "/?lat=-1.2921&lon=36.8219");
    const { result } = renderHook(() => useLocation(), { wrapper });
    await waitFor(() => {
      expect(result.current.location?.lat).toBe(-1.2921);
    });
    expect(result.current.location?.lon).toBe(36.8219);
  });

  it("restores a recent place label when hydrating the same coordinates from the URL", async () => {
    localStorage.setItem(
      "weatherai:recent-locations",
      JSON.stringify([{ lat: -1.2921, lon: 36.8219, label: "Nairobi, Kenya" }])
    );
    window.history.replaceState(null, "", "/?lat=-1.2921&lon=36.8219");
    const { result } = renderHook(() => useLocation(), { wrapper });
    await waitFor(() => {
      expect(result.current.location?.label).toBe("Nairobi, Kenya");
    });
  });

  it("rejects invalid URL coordinates without setting a location", async () => {
    window.history.replaceState(null, "", "/?lat=999&lon=999");
    const { result } = renderHook(() => useLocation(), { wrapper });
    await waitFor(() => {
      expect(result.current.error).toMatch(/invalid coordinates/i);
    });
    expect(result.current.location).toBeNull();
  });
});
