"use client";

import {
  formatHourlyClock,
  formatScrubberValueText,
  formatSelectedHourLabel,
  formatWindowEndLabel,
  isObservedHour,
} from "@/lib/format";
import type { HourlyForecast } from "@/lib/types";

interface Props {
  hours: HourlyForecast[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  observedAt?: string | null;
  /** Authoritative Now index when provided by HourlyExploration. */
  nowIndex?: number;
  /** Nested inside the Next 24 hours group — quieter chrome. */
  embedded?: boolean;
}

/**
 * Semantic slider over the same hourly window as the chart and strip.
 * Does not fetch. Now vs future is announced via aria-valuetext.
 */
export function TimelineScrubber({
  hours,
  selectedTime,
  onSelectTime,
  observedAt = null,
  nowIndex = -1,
  embedded = false,
}: Props) {
  const max = Math.max(0, hours.length - 1);
  const index = Math.max(
    0,
    hours.findIndex((hour) => hour.time === selectedTime)
  );
  const selected = hours[index];
  const startTime = hours[0]?.time;
  const endTime = hours[max]?.time;
  const midIndex = max >= 4 ? Math.floor(max / 2) : -1;
  const midTime = midIndex >= 0 ? hours[midIndex]?.time : undefined;
  const valueText = selected?.time
    ? formatScrubberValueText(selected.time, observedAt)
    : "Unavailable";
  const liveLabel = selected?.time
    ? formatSelectedHourLabel(selected.time, observedAt)
    : "Unavailable";
  const startIsNow =
    nowIndex === 0 ||
    (nowIndex < 0 && Boolean(startTime) && isObservedHour(startTime, observedAt));
  const startLabel = startIsNow
    ? "Now"
    : startTime
      ? formatHourlyClock(startTime)
      : "";

  if (hours.length === 0) return null;

  const shell = embedded
    ? "px-0 py-1"
    : "rounded-card border border-border bg-surface px-3 py-3";

  return (
    <div className={shell}>
      {!embedded ? (
        <div className="mb-2 flex min-w-0 items-baseline justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
            Timeline
          </p>
          <p
            className="min-w-0 truncate text-xs font-medium tabular-nums text-text"
            aria-live="polite"
          >
            {liveLabel}
          </p>
        </div>
      ) : (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Timeline
        </p>
      )}
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={index}
        aria-label="Hourly weather timeline"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={index}
        aria-valuetext={valueText}
        onChange={(event) => {
          const next = hours[Number(event.target.value)];
          if (next?.time) onSelectTime(next.time);
        }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
      />
      <div className="mt-1 flex min-w-0 justify-between gap-2 text-[11px] tabular-nums text-text-secondary">
        <span className="shrink-0">{startLabel}</span>
        {midTime ? (
          <span className="hidden min-w-0 truncate text-center lg:inline">
            {formatHourlyClock(midTime)}
          </span>
        ) : null}
        <span className="min-w-0 truncate text-right">
          <span className="md:hidden">
            {formatWindowEndLabel(startTime, endTime, true, observedAt)}
          </span>
          <span className="hidden md:inline">
            {formatWindowEndLabel(startTime, endTime, false, observedAt)}
          </span>
        </span>
      </div>
    </div>
  );
}
