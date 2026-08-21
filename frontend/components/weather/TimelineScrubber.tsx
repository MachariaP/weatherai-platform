"use client";

import { formatHour24, isCurrentHour } from "@/lib/format";
import type { HourlyForecast } from "@/lib/types";

interface Props {
  hours: HourlyForecast[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

function hourRelation(time: string): "now" | "future" | "past" {
  if (isCurrentHour(time)) return "now";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "future";
  return date.getTime() > Date.now() ? "future" : "past";
}

/**
 * Semantic slider over the same hourly window as the chart.
 * Does not fetch. Now vs future is announced via aria-valuetext.
 */
export function TimelineScrubber({ hours, selectedTime, onSelectTime }: Props) {
  const max = Math.max(0, hours.length - 1);
  const index = Math.max(
    0,
    hours.findIndex((hour) => hour.time === selectedTime)
  );
  const selected = hours[index];
  const now = Boolean(selected?.time && isCurrentHour(selected.time));
  const relation = selected?.time ? hourRelation(selected.time) : "now";
  const timeLabel = selected?.time
    ? now
      ? "Now"
      : formatHour24(selected.time)
    : "Unavailable";
  const valueText =
    relation === "now"
      ? "Now, current conditions"
      : relation === "past"
        ? `At ${timeLabel}`
        : `Forecast at ${timeLabel}`;
  const liveLabel = relation === "now" ? "Now" : relation === "past" ? `At ${timeLabel}` : `${timeLabel} forecast`;

  if (hours.length === 0) return null;

  return (
    <div className="rounded-card border border-border bg-surface px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Timeline
        </p>
        <p className="text-xs font-medium tabular-nums text-text" aria-live="polite">
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
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-text-muted">
        <span>
          {hours[0]?.time && isCurrentHour(hours[0].time)
            ? "Now"
            : hours[0]?.time
              ? formatHour24(hours[0].time)
              : ""}
        </span>
        <span>{hours[max]?.time ? formatHour24(hours[max].time) : ""}</span>
      </div>
    </div>
  );
}
