"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";

export function UnitToggle() {
  const { units, setUnits } = usePreferences();

  return (
    <div
      role="group"
      aria-label="Temperature units"
      className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-card"
    >
      <button
        type="button"
        aria-pressed={units === "metric"}
        onClick={() => setUnits("metric")}
        title="Celsius"
        className="focus-ring rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:text-text aria-pressed:bg-accent aria-pressed:text-bg sm:px-2.5"
      >
        °C
      </button>
      <button
        type="button"
        aria-pressed={units === "imperial"}
        onClick={() => setUnits("imperial")}
        title="Fahrenheit"
        className="focus-ring rounded-lg px-2 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:text-text aria-pressed:bg-accent aria-pressed:text-bg sm:px-2.5"
      >
        °F
      </button>
    </div>
  );
}