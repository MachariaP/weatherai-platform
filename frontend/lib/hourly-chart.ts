/**
 * Presentation adapters for the hourly evolution chart.
 *
 * Shared window: from the provider observation hour (or the first row if none
 * matches), the next 24 hourly records. Chart, scrubber, and primary strip all
 * use this same window. Fallback first-row starts are not labeled Now.
 *
 * Values are not converted or invented — null precipitation stays null.
 * Hourly public contract has no wind; that metric is not exposed.
 */

import {
  formatHourlyClock,
  formatPrecipAmount,
  formatTemp,
  isObservedHour,
  type Units,
} from "@/lib/format";
import type { HourlyForecast } from "@/lib/types";

export const HOURLY_CHART_WINDOW = 24;

export type HourlyChartMetric = "temperature" | "precipitation";

export type HourlyChartPoint = {
  time: string;
  label: string;
  temperature: number | null;
  precipitation: number | null;
  condition: string;
  isNow: boolean;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function hourDateKey(time: string | undefined | null): string | null {
  if (!time?.trim()) return null;
  const match = time.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Next 24 hours from the first row whose naive hour matches `observedAt`.
 * No match / missing observation → start at the first valid row (not labeled Now).
 */
export function nextHourlyWindow(
  hours: HourlyForecast[] | null | undefined,
  observedAt: string | null | undefined = null,
  size = HOURLY_CHART_WINDOW
): HourlyForecast[] {
  const rows = Array.isArray(hours)
    ? hours.filter((hour) => Boolean(hour.time?.trim()))
    : [];
  const nowIndex = rows.findIndex((hour) =>
    isObservedHour(hour.time, observedAt)
  );
  const start = nowIndex >= 0 ? nowIndex : 0;
  return rows.slice(start, start + size);
}

/** Index of the first provider-observation hour in `hours`, or -1. */
export function observedHourIndex(
  hours: HourlyForecast[] | null | undefined,
  observedAt: string | null | undefined
): number {
  if (!Array.isArray(hours)) return -1;
  return hours.findIndex(
    (hour) => Boolean(hour.time?.trim()) && isObservedHour(hour.time, observedAt)
  );
}

export function precipitationAvailable(hours: HourlyForecast[]): boolean {
  return hours.some((hour) => isFiniteNumber(hour.precipitation));
}

/**
 * Chart points for a window. Only the first matching observation hour is Now
 * (duplicate timestamps later in the list are not labeled Now).
 */
export function toChartPoints(
  hours: HourlyForecast[],
  observedAt: string | null | undefined = null
): HourlyChartPoint[] {
  const nowIndex = observedHourIndex(hours, observedAt);
  return hours.map((hour, index) => {
    const time = hour.time?.trim() ?? "";
    const now = index === nowIndex && nowIndex >= 0;
    return {
      time,
      label: now ? "Now" : time ? formatHourlyClock(time) : "Unavailable",
      temperature: isFiniteNumber(hour.temperature) ? hour.temperature : null,
      precipitation: isFiniteNumber(hour.precipitation) ? hour.precipitation : null,
      condition: hour.weather_description?.trim() || "Conditions unavailable",
      isNow: now,
    };
  });
}

export function metricValue(
  point: HourlyChartPoint,
  metric: HourlyChartMetric
): number | null {
  return metric === "temperature" ? point.temperature : point.precipitation;
}

export type TooltipField = { label: string; value: string };

/** Only includes fields that exist on this hourly row. Never invents wind. */
export function tooltipFields(
  point: HourlyChartPoint,
  units: Units
): TooltipField[] {
  const fields: TooltipField[] = [{ label: "Time", value: point.label }];
  if (point.temperature !== null) {
    fields.push({ label: "Temperature", value: formatTemp(point.temperature) });
  }
  if (point.condition) {
    fields.push({ label: "Condition", value: point.condition });
  }
  const precip = formatPrecipAmount(point.precipitation, units);
  if (precip) {
    fields.push({ label: "Precipitation", value: precip });
  }
  return fields;
}

export function chartSummary(
  points: HourlyChartPoint[],
  metric: HourlyChartMetric,
  units: Units
): string {
  if (points.length === 0) return "No hourly evolution is available.";
  const values = points
    .map((point) => metricValue(point, metric))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return metric === "precipitation"
      ? "Precipitation amounts are not available for this window."
      : "Temperature values are not available for this window.";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (metric === "precipitation") {
    const unit = units === "imperial" ? "in" : "mm";
    return `Precipitation over ${points.length} hours ranges from ${min} to ${max} ${unit}.`;
  }
  return `Temperatures over ${points.length} hours range from ${formatTemp(min)} to ${formatTemp(max)}.`;
}
