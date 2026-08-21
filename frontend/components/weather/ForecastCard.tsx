"use client";

import type { ForecastDay } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatDayName,
  formatForecastDate,
  formatPrecipAmount,
  formatTemp,
  type Units,
} from "@/lib/format";

interface Props {
  day: ForecastDay;
  units: Units;
  selected?: boolean;
  onSelect?: () => void;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function tempLabel(value: unknown): string {
  return isFiniteNumber(value) ? formatTemp(value) : "—";
}

/**
 * One day from FastAPI ForecastDay. Precipitation is an amount, shown only
 * when FastAPI sent a finite value (including verified zero).
 */
export function ForecastCard({ day, units, selected = false, onSelect }: Props) {
  const iconName = getWeatherIconName(
    isFiniteNumber(day.weather_code) ? day.weather_code : -1
  );
  const hasDate = Boolean(day.date?.trim());
  const dayName = hasDate ? formatDayName(day.date) : "Unavailable";
  const dateLabel = hasDate ? formatForecastDate(day.date) : null;
  const isToday = dayName === "Today";
  const description = day.weather_description?.trim() || "Conditions unavailable";
  const high = tempLabel(day.temp_max);
  const low = tempLabel(day.temp_min);
  const precip = formatPrecipAmount(day.precipitation, units);
  const precipLabel = precip ? `, ${precip}` : "";
  const label = `${dayName}${dateLabel ? `, ${dateLabel}` : ""}: ${description}, high ${high}, low ${low}${precipLabel}`;

  const body = (
    <>
      {isToday ? (
        <span
          aria-hidden="true"
          className="absolute left-0 h-full w-1 rounded-r-full bg-accent"
        />
      ) : null}
      <p
        className={`w-12 shrink-0 text-sm font-medium ${
          isToday || selected ? "text-accent" : "text-text-secondary"
        }`}
      >
        {dayName}
      </p>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <WeatherIcon
          name={iconName}
          className={`h-5 w-5 shrink-0 ${
            isToday || selected ? "text-accent" : "text-text-secondary"
          }`}
        />
        <p className="min-w-0 flex-1 break-words text-left text-xs leading-snug text-text-secondary line-clamp-2">
          {description}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="flex items-center justify-end gap-2 text-sm tabular-nums">
          <span className="text-text">{high}</span>
          <span className="text-text-muted">{low}</span>
        </p>
        {precip ? (
          <p className="mt-0.5 text-[11px] tabular-nums text-text-muted">{precip}</p>
        ) : null}
      </div>
    </>
  );

  const selectedClass = selected ? "bg-accent/10 ring-1 ring-inset ring-accent/40" : isToday ? "bg-accent/5" : "";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={label}
        className={`focus-ring relative flex w-full items-center justify-between gap-3 px-4 py-2 text-left motion-safe:transition-colors hover:bg-accent/5 ${selectedClass}`}
      >
        {body}
      </button>
    );
  }

  return (
    <article
      className={`relative flex items-center justify-between gap-3 px-4 py-2 ${selectedClass}`}
      aria-label={label}
    >
      {body}
    </article>
  );
}
