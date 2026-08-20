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

/**
 * Selected-location state for the dashboard.
 *
 * Holds coordinates only. Weather fetching belongs to useWeather via
 * GET /api/weather — this provider never calls WeatherAI or FastAPI.
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
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        setLocation({
          lat,
          lon,
          label: formatCoordinates(lat, lon),
        });
      },
      (err) => {
        setError(err.message);
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  }, [setLocation]);

  return (
    <LocationContext.Provider
      value={{ location, setLocation, detectLocation, detecting, error }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be inside LocationProvider");
  return ctx;
}
