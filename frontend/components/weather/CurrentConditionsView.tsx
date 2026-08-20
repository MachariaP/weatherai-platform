"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useWeather } from "@/hooks/useWeather";
import { LocationStatus } from "@/components/shell/LocationStatus";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { CurrentWeather } from "./CurrentWeather";
import { AISummary } from "./AISummary";

/**
 * Phase 6 current-weather view.
 *
 * Does not render 7-day forecast, hourly rows, or skeleton layouts.
 */
export function CurrentConditionsView() {
  const { location } = useLocation();
  const { units, aiEnabled } = usePreferences();
  const { data, error, cacheStatus, refetch } = useWeather(
    location?.lat ?? null,
    location?.lon ?? null,
    units,
    aiEnabled
  );

  if (!location) {
    return <LocationStatus />;
  }

  if (!data && !error) {
    return (
      <p role="status" className="pt-8 text-sm text-text-secondary">
        Loading current weather…
      </p>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6 pt-4">
        <ErrorBanner error={error} onRetry={refetch} />
        <AISummary enabled={aiEnabled} summary={null} error={error} />
      </div>
    );
  }

  if (!data?.current) {
    return (
      <ErrorBanner
        error={{
          error: "malformed_response",
          message: "Current weather is unavailable",
        }}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6 pt-4 sm:space-y-8">
      {error ? <ErrorBanner error={error} onRetry={refetch} /> : null}

      <CurrentWeather
        data={data.current}
        units={units}
        location={location.label}
        cacheStatus={cacheStatus}
      />

      <AISummary
        enabled={aiEnabled}
        summary={data.ai_summary}
        error={error}
      />
    </div>
  );
}
