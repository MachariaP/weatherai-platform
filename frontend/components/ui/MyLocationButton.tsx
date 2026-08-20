"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { CrosshairIcon } from "./icons";

export function MyLocationButton({ className = "" }: { className?: string }) {
  const { detectLocation, detecting } = useLocation();

  return (
    <button
      type="button"
      onClick={detectLocation}
      disabled={detecting}
      aria-busy={detecting}
      aria-label="Use my location"
      title="Use my location"
      className={`focus-ring inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-text-secondary shadow-card transition-colors hover:border-border-strong hover:text-text disabled:opacity-60 ${className}`}
    >
      {detecting ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent"
        />
      ) : (
        <CrosshairIcon className="h-4 w-4" />
      )}
      <span className="hidden lg:inline">
        {detecting ? "Locating…" : "My location"}
      </span>
    </button>
  );
}