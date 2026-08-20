"use client";

import type { ForecastDay } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatDayName,
  formatForecastDate,
  formatPrecip,
  formatTemp,
  type Units,
} from "@/lib/format";
import { DropletIcon } from "@/components/ui/icons";

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
 * One day from FastAPI ForecastDay. Does not invent feels-like or
 * other fields that are not on the public contract.
 */
export function ForecastCard({ day, units }: Props) {
  const iconName = getWeatherIconName(
    isFiniteNumber(day.weather_code) ? day.weather_code : -1
  );
  const hasDate = Boolean(day.date?.trim());
  const dayName = hasDate ? formatDayName(day.date) : "Unavailable";
  const dateLabel = hasDate ? formatForecastDate(day.date) : null;
  const isToday = dayName === "Today";
  const description = day.weather_description?.trim() || "Conditions unavailable";
  const precip = isFiniteNumber(day.precipitation)
    ? formatPrecip(day.precipitation, units)
    : "";
  const high = tempLabel(day.temp_max);
  const low = tempLabel(day.temp_min);

  return (
    <article
      className={`w-28 shrink-0 rounded-card border p-3.5 text-center transition-colors md:w-auto ${
        isToday
          ? "border-accent/30 bg-accent/5"
          : "border-border bg-card hover:bg-card-hover"
      }`}
      aria-label={`${dayName}${dateLabel ? `, ${dateLabel}` : ""}: ${description}, high ${high}, low ${low}${precip ? `, ${precip}` : ""}`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          isToday ? "text-accent" : "text-text-muted"
        }`}
      >
        {dayName}
      </p>
      {dateLabel ? (
        <p className="mt-0.5 text-[11px] text-text-muted">{dateLabel}</p>
      ) : null}
      <div className="my-3 grid place-items-center">
        <WeatherIcon
          name={iconName}
          className={`h-8 w-8 ${
            isToday ? "text-accent" : "text-text-secondary"
          }`}
        />
      </div>
      <p className="truncate text-[11px] capitalize text-text-secondary">
        {description}
      </p>
      <p className="mt-1.5 text-sm font-semibold tabular-nums text-text">
        {high}
        <span className="font-medium text-text-muted"> / {low}</span>
      </p>
      {precip ? (
        <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
          <DropletIcon className="h-3 w-3" />
          {precip}
        </p>
      ) : null}
    </article>
  );
}
