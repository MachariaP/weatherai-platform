"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";
import { FORECAST_DAY_OPTIONS, type ForecastDays } from "@/lib/forecast-days";

export function ForecastDaysToggle() {
  const { forecastDays, setForecastDays } = usePreferences();

  return (
    <div
      role="group"
      aria-label="Forecast range"
      className="flex items-center rounded-full border border-border bg-surface p-0.5"
    >
      {FORECAST_DAY_OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={forecastDays === days}
          aria-label={`${days} days`}
          onClick={() => setForecastDays(days as ForecastDays)}
          title={`${days}-day forecast`}
          className="focus-ring min-h-10 min-w-10 rounded-full px-2.5 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-text aria-pressed:bg-accent aria-pressed:text-on-accent"
        >
          {days}d
        </button>
      ))}
    </div>
  );
}
