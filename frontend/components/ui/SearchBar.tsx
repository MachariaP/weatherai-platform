"use client";

import { useId, useState, type FormEvent } from "react";
import { useLocation } from "@/components/providers/LocationProvider";
import { formatCoordinates } from "@/lib/format";
import { SearchIcon } from "./icons";

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function SearchBar() {
  const { setLocation } = useLocation();
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const lat = parseCoordinate(latStr);
    const lon = parseCoordinate(lonStr);

    if (lat === null && lon === null) {
      setError("Latitude and longitude are required");
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

    setError(null);
    setLocation({ lat, lon, label: formatCoordinates(lat, lon) });
  }

  return (
    <form
      id="weather-search"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Search by coordinates"
      className="w-full"
    >
      <p className="sr-only">Search by coordinates</p>
      <div className="flex items-center rounded-xl border border-border bg-surface shadow-card transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
        <span className="hidden h-9 w-9 shrink-0 place-items-center text-text-muted sm:grid">
          <SearchIcon className="h-4 w-4" />
        </span>
        <label className="sr-only" htmlFor="weather-lat">
          Latitude
        </label>
        <input
          id="weather-lat"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Latitude"
          value={latStr}
          onChange={(e) => {
            setLatStr(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error !== null && error.toLowerCase().includes("latitude")}
          aria-describedby={error ? errorId : undefined}
          className="w-full min-w-0 bg-transparent px-2.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
        <label className="sr-only" htmlFor="weather-lon">
          Longitude
        </label>
        <input
          id="weather-lon"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Longitude"
          value={lonStr}
          onChange={(e) => {
            setLonStr(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error !== null && error.toLowerCase().includes("longitude")}
          aria-describedby={error ? errorId : undefined}
          className="w-full min-w-0 bg-transparent px-2.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="focus-ring m-1.5 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong active:translate-y-px"
        >
          <SearchIcon className="h-4 w-4 sm:hidden" />
          <span>Look up</span>
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
