"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { WeatherIcon } from "@/lib/weather-icons";
import { AlertIcon, CrosshairIcon, MapPinIcon } from "@/components/ui/icons";

const CAPABILITIES = ["Current conditions", "7-day forecast", "Hourly outlook"];

export function EmptyState() {
  const { detectLocation, detecting, error } = useLocation();

  function focusCoordinateSearch() {
    const form = document.getElementById("weather-search");
    form?.scrollIntoView?.({
      behavior: "smooth",
      block: "center",
    });
    document.getElementById("weather-lat")?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-label="Look up the weather"
      className="flex flex-col items-center pb-10 pt-10 text-center sm:pt-16"
    >
      <div
        aria-hidden="true"
        className="mb-8 grid h-28 w-28 place-items-center rounded-full border border-border bg-surface sm:h-32 sm:w-32"
      >
        <WeatherIcon name="partly-day" className="h-16 w-16 text-accent sm:h-20 sm:w-20" />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        Look up the weather
      </h1>
      <p className="mt-2 max-w-md text-text-secondary">
        Enter a latitude and longitude, or use your current location. City search
        is not available.
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
              className="h-4 w-4 rounded-full border-2 border-background/30 border-t-background motion-safe:animate-spin"
            />
          ) : (
            <CrosshairIcon className="h-4 w-4" />
          )}
          {detecting ? "Locating…" : "Use my location"}
        </button>
        <button
          type="button"
          onClick={focusCoordinateSearch}
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

      {error ? (
        <p
          role="alert"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-1.5 text-sm text-warning"
        >
          <AlertIcon className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </section>
  );
}
