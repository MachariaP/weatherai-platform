"use client";

import {
  formatHourlyClock,
  formatScrubberValueText,
  formatSelectedHourLabel,
  formatWindowEndLabel,
  isCurrentHour,
} from "@/lib/format";
import type { HourlyForecast } from "@/lib/types";

interface Props {
  hours: HourlyForecast[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

/**
 * Semantic slider over the same hourly window as the chart and strip.
 * Does not fetch. Now vs future is announced via aria-valuetext.
 */
export function TimelineScrubber({ hours, selectedTime, onSelectTime }: Props) {
  const max = Math.max(0, hours.length - 1);
  const index = Math.max(
    0,
    hours.findIndex((hour) => hour.time === selectedTime)
  );
  const selected = hours[index];
  const startTime = hours[0]?.time;
  const endTime = hours[max]?.time;
  const valueText = selected?.time
    ? formatScrubberValueText(selected.time)
    : "Unavailable";
  const liveLabel = selected?.time
    ? formatSelectedHourLabel(selected.time)
    : "Unavailable";
  const startLabel =
    startTime && isCurrentHour(startTime)
      ? "Now"
      : startTime
        ? formatHourlyClock(startTime)
        : "";

  if (hours.length === 0) return null;

  return (
    <section aria-label="Next 24 hours" className="rounded-card border border-border bg-surface px-3 py-3">
      <div className="mb-2 flex min-w-0 items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Next 24 hours
        </h2>
        <p className="min-w-0 truncate text-xs font-medium tabular-nums text-text" aria-live="polite">
          {liveLabel}
        </p>
      </div>
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
      <div className="mt-1 flex min-w-0 justify-between gap-2 text-[11px] tabular-nums text-text-muted">
        <span className="shrink-0">{startLabel}</span>
        <span className="min-w-0 truncate text-right">
          <span className="md:hidden">{formatWindowEndLabel(startTime, endTime, true)}</span>
          <span className="hidden md:inline">{formatWindowEndLabel(startTime, endTime, false)}</span>
        </span>
      </div>
    </section>
  );
}
