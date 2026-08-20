"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useWeather } from "@/hooks/useWeather";
import { EmptyState } from "./EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { WeatherLoading } from "@/components/ui/LoadingSkeleton";
import { CurrentWeather } from "./CurrentWeather";
import { AISummary } from "./AISummary";
import { HourlyScroll } from "./HourlyScroll";
import { ForecastGrid } from "./ForecastGrid";

/**
 * Async weather states: empty, loading, success, error, and partial data.
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
    return <EmptyState />;
  }

  if (!data && !error) {
    return <WeatherLoading showAi={aiEnabled} />;
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

      <HourlyScroll hours={data.hourly} units={units} />
      <ForecastGrid days={data.daily} units={units} />
    </div>
  );
}
