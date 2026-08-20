"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { WeatherIcon } from "@/lib/weather-icons";
import {
  AlertIcon,
  CalendarIcon,
  ClockIcon,
  CrosshairIcon,
  SearchIcon,
  SparkleIcon,
} from "@/components/ui/icons";

export function EmptyState() {
  const { detectLocation, detecting, error } = useLocation();

  function focusCoordinateSearch() {
    const form = document.getElementById("weather-search");
    form?.scrollIntoView?.({
      behavior: "smooth",
      block: "center",
    });
    const lat = document.getElementById("weather-lat");
    if (lat instanceof HTMLElement) {
      lat.focus({ preventScroll: true });
      return;
    }
    document.getElementById("weather-query")?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-label="Your weather, at a glance"
      className="bg-precision-dots relative -mx-4 flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center px-4 pb-16 pt-8 text-center sm:-mx-6 sm:px-6 lg:-mx-6 lg:px-6"
    >
      <div
        aria-hidden="true"
        className="mb-8 grid h-28 w-28 place-items-center rounded-full border border-border bg-surface shadow-[0_0_40px_rgba(87,241,219,0.05)] sm:h-32 sm:w-32"
      >
        <WeatherIcon name="cloudy" className="h-14 w-14 text-accent sm:h-16 sm:w-16" />
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        Your weather, at a glance.
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-text-secondary">
        Enter coordinates or use your location to get started with analytical
        meteorological data precision.
      </p>

      <div className="mt-8 flex w-full max-w-md flex-col gap-4 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-control bg-accent px-6 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {detecting ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border-2 border-on-accent/30 border-t-on-accent motion-safe:animate-spin"
            />
          ) : (
            <CrosshairIcon className="h-4 w-4" />
          )}
          {detecting ? "Locating…" : "Use my location"}
        </button>
        <button
          type="button"
          onClick={focusCoordinateSearch}
          className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-control border border-border bg-surface px-6 text-sm font-medium text-text transition-colors hover:border-accent"
        >
          <SearchIcon className="h-4 w-4" />
          Search by coordinates
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 inline-flex items-center gap-2 rounded-control border border-warning/25 bg-warning/10 px-3 py-1.5 text-sm text-warning"
        >
          <AlertIcon className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-12 flex w-full max-w-lg flex-wrap justify-center gap-x-8 gap-y-4 border-t border-border pt-8">
        <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.05em] text-text-muted">
          <CalendarIcon className="h-5 w-5" />
          7-day forecast
        </p>
        <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.05em] text-text-muted">
          <ClockIcon className="h-5 w-5" />
          Hourly outlook
        </p>
        <p className="flex items-center gap-2 text-[12px] font-medium tracking-[0.05em] text-text-muted">
          <SparkleIcon className="h-5 w-5" />
          AI insights
        </p>
      </div>
    </section>
  );
}
