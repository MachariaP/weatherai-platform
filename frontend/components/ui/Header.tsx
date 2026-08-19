"use client";

import { SearchBar } from "./SearchBar";
import { UnitToggle } from "./UnitToggle";
import { AiToggle } from "./AiToggle";

export function Header() {
  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
      <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-[var(--foreground)] whitespace-nowrap">
          ⛅ WeatherAI
        </h1>
        <div className="flex items-center gap-3 flex-wrap flex-1 justify-end">
          <SearchBar />
          <UnitToggle />
          <AiToggle />
        </div>
      </div>
    </header>
  );
}
