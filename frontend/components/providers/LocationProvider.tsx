"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { formatCoordinates } from "@/lib/format";

export interface Location {
  lat: number;
  lon: number;
  label: string;
}

export interface LocationContextValue {
  location: Location | null;
  setLocation: (loc: Location) => void;
  detectLocation: () => void;
  detecting: boolean;
  error: string | null;
}

const LocationContext = createContext<LocationContextValue | null>(null);

const GEO_ATTEMPTS: PositionOptions[] = [
  { enableHighAccuracy: false, timeout: 4_000, maximumAge: 300_000 },
  { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
];

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    const ms = typeof options.timeout === "number" ? options.timeout : 4_000;
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject({ code: 3, message: "Location request timed out" });
    }, ms + 250);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(pos);
      },
      (err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(err);
      },
      options
    );
  });
}

function geoCode(err: unknown): number {
  if (err && typeof err === "object" && "code" in err) {
    return Number((err as { code: unknown }).code);
  }
  return 0;
}

async function locateByIp(): Promise<Location | null> {
  try {
    const res = await fetch("/api/geolocate", { cache: "no-store" });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (body === null || typeof body !== "object") return null;
    const hit = body as { lat?: unknown; lon?: unknown; label?: unknown };
    if (
      typeof hit.lat !== "number" ||
      typeof hit.lon !== "number" ||
      !Number.isFinite(hit.lat) ||
      !Number.isFinite(hit.lon)
    ) {
      return null;
    }
    return {
      lat: Number(hit.lat.toFixed(4)),
      lon: Number(hit.lon.toFixed(4)),
      label:
        typeof hit.label === "string" && hit.label.trim()
          ? hit.label.trim()
          : formatCoordinates(hit.lat, hit.lon),
    };
  } catch {
    return null;
  }
}

/**
 * Selected-location state for the dashboard.
 *
 * Holds coordinates only. Weather fetching belongs to useWeather via
 * GET /api/weather — this provider never calls WeatherAI.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<Location | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback((loc: Location) => {
    setLocationState(loc);
    setError(null);
    setDetecting(false);
  }, []);

  const detectLocation = useCallback(() => {
    void (async () => {
      setDetecting(true);
      setError(null);

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        let denied = false;
        for (const options of GEO_ATTEMPTS) {
          try {
            const pos = await requestPosition(options);
            const lat = Number(pos.coords.latitude.toFixed(4));
            const lon = Number(pos.coords.longitude.toFixed(4));
            setLocation({ lat, lon, label: formatCoordinates(lat, lon) });
            return;
          } catch (err) {
            const code = geoCode(err);
            if (code === 1) {
              denied = true;
              break;
            }
            // POSITION_UNAVAILABLE: no GPS/Wi-Fi provider (typical in desktop
            // Chromium). A high-accuracy retry will not help — use IP next.
            if (code === 2) break;
          }
        }
        if (denied) {
          setError("Location permission was denied");
          setDetecting(false);
          return;
        }
      }

      const approximated = await locateByIp();
      if (approximated) {
        setLocation(approximated);
        return;
      }

      setError(
        typeof navigator !== "undefined" && navigator.geolocation
          ? "Your position is currently unavailable"
          : "Geolocation is not supported by your browser"
      );
      setDetecting(false);
    })();
  }, [setLocation]);

  return (
    <LocationContext.Provider
      value={{ location, setLocation, detectLocation, detecting, error }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location permission was denied";
    case 2:
      return "Your position is currently unavailable";
    case 3:
      return "Location request timed out";
    default:
      return "Could not determine your location";
  }
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be inside LocationProvider");
  return ctx;
}
