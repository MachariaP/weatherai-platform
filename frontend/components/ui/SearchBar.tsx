"use client";

import { useState, type FormEvent } from "react";
import { useLocation } from "@/components/providers/LocationProvider";
import { formatCoordinates } from "@/lib/format";
import { SearchIcon } from "./icons";

export function SearchBar() {
  const { setLocation } = useLocation();
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return;
    }
    setLocation({ lat, lon, label: formatCoordinates(lat, lon) });
  }

  return (
    <form
      id="weather-search"
      onSubmit={handleSubmit}
      aria-label="Search by coordinates"
      className="w-full"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        Search by coordinates
      </p>
      <div className="flex items-center rounded-xl border border-border-strong bg-surface shadow-card transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <span className="hidden h-9 w-9 shrink-0 place-items-center text-text-muted sm:grid">
          <SearchIcon className="h-4 w-4" />
        </span>
        <label className="sr-only" htmlFor="weather-lat">
          Latitude
        </label>
        <input
          id="weather-lat"
          type="number"
          step="any"
          inputMode="decimal"
          placeholder="Latitude"
          value={latStr}
          onChange={(e) => setLatStr(e.target.value)}
          min={-90}
          max={90}
          required
          className="w-full min-w-0 bg-transparent px-2.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
        <label className="sr-only" htmlFor="weather-lon">
          Longitude
        </label>
        <input
          id="weather-lon"
          type="number"
          step="any"
          inputMode="decimal"
          placeholder="Longitude"
          value={lonStr}
          onChange={(e) => setLonStr(e.target.value)}
          min={-180}
          max={180}
          required
          className="w-full min-w-0 bg-transparent px-2.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="focus-ring m-1.5 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-bg transition-colors hover:bg-accent-strong active:translate-y-px"
        >
          <SearchIcon className="h-4 w-4 sm:hidden" />
          <span>Get weather</span>
        </button>
      </div>
    </form>
  );
}