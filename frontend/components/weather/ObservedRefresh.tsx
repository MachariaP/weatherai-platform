"use client";

import { RefreshIcon } from "@/components/ui/icons";
import { formatObservedClock } from "@/lib/format";

interface Props {
  observedAt: string | null | undefined;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Observation clock from FastAPI `current.observed_at`, plus a Refresh
 * that reissues GET /api/weather. FastAPI TTL still applies; HIT is honest.
 */
export function ObservedRefresh({ observedAt, onRefresh, refreshing }: Props) {
  const clock = formatObservedClock(observedAt ?? null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {clock ? (
        <p className="text-sm text-text-muted">Observed {clock}</p>
      ) : (
        <span className="sr-only">Observation time unavailable</span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
        className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-control border border-border px-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshIcon className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "Refreshing" : "Refresh"}
      </button>
    </div>
  );
}
