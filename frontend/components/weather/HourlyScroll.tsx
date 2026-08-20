"use client";

import type { HourlyForecast } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";

interface Props {
  hours: HourlyForecast[];
  units: "metric" | "imperial";
}

function formatHour(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en", { hour: "numeric", hour12: true });
}

export function HourlyScroll({ hours, units }: Props) {
  if (hours.length === 0) return null;

  const tempUnit = units === "metric" ? "°" : "°";

  return (
    <section>
      <h2 className="text-sm font-medium text-[var(--muted)] mb-3">
        Hourly Forecast
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {hours.map((hour) => (
          <div
            key={hour.time}
            className="flex-shrink-0 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 w-20 text-center"
          >
            <p className="text-xs text-[var(--muted)] mb-1">
              {formatHour(hour.time)}
            </p>
            <p className="text-xl mb-1">
              <WeatherIcon
                name={getWeatherIconName(hour.weather_code)}
                className="h-7 w-7"
              />
            </p>
            <p className="text-sm font-medium">
              {Math.round(hour.temperature)}{tempUnit}
            </p>
            {hour.precipitation > 0 && (
              <p className="text-xs text-[var(--accent)] mt-0.5">
                {hour.precipitation}mm
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
