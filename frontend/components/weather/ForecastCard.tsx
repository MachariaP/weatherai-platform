"use client";

import type { ForecastDay } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatDayName,
  formatForecastDate,
  formatTemp,
  type Units,
} from "@/lib/format";

interface Props {
  day: ForecastDay;
  units: Units;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function tempLabel(value: unknown): string {
  return isFiniteNumber(value) ? formatTemp(value) : "—";
}

/**
 * One day from FastAPI ForecastDay. High/low only — no invented extras.
 */
export function ForecastCard({ day }: Props) {
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

  return (
    <article
      className={`relative flex items-center justify-between px-4 py-2 ${
        isToday ? "bg-accent/5" : ""
      }`}
      aria-label={`${dayName}${dateLabel ? `, ${dateLabel}` : ""}: ${description}, high ${high}, low ${low}`}
    >
      {isToday ? (
        <span
          aria-hidden="true"
          className="absolute left-0 hidden h-full w-1 rounded-r-full bg-accent lg:block"
        />
      ) : null}
      <p
        className={`w-12 shrink-0 text-sm font-medium ${
          isToday ? "text-accent" : "text-text-secondary"
        }`}
      >
        {dayName}
      </p>
      <div className="flex flex-1 items-center justify-center">
        <WeatherIcon
          name={iconName}
          className={`h-5 w-5 ${isToday ? "text-accent" : "text-text-secondary"}`}
        />
      </div>
      <p className="sr-only">{description}</p>
      <p className="flex w-24 shrink-0 items-center justify-end gap-2 text-sm tabular-nums">
        <span className="text-text">{high}</span>
        <span className="text-text-muted">{low}</span>
      </p>
    </article>
  );
}
