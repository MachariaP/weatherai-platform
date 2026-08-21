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
  isObservedHour,
  type Units,
} from "@/lib/format";
import { nextHourlyWindow, observedHourIndex } from "@/lib/hourly-chart";
import { HourlyChart } from "./HourlyChart";
import { HourlyScroll } from "./HourlyScroll";
import { TimelineScrubber } from "./TimelineScrubber";

interface Props {
  hours: HourlyForecast[] | null | undefined;
  units: Units;
  /** Provider `current.observed_at` — anchors hourly Now. */
  observedAt?: string | null;
  onExploreHour?: (hour: HourlyForecast | null) => void;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultSelected(
  windowHours: HourlyForecast[],
  nowIndex: number
): string | null {
  if (nowIndex >= 0) return windowHours[nowIndex]?.time ?? null;
  return windowHours[0]?.time ?? null;
}

/**
 * Shared active hour for chart, strip, and scrubber over the next 24 hours.
 * Future hours are labeled as forecast, never as current weather.
 * Now is the provider observation hour, not the browser clock.
 */
export function HourlyExploration({
  hours,
  units,
  observedAt = null,
  onExploreHour,
}: Props) {
  const windowHours = useMemo(
    () => nextHourlyWindow(hours, observedAt),
    [hours, observedAt]
  );
  const nowIndex = useMemo(
    () => observedHourIndex(windowHours, observedAt),
    [windowHours, observedAt]
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const fallbackTime = defaultSelected(windowHours, nowIndex);
  const activeTime =
    selectedTime && windowHours.some((hour) => hour.time === selectedTime)
      ? selectedTime
      : fallbackTime;

  const selected =
    windowHours.find((hour) => hour.time === activeTime) ?? null;
  const exploringAway = Boolean(
    selected?.time && hourRelation(selected.time, observedAt) !== "now"
  );
  const exploreHeading = selected?.time
    ? formatSelectedHourLabel(selected.time, observedAt)
    : null;
  const endCap =
    windowHours.length > 0
      ? formatWindowEndLabel(
          windowHours[0]?.time,
          windowHours[windowHours.length - 1]?.time,
          false,
          observedAt
        )
      : "";

  function selectTime(time: string) {
    setSelectedTime(time);
    const hour = windowHours.find((row) => row.time === time) ?? null;
    onExploreHour?.(
      hour && hour.time && !isObservedHour(hour.time, observedAt) ? hour : null
    );
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
            {hourRelation(selected.time, observedAt) === "now"
              ? `Now · ${formatHourlyClock(selected.time)}`
              : formatSelectedHourLabel(selected.time, observedAt)}
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
          observedAt={observedAt}
          nowIndex={nowIndex}
          selectedTime={activeTime}
          onSelectTime={selectTime}
          showHeading={false}
        />
        <TimelineScrubber
          hours={windowHours}
          observedAt={observedAt}
          nowIndex={nowIndex}
          selectedTime={activeTime}
          onSelectTime={selectTime}
          embedded
        />
        <HourlyChart
          hours={windowHours}
          units={units}
          observedAt={observedAt}
          range="all"
          selectedTime={activeTime}
          onSelectTime={selectTime}
          embedded
        />
      </div>
    </section>
  );
}
