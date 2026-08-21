"use client";

import { useMemo, useState } from "react";
import type { HourlyForecast } from "@/lib/types";
import {
  formatHourlyClock,
  formatPrecipAmount,
  formatSelectedHourLabel,
  formatTemp,
  formatWindowEndLabel,
  hourRelation,
  isCurrentHour,
  type Units,
} from "@/lib/format";
import { nextHourlyWindow } from "@/lib/hourly-chart";
import { HourlyChart } from "./HourlyChart";
import { HourlyScroll } from "./HourlyScroll";
import { TimelineScrubber } from "./TimelineScrubber";

interface Props {
  hours: HourlyForecast[] | null | undefined;
  units: Units;
  onExploreHour?: (hour: HourlyForecast | null) => void;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultSelected(windowHours: HourlyForecast[]): string | null {
  const now = windowHours.find((hour) => hour.time && isCurrentHour(hour.time));
  return now?.time ?? windowHours[0]?.time ?? null;
}

/**
 * Shared active hour for chart, strip, and scrubber over the next 24 hours.
 * Future hours are labeled as forecast, never as current weather.
 */
export function HourlyExploration({ hours, units, onExploreHour }: Props) {
  const windowHours = useMemo(() => nextHourlyWindow(hours), [hours]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const fallbackTime = defaultSelected(windowHours);
  const activeTime =
    selectedTime && windowHours.some((hour) => hour.time === selectedTime)
      ? selectedTime
      : fallbackTime;

  const selected =
    windowHours.find((hour) => hour.time === activeTime) ?? null;
  const exploringAway = Boolean(
    selected?.time && hourRelation(selected.time) !== "now"
  );
  const exploreHeading = selected?.time
    ? formatSelectedHourLabel(selected.time)
    : null;
  const endCap =
    windowHours.length > 0
      ? formatWindowEndLabel(
          windowHours[0]?.time,
          windowHours[windowHours.length - 1]?.time,
          false
        )
      : "";

  function selectTime(time: string) {
    setSelectedTime(time);
    const hour = windowHours.find((row) => row.time === time) ?? null;
    onExploreHour?.(hour && hour.time && !isCurrentHour(hour.time) ? hour : null);
  }

  return (
    <section aria-label="Next 24 hours" className="flex min-w-0 flex-col gap-4">
      <header className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
            Next 24 hours
          </h2>
          {endCap ? (
            <p className="mt-1 text-xs text-text-muted">Through {endCap}</p>
          ) : null}
        </div>
        {selected?.time ? (
          <p className="text-xs font-medium tabular-nums text-text" aria-live="polite">
            {hourRelation(selected.time) === "now"
              ? `Now · ${formatHourlyClock(selected.time)}`
              : formatSelectedHourLabel(selected.time)}
          </p>
        ) : null}
      </header>

      {exploringAway && selected && exploreHeading ? (
        <p
          role="status"
          className="rounded-card border border-border bg-surface px-3 py-2 text-sm text-text-secondary"
        >
          <span className="font-medium text-text">{exploreHeading}</span>
          {isFiniteNumber(selected.temperature)
            ? ` · ${formatTemp(selected.temperature)}`
            : ""}
          {selected.weather_description?.trim()
            ? ` · ${selected.weather_description.trim()}`
            : ""}
          {formatPrecipAmount(selected.precipitation, units)
            ? ` · ${formatPrecipAmount(selected.precipitation, units)}`
            : ""}
        </p>
      ) : null}

      <div className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface/60 p-3 sm:p-4">
        <HourlyScroll
          hours={windowHours}
          units={units}
          selectedTime={activeTime}
          onSelectTime={selectTime}
          showHeading={false}
        />
        <TimelineScrubber
          hours={windowHours}
          selectedTime={activeTime}
          onSelectTime={selectTime}
          embedded
        />
        <HourlyChart
          hours={windowHours}
          units={units}
          range="all"
          selectedTime={activeTime}
          onSelectTime={selectTime}
          embedded
        />
      </div>
    </section>
  );
}
