"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";

export function UnitToggle() {
  const { units, setUnits } = usePreferences();

  return (
    <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
      <button
        onClick={() => setUnits("metric")}
        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
          units === "metric"
            ? "bg-[var(--accent)] text-[var(--background)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        °C
      </button>
      <button
        onClick={() => setUnits("imperial")}
        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
          units === "imperial"
            ? "bg-[var(--accent)] text-[var(--background)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        °F
      </button>
    </div>
  );
}
