"use client";

import { useMemo, useState } from "react";
import type { HourlyForecast } from "@/lib/types";
import {
  formatHour24,
  formatPrecipAmount,
  formatTemp,
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

function hourRelation(time: string): "now" | "future" | "past" {
  if (isCurrentHour(time)) return "now";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "future";
  return date.getTime() > Date.now() ? "future" : "past";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultSelected(windowHours: HourlyForecast[]): string | null {
  const now = windowHours.find((hour) => hour.time && isCurrentHour(hour.time));
  return now?.time ?? windowHours[0]?.time ?? null;
}

/**
 * Shared active hour for chart, strip, and scrubber.
 * Future hours are labeled as forecast, never as current weather.
 */
export function HourlyExploration({ hours, units, onExploreHour }: Props) {
  const windowHours = useMemo(() => nextHourlyWindow(hours), [hours]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const fallbackTime = defaultSelected(windowHours);
  const activeTime =
    selectedTime &&
    (windowHours.some((hour) => hour.time === selectedTime) ||
      Boolean(hours?.some((hour) => hour.time === selectedTime)))
      ? selectedTime
      : fallbackTime;

  const selected =
    windowHours.find((hour) => hour.time === activeTime) ??
    hours?.find((hour) => hour.time === activeTime) ??
    null;
  const exploringAway = Boolean(
    selected?.time && hourRelation(selected.time) !== "now"
  );
  const exploreHeading = selected?.time
    ? hourRelation(selected.time) === "future"
      ? `Forecast at ${formatHour24(selected.time)}`
      : hourRelation(selected.time) === "past"
        ? `At ${formatHour24(selected.time)}`
        : null
    : null;

  function selectTime(time: string) {
    setSelectedTime(time);
    const hour =
      windowHours.find((row) => row.time === time) ??
      hours?.find((row) => row.time === time) ??
      null;
    onExploreHour?.(hour && hour.time && !isCurrentHour(hour.time) ? hour : null);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
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
      <HourlyScroll
        hours={hours}
        units={units}
        selectedTime={activeTime}
        onSelectTime={selectTime}
      />
      <TimelineScrubber
        hours={windowHours}
        selectedTime={activeTime}
        onSelectTime={selectTime}
      />
      <HourlyChart
        hours={hours}
        units={units}
        selectedTime={activeTime}
        onSelectTime={selectTime}
      />
    </div>
  );
}
