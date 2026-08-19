"use client";

import { useState, type FormEvent } from "react";
import { useLocation } from "@/components/providers/LocationProvider";

export function SearchBar() {
  const { setLocation, detectLocation, detecting } = useLocation();
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    setLocation({ lat, lon, label: `${lat}°, ${lon}°` });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        type="number"
        step="any"
        placeholder="Latitude"
        value={latStr}
        onChange={(e) => setLatStr(e.target.value)}
        className="w-28 rounded-lg bg-[var(--card)] border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        min={-90}
        max={90}
        required
      />
      <input
        type="number"
        step="any"
        placeholder="Longitude"
        value={lonStr}
        onChange={(e) => setLonStr(e.target.value)}
        className="w-28 rounded-lg bg-[var(--card)] border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
        min={-180}
        max={180}
        required
      />
      <button
        type="submit"
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:bg-[var(--accent-hover)] transition-colors"
      >
        Search
      </button>
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors disabled:opacity-50"
      >
        {detecting ? "Detecting…" : "📍 My Location"}
      </button>
    </form>
  );
}
