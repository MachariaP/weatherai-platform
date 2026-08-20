"use client";

import { SearchBar } from "./SearchBar";

/**
 * Unified location control: city search, coordinates, saved, recent, GPS,
 * and compare all feed LocationProvider through the same SearchBar surface.
 */
export function LocationSwitcher() {
  return (
    <div aria-label="Location switcher" className="w-full">
      <SearchBar />
    </div>
  );
}
