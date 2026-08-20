"use client";

import { SearchBar } from "./SearchBar";
import { UnitToggle } from "./UnitToggle";
import { AiToggle } from "./AiToggle";
import { MyLocationButton } from "./MyLocationButton";
import { WeatherLogo } from "./WeatherLogo";
import { useLocation } from "@/components/providers/LocationProvider";

export function Header() {
  const { detecting, error, location } = useLocation();

  const statusMessage = detecting
    ? "Finding your location"
    : error
      ? error
      : location
        ? `Location set to ${location.label}`
        : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 py-3 md:h-[4.5rem] md:flex-nowrap md:gap-6 md:py-0">
          <WeatherLogo />

          <div className="order-3 w-full md:order-2 md:min-w-0 md:flex-1">
            <SearchBar />
          </div>

          <MyLocationButton className="order-4 md:order-3" />

          <div className="order-2 ml-auto flex items-center gap-2 md:order-4 md:ml-0">
            <UnitToggle />
            <AiToggle />
          </div>
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      </div>
    </header>
  );
}
