"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useWeather } from "@/hooks/useWeather";
import { CurrentWeather } from "./CurrentWeather";
import { AISummary } from "./AISummary";
import { ForecastGrid } from "./ForecastGrid";
import { HourlyScroll } from "./HourlyScroll";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  CurrentWeatherSkeleton,
  ForecastSkeleton,
  HourlySkeleton,
} from "@/components/ui/LoadingSkeleton";

export function WeatherDashboard() {
  const { location, error: locationError } = useLocation();
  const { units } = usePreferences();
  const { data, isLoading, error, cacheStatus, refetch } = useWeather(
    location?.lat ?? null,
    location?.lon ?? null,
    units
  );

  if (!location) {
    return (
      <div className="text-center py-24">
        <p className="text-6xl mb-4">🌍</p>
        <h2 className="text-xl font-medium text-[var(--foreground)] mb-2">
          Welcome to WeatherAI
        </h2>
        <p className="text-[var(--muted)] max-w-md mx-auto">
          Enter coordinates above or click &quot;My Location&quot; to get started.
        </p>
        {locationError && (
          <p className="text-sm text-[var(--danger)] mt-4">{locationError}</p>
        )}
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <CurrentWeatherSkeleton />
        <ForecastSkeleton />
        <HourlySkeleton />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorBanner error={error} onRetry={refetch} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {error && <ErrorBanner error={error} onRetry={refetch} />}

      <CurrentWeather
        data={data.current}
        units={units}
        location={location.label}
        cacheStatus={cacheStatus}
      />

      {data.ai_summary && <AISummary summary={data.ai_summary} />}

      <ForecastGrid days={data.daily} units={units} />

      <HourlyScroll hours={data.hourly} units={units} />
    </div>
  );
}
