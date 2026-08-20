"use client";

import { SearchBar } from "./SearchBar";
import { UnitToggle } from "./UnitToggle";
import { AiToggle } from "./AiToggle";
import { MyLocationButton } from "./MyLocationButton";
import { WeatherLogo } from "./WeatherLogo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center gap-3 md:h-[4.5rem] md:gap-6">
          <WeatherLogo />
          <div className="hidden flex-1 justify-center md:flex">
            <div className="w-full max-w-md lg:max-w-lg">
              <SearchBar />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <MyLocationButton className="hidden md:inline-flex" />
            <UnitToggle />
            <AiToggle />
          </div>
        </div>
        <div className="pb-4 md:hidden">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <SearchBar />
            </div>
            <MyLocationButton />
          </div>
        </div>
      </div>
    </header>
  );
}