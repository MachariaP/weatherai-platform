"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useWeather } from "@/hooks/useWeather";
import { CurrentWeather } from "./CurrentWeather";
import { EmptyState } from "./EmptyState";
import { AISummary } from "./AISummary";
import { ForecastGrid } from "./ForecastGrid";
import { HourlyScroll } from "./HourlyScroll";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  CurrentWeatherSkeleton,
  ForecastSkeleton,
  HourlySkeleton,
  AiSummarySkeleton,
} from "@/components/ui/LoadingSkeleton";

export function WeatherDashboard() {
  const { location } = useLocation();
  const { units, aiEnabled } = usePreferences();
  const { data, isLoading, error, cacheStatus, refetch } = useWeather(
    location?.lat ?? null,
    location?.lon ?? null,
    units,
    aiEnabled
  );

  if (!location) {
    return <EmptyState />;
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <CurrentWeatherSkeleton />
        {aiEnabled && <AiSummarySkeleton />}
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
    <div className="space-y-6 sm:space-y-8">
      {error && <ErrorBanner error={error} onRetry={refetch} />}

      <CurrentWeather
        data={data.current}
        units={units}
        location={location.label}
        cacheStatus={cacheStatus}
      />

      <AISummary enabled={aiEnabled} summary={data.ai_summary} error={error} />

      <ForecastGrid days={data.daily} />

      <HourlyScroll hours={data.hourly} />
    </div>
  );
}