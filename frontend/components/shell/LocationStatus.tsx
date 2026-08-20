"use client";

import { useLocation } from "@/components/providers/LocationProvider";

/**
 * Phase 5 shell body. Confirms the selected location so the header
 * controls can be verified. Weather cards belong to later phases.
 */
export function LocationStatus() {
  const { location, error, detecting } = useLocation();

  if (location) return null;

  return (
    <section aria-label="Selected location" className="pt-6 sm:pt-10">
      <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        Look up the weather
      </h1>
      <p className="mt-2 max-w-xl text-text-secondary">
        Enter a latitude and longitude, or use your current location. City search is not available yet.
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
    </section>
  );
}
