"use client";

import { useMemo, useState } from "react";
import type { HourlyForecast } from "@/lib/types";
import {
  formatPrecipAmount,
  formatSelectedHourLabel,
  formatTemp,
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

  function selectTime(time: string) {
    setSelectedTime(time);
    const hour = windowHours.find((row) => row.time === time) ?? null;
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
        hours={windowHours}
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
        hours={windowHours}
        units={units}
        range="all"
        selectedTime={activeTime}
        onSelectTime={selectTime}
      />
    </div>
  );
}
