"use client";

import type { ForecastDay } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import { formatDayName, formatPrecip } from "@/lib/format";
import { DropletIcon } from "@/components/ui/icons";

interface Props {
  day: ForecastDay;
}

export function ForecastCard({ day }: Props) {
  const iconName = getWeatherIconName(day.weather_code);
  const dayName = formatDayName(day.date);
  const isToday = dayName === "Today";
  const precip = formatPrecip(day.precipitation);

  return (
    <div
      className={`w-28 shrink-0 rounded-card border p-3.5 text-center transition-colors md:w-auto ${
        isToday
          ? "border-accent/40 bg-accent/5 shadow-glow"
          : "border-border bg-card hover:bg-card-hover"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          isToday ? "text-accent" : "text-text-muted"
        }`}
      >
        {dayName}
      </p>
      <div className="my-3 grid place-items-center">
        <WeatherIcon
          name={iconName}
          className={`h-8 w-8 ${
            isToday ? "text-accent" : "text-text-secondary"
          }`}
        />
      </div>
      <p className="text-sm font-semibold tabular-nums text-text">
        {Math.round(day.temp_max)}°
        <span className="font-medium text-text-muted">
          {" "}
          / {Math.round(day.temp_min)}°
        </span>
      </p>
      {precip && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
          <DropletIcon className="h-3 w-3" />
          {precip}
        </p>
      )}
    </div>
  );
}