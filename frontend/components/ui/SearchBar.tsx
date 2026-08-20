"use client";

import { useId, useState, type FormEvent } from "react";
import { useLocation } from "@/components/providers/LocationProvider";
import { formatCoordinates, parseLatLonQuery } from "@/lib/format";
import { MapPinIcon, SearchIcon } from "./icons";

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

function geocodeErrorMessage(status: number, code?: string): string {
  if (status === 404 || code === "not_found") return "No matching location";
  if (status === 504 || code === "timeout" || code === "backend_timeout") {
    return "Location search timed out";
  }
  return "Location search is unavailable";
}

export function SearchBar() {
  const { setLocation } = useLocation();
  const [query, setQuery] = useState("");
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const errorId = useId();

  function applyCoords(lat: number, lon: number, label?: string) {
    setError(null);
    setLocation({
      lat,
      lon,
      label: label?.trim() || formatCoordinates(lat, lon),
    });
  }

  async function geocodePlace(raw: string): Promise<void> {
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(raw)}`, {
        cache: "no-store",
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok) {
        const code =
          body !== null && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : undefined;
        setError(geocodeErrorMessage(res.status, code));
        return;
      }
      if (body === null || typeof body !== "object") {
        setError("Location search is unavailable");
        return;
      }
      const hit = body as { lat?: unknown; lon?: unknown; label?: unknown };
      if (
        typeof hit.lat !== "number" ||
        typeof hit.lon !== "number" ||
        !Number.isFinite(hit.lat) ||
        !Number.isFinite(hit.lon)
      ) {
        setError("Location search is unavailable");
        return;
      }
      applyCoords(
        hit.lat,
        hit.lon,
        typeof hit.label === "string" ? hit.label : undefined
      );
    } catch {
      setError("Location search is unavailable");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      const parsed = parseLatLonQuery(trimmedQuery);
      if (parsed) {
        applyCoords(parsed.lat, parsed.lon);
        return;
      }
      await geocodePlace(trimmedQuery);
      return;
    }

    const lat = parseCoordinate(latStr);
    const lon = parseCoordinate(lonStr);

    if (lat === null && lon === null) {
      setError("Enter a place name or coordinates");
      return;
    }
    if (lat === null || lat < -90 || lat > 90) {
      setError("Latitude must be a number between -90 and 90");
      return;
    }
    if (lon === null || lon < -180 || lon > 180) {
      setError("Longitude must be a number between -180 and 180");
      return;
    }

    applyCoords(lat, lon);
  }

  return (
    <form
      id="weather-search"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Search location"
      className="w-full"
    >
      <p className="sr-only">Search by place name or coordinates</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative hidden min-w-0 flex-1 md:block">
          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-text-muted">
            <SearchIcon className="h-4 w-4" />
          </span>
          <label className="sr-only" htmlFor="weather-query">
            Location or coordinates
          </label>
          <input
            id="weather-query"
            type="text"
            autoComplete="off"
            placeholder="Search location or coordinates..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className="h-10 w-full rounded-control border border-border bg-surface py-2 pl-10 pr-3 text-sm text-text placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none"
          />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:hidden">
          <div className="flex items-center rounded-control border border-border bg-surface transition-colors focus-within:border-accent">
            <span className="grid h-10 w-8 shrink-0 place-items-center text-text-muted">
              <MapPinIcon className="h-3.5 w-3.5" />
            </span>
            <label className="sr-only" htmlFor="weather-lat">
              Latitude
            </label>
            <input
              id="weather-lat"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Lat"
              value={latStr}
              onChange={(e) => {
                setLatStr(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error !== null && error.toLowerCase().includes("latitude")}
              aria-describedby={error ? errorId : undefined}
              className="w-full min-w-0 bg-transparent py-2 pr-2.5 font-mono text-sm text-text placeholder:font-sans placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <div className="flex items-center rounded-control border border-border bg-surface transition-colors focus-within:border-accent">
            <span className="grid h-10 w-8 shrink-0 place-items-center text-text-muted">
              <SearchIcon className="h-3.5 w-3.5" />
            </span>
            <label className="sr-only" htmlFor="weather-lon">
              Longitude
            </label>
            <input
              id="weather-lon"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Long"
              value={lonStr}
              onChange={(e) => {
                setLonStr(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error !== null && error.toLowerCase().includes("longitude")}
              aria-describedby={error ? errorId : undefined}
              className="w-full min-w-0 bg-transparent py-2 pr-2.5 font-mono text-sm text-text placeholder:font-sans placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={searching}
          className="focus-ring inline-flex h-10 w-full shrink-0 items-center justify-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong active:translate-y-px disabled:opacity-60 sm:w-auto"
        >
          {searching ? "Searching…" : "Get Weather"}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
