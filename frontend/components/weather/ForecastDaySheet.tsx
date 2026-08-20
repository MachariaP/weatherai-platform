"use client";

import { useCallback, useRef } from "react";
import type { ForecastDay, HourlyForecast } from "@/lib/types";
import { HourlyChart } from "./HourlyChart";
import { HourlyScroll } from "./HourlyScroll";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatDayName,
  formatForecastDate,
  formatPrecipAmount,
  formatTemp,
  type Units,
} from "@/lib/format";
import { CloseIcon } from "@/components/ui/icons";
import { useDialogFocus } from "@/hooks/useDialogFocus";

interface Props {
  day: ForecastDay;
  hours: HourlyForecast[];
  units: Units;
  onClose: () => void;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Forecast-day detail. Desktop: right drawer. Mobile: bottom sheet.
 * Uses already-fetched hourly rows; does not request WeatherAI again.
 */
export function ForecastDaySheet({ day, hours, units, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useDialogFocus(true, panelRef, close);

  const hasDate = Boolean(day.date?.trim());
  const dayName = hasDate ? formatDayName(day.date) : "Unavailable";
  const dateLabel = hasDate ? formatForecastDate(day.date) : null;
  const description = day.weather_description?.trim() || "Conditions unavailable";
  const high = isFiniteNumber(day.temp_max) ? formatTemp(day.temp_max) : "—";
  const low = isFiniteNumber(day.temp_min) ? formatTemp(day.temp_min) : "—";
  const precip = formatPrecipAmount(day.precipitation, units);
  const titleId = "forecast-day-title";

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Dismiss forecast day"
        className="absolute inset-0 bg-background/70 motion-safe:transition-opacity"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-panel border border-border bg-surface md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[min(26rem,100%)] md:rounded-none md:rounded-l-panel motion-safe:transition-transform"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Forecast day
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-semibold text-text">
              {dayName}
              {dateLabel ? <span className="ml-2 text-sm font-normal text-text-muted">{dateLabel}</span> : null}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close forecast day"
            onClick={onClose}
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-control text-text-muted hover:text-text"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <WeatherIcon
              name={getWeatherIconName(isFiniteNumber(day.weather_code) ? day.weather_code : -1)}
              className="h-8 w-8 text-accent"
            />
            <p className="text-sm text-text-secondary">{description}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-card border border-border bg-background px-3 py-2">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-text-muted">High / low</dt>
              <dd className="mt-1 tabular-nums text-text">
                {high} / {low}
              </dd>
            </div>
            {precip ? (
              <div className="rounded-card border border-border bg-background px-3 py-2">
                <dt className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Precipitation</dt>
                <dd className="mt-1 tabular-nums text-text">{precip}</dd>
              </div>
            ) : null}
          </dl>

          {hours.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Hourly detail is not available for this day.
            </p>
          ) : (
            <>
              <HourlyChart hours={hours} units={units} range="all" />
              <HourlyScroll hours={hours} units={units} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
