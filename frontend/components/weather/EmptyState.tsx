"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { WeatherIcon } from "@/lib/weather-icons";
import { AlertIcon, CrosshairIcon, MapPinIcon } from "@/components/ui/icons";

const CAPABILITIES = ["7-day forecast", "Hourly outlook", "AI insights"];

export function EmptyState() {
  const { detectLocation, detecting, error } = useLocation();

  function scrollToSearch() {
    document.getElementById("weather-search")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    (
      document.getElementById("weather-lat") as HTMLInputElement | null
    )?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-label="Getting started"
      className="flex flex-col items-center pb-10 pt-14 text-center sm:pt-20"
    >
      <div
        aria-hidden="true"
        className="mb-8 grid h-40 w-40 place-items-center rounded-full border border-border bg-surface"
      >
        <WeatherIcon name="partly-day" className="h-24 w-24 text-accent" />
      </div>

      <h2 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        Your weather, at a glance.
      </h2>
      <p className="mt-2 max-w-md text-text-secondary">
        Enter coordinates or use your location to get started.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {detecting ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background"
            />
          ) : (
            <CrosshairIcon className="h-4 w-4" />
          )}
          {detecting ? "Locating…" : "Use my location"}
        </button>
        <button
          type="button"
          onClick={scrollToSearch}
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-medium text-text-secondary shadow-card transition-colors hover:border-border-strong hover:text-text"
        >
          <MapPinIcon className="h-4 w-4" />
          Search by coordinates
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {CAPABILITIES.map((feature) => (
          <span
            key={feature}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-muted"
          >
            {feature}
          </span>
        ))}
      </div>

      {error && (
        <p
          role="status"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-1.5 text-sm text-warning"
        >
          <AlertIcon className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}