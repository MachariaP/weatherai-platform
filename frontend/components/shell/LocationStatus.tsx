"use client";

import { useLocation } from "@/components/providers/LocationProvider";

/**
 * Phase 5 shell body. Confirms the selected location so the header
 * controls can be verified. Weather cards belong to later phases.
 */
export function LocationStatus() {
  const { location, error, detecting } = useLocation();

  return (
    <section aria-label="Selected location" className="pt-6 sm:pt-10">
      <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {location ? "Location ready" : "Look up the weather"}
      </h1>
      <p className="mt-2 max-w-xl text-text-secondary">
        {location
          ? "Coordinates are set. Use the header to change location, units, or AI insights."
          : "Enter a latitude and longitude, or use your current location. City search is not available yet."}
      </p>

      {detecting ? (
        <p className="mt-6 text-sm text-text-secondary">Finding your location…</p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-6 inline-flex rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning"
        >
          {error}
        </p>
      ) : null}

      {location ? (
        <dl className="mt-8 grid max-w-md gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Label</dt>
            <dd className="font-medium text-text">{location.label}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Latitude</dt>
            <dd className="font-medium tabular-nums text-text">{location.lat}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Longitude</dt>
            <dd className="font-medium tabular-nums text-text">{location.lon}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
