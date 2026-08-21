"use client";

import { RefreshIcon, CheckIcon, ClockIcon } from "@/components/ui/icons";
import { formatObservedClock } from "@/lib/format";

interface Props {
  observedAt: string | null | undefined;
  cacheStatus?: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Observation clock from FastAPI `current.observed_at`, optional cache
 * freshness, and Refresh. FastAPI TTL still applies; HIT is honest.
 */
export function ObservedRefresh({
  observedAt,
  cacheStatus = null,
  onRefresh,
  refreshing,
}: Props) {
  const clock = formatObservedClock(observedAt ?? null);
  const isCached = cacheStatus === "HIT";
  const showCache = cacheStatus === "HIT" || cacheStatus === "MISS";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {clock ? (
          <p className="text-sm text-text-secondary">Observed {clock}</p>
        ) : (
          <span className="sr-only">Observation time unavailable</span>
        )}
        {showCache ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              isCached
                ? "border-border bg-card text-text-secondary"
                : "border-accent/20 bg-accent/10 text-accent"
            }`}
          >
            {isCached ? (
              <ClockIcon className="h-3 w-3" aria-hidden="true" />
            ) : (
              <CheckIcon className="h-3 w-3" aria-hidden="true" />
            )}
            {isCached ? "Cached" : "Live"}
          </span>
        ) : null}
      </div>
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
