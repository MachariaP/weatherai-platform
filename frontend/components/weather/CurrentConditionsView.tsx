"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useAppView } from "@/components/providers/ViewProvider";
import { useWeather } from "@/hooks/useWeather";
import { formatLatLon } from "@/lib/format";
import { EmptyState } from "./EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { WeatherLoading } from "@/components/ui/LoadingSkeleton";
import { CurrentWeather } from "./CurrentWeather";
import { ObservedRefresh } from "./ObservedRefresh";
import { AISummary } from "./AISummary";
import { HourlyScroll } from "./HourlyScroll";
import { HourlyChart } from "./HourlyChart";
import { ForecastGrid } from "./ForecastGrid";
import { SettingsPanel } from "./SettingsPanel";
import { CompareView } from "./CompareView";
import { FavoriteToggle } from "@/components/ui/FavoriteToggle";

/**
 * Async weather states: empty, loading, success, error, and view switching.
 */
export function CurrentConditionsView() {
  const { location } = useLocation();
  const { units, aiEnabled, forecastDays } = usePreferences();
  const { view } = useAppView();
  const { data, error, cacheStatus, refetch, isRefreshing } = useWeather(
    location?.lat ?? null,
    location?.lon ?? null,
    units,
    aiEnabled,
    forecastDays
  );

  if (view === "settings") {
    return <SettingsPanel />;
  }

  if (view === "compare") {
    return <CompareView />;
  }

  if (!location) {
    return <EmptyState />;
  }

  if (!data && !error) {
    return <WeatherLoading showAi={aiEnabled} forecastDays={forecastDays} />;
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

  const heading =
    data.place_name?.trim() || location.label || "Unknown location";
  const coordsLabel = formatLatLon(data.lat, data.lon);
  const refreshBar = (
    <ObservedRefresh
      observedAt={data.current.observed_at}
      onRefresh={refetch}
      refreshing={isRefreshing}
    />
  );

  const hero = (
    <CurrentWeather
      data={data.current}
      units={units}
      location={heading}
      cacheStatus={cacheStatus}
      lat={data.lat}
      lon={data.lon}
      actions={<FavoriteToggle />}
    />
  );

  if (view === "forecast") {
    return (
      <div className="space-y-6 pt-2">
        {error ? <ErrorBanner error={error} onRetry={refetch} /> : null}
        {refreshBar}
        {coordsLabel ? (
          <p className="text-sm text-text-muted">{coordsLabel}</p>
        ) : null}
        <ForecastGrid
          days={data.daily}
          units={units}
          requestedDays={forecastDays}
          hourly={data.hourly}
        />
      </div>
    );
  }

  if (view === "insights") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pt-2">
        {error ? <ErrorBanner error={error} onRetry={refetch} /> : null}
        {refreshBar}
        {aiEnabled ? (
          <AISummary enabled summary={data.ai_summary} error={error} />
        ) : (
          <section
            aria-label="AI weather insight"
            className="rounded-card border border-border bg-surface p-5 text-sm text-text-secondary"
          >
            Turn on AI insights in Settings to request a summary for this location.
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2 sm:space-y-8">
      {error ? <ErrorBanner error={error} onRetry={refetch} /> : null}
      {refreshBar}

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
          {hero}
          <HourlyScroll hours={data.hourly} units={units} />
          <HourlyChart hours={data.hourly} units={units} />
        </div>

        <aside className="flex min-w-0 flex-col gap-8 border-t border-border pt-8 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <AISummary
            enabled={aiEnabled}
            summary={data.ai_summary}
            error={error}
          />
          <ForecastGrid
            days={data.daily}
            units={units}
            requestedDays={forecastDays}
            hourly={data.hourly}
          />
        </aside>
      </div>
    </div>
  );
}
