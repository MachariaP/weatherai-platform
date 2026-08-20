"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";

export function UnitToggle() {
  const { units, setUnits } = usePreferences();

  return (
    <div
      role="group"
      aria-label="Temperature units"
      className="flex items-center rounded-full border border-border bg-surface p-0.5"
    >
      <button
        type="button"
        aria-pressed={units === "metric"}
        aria-label="Celsius"
        onClick={() => setUnits("metric")}
        title="Celsius"
        className="focus-ring min-h-10 min-w-10 rounded-full px-2.5 text-xs font-semibold text-text-muted transition-colors hover:text-text aria-pressed:bg-accent aria-pressed:text-on-accent"
      >
        °C
      </button>
      <button
        type="button"
        aria-pressed={units === "imperial"}
        aria-label="Fahrenheit"
        onClick={() => setUnits("imperial")}
        title="Fahrenheit"
        className="focus-ring min-h-10 min-w-10 rounded-full px-2.5 text-xs font-semibold text-text-muted transition-colors hover:text-text aria-pressed:bg-accent aria-pressed:text-on-accent"
      >
        °F
      </button>
    </div>
  );
}
