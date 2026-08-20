"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { formatCoordinates } from "@/lib/format";
import { coordsMatchUrl, locationHref, parseLocationSearch } from "@/lib/location-url";
import {
  clearRecentLocations,
  labelForCoords,
  loadRecentLocations,
  persistRecentLocations,
  rememberRecentLocation,
  type StoredLocation,
} from "@/lib/recent-locations";
import {
  FAVORITE_FULL_MESSAGE,
  addFavoriteLocation,
  isFavoriteLocation,
  loadFavoriteLocations,
  persistFavoriteLocations,
  removeFavoriteLocation,
} from "@/lib/favorite-locations";

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
  recents: Location[];
  clearRecents: () => void;
  favorites: Location[];
  isFavorite: (loc: Location) => boolean;
  addFavorite: (loc: Location) => boolean;
  removeFavorite: (loc: Location) => void;
  favoriteNotice: string | null;
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

function syncUrl(loc: StoredLocation, mode: "push" | "replace"): void {
  if (typeof window === "undefined") return;
  const href = locationHref(loc.lat, loc.lon);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === href || coordsMatchUrl(loc.lat, loc.lon, window.location.search)) return;
  if (mode === "replace") window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
}

function bootFromUrl(): {
  location: Location | null;
  error: string | null;
  recents: Location[];
  favorites: Location[];
} {
  const recents = loadRecentLocations();
  const favorites = loadFavoriteLocations();
  const parsed = parseLocationSearch(window.location.search);
  if (parsed.status === "absent") {
    return { location: null, error: null, recents, favorites };
  }
  if (parsed.status === "invalid") {
    return { location: null, error: "Invalid coordinates in the link", recents, favorites };
  }
  if (parsed.status !== "valid") {
    return { location: null, error: null, recents, favorites };
  }
  const location: Location = {
    lat: parsed.lat,
    lon: parsed.lon,
    label:
      labelForCoords(parsed.lat, parsed.lon, recents) ||
      labelForCoords(parsed.lat, parsed.lon, favorites) ||
      formatCoordinates(parsed.lat, parsed.lon),
  };
  const nextRecents = rememberRecentLocation(location, recents);
  persistRecentLocations(nextRecents);
  return { location, error: null, recents: nextRecents, favorites };
}

/**
 * Selected-location state for the dashboard.
 *
 * Coordinates are the weather identity. Labels, recents, and URL params are
 * convenience. This provider never calls WeatherAI.
 *
 * URL and localStorage are applied after mount so SSR HTML matches the first
 * client render (shareable `/?lat=&lon=` must not hydrate-mismatch).
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<Location | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<Location[]>([]);
  const [favorites, setFavorites] = useState<Location[]>([]);
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const favoritesRef = useRef<Location[]>([]);

  const applyLocation = useCallback((loc: Location, history: "push" | "replace" | "none") => {
    const next: Location = {
      lat: Number(loc.lat.toFixed(4)),
      lon: Number(loc.lon.toFixed(4)),
      label: loc.label.trim() || formatCoordinates(loc.lat, loc.lon),
    };
    setLocationState(next);
    setError(null);
    setDetecting(false);
    setRecents((prev) => {
      const updated = rememberRecentLocation(next, prev);
      persistRecentLocations(updated);
      return updated;
    });
    if (history !== "none") syncUrl(next, history);
  }, []);

  const setLocation = useCallback(
    (loc: Location) => {
      applyLocation(loc, "push");
    },
    [applyLocation]
  );

  const clearRecents = useCallback(() => {
    clearRecentLocations();
    setRecents([]);
  }, []);

  const isFavorite = useCallback(
    (loc: Location) => isFavoriteLocation(loc, favorites),
    [favorites]
  );

  const addFavorite = useCallback((loc: Location) => {
    const result = addFavoriteLocation(loc, favoritesRef.current);
    if (result.status === "full") {
      setFavoriteNotice(FAVORITE_FULL_MESSAGE);
      return false;
    }
    setFavoriteNotice(null);
    if (result.status === "added") {
      favoritesRef.current = result.items;
      setFavorites(result.items);
      persistFavoriteLocations(result.items);
    }
    return true;
  }, []);

  const removeFavorite = useCallback((loc: Location) => {
    const next = removeFavoriteLocation(loc, favoritesRef.current);
    favoritesRef.current = next;
    persistFavoriteLocations(next);
    setFavorites(next);
    setFavoriteNotice(null);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const boot = bootFromUrl();
      setRecents(boot.recents);
      setFavorites(boot.favorites);
      favoritesRef.current = boot.favorites;
      if (boot.location) {
        setLocationState(boot.location);
        setError(null);
        syncUrl(boot.location, "replace");
      } else if (boot.error) {
        setError(boot.error);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onPopState() {
      const parsed = parseLocationSearch(window.location.search);
      if (parsed.status === "valid") {
        const stored = [...loadRecentLocations(), ...loadFavoriteLocations()];
        applyLocation(
          {
            lat: parsed.lat,
            lon: parsed.lon,
            label:
              labelForCoords(parsed.lat, parsed.lon, stored) ||
              formatCoordinates(parsed.lat, parsed.lon),
          },
          "none"
        );
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyLocation]);

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
            applyLocation({ lat, lon, label: formatCoordinates(lat, lon) }, "push");
            return;
          } catch (err) {
            const code = geoCode(err);
            if (code === 1) {
              denied = true;
              break;
            }
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
        applyLocation(approximated, "push");
        return;
      }

      setError(
        typeof navigator !== "undefined" && navigator.geolocation
          ? "Your position is currently unavailable"
          : "Geolocation is not supported by your browser"
      );
      setDetecting(false);
    })();
  }, [applyLocation]);

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        detectLocation,
        detecting,
        error,
        recents,
        clearRecents,
        favorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        favoriteNotice,
      }}
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
