"use client";

import type { ForecastDay } from "@/lib/types";
import { getWeatherIcon } from "@/lib/weather-icons";

interface Props {
  day: ForecastDay;
  units: "metric" | "imperial";
}

function formatDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en", { weekday: "short" });
}

export function ForecastCard({ day, units }: Props) {
  const tempUnit = units === "metric" ? "°" : "°";
  const icon = getWeatherIcon(day.weather_code);

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
      <p className="text-xs font-medium text-[var(--muted)] mb-2">
        {formatDayName(day.date)}
      </p>
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm font-medium">
        {Math.round(day.temp_max)}{tempUnit}{" "}
        <span className="text-[var(--muted)]">
          {Math.round(day.temp_min)}{tempUnit}
        </span>
      </p>
      {day.precipitation > 0 && (
        <p className="text-xs text-[var(--accent)] mt-1">
          💧 {day.precipitation}mm
        </p>
      )}
    </div>
  );
}
