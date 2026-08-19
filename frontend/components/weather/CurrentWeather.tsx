"use client";

import type { CurrentWeather as CurrentWeatherData } from "@/lib/types";
import { getWeatherIcon } from "@/lib/weather-icons";

interface Props {
  data: CurrentWeatherData;
  units: "metric" | "imperial";
  location: string;
  cacheStatus: string | null;
}

export function CurrentWeather({ data, units, location, cacheStatus }: Props) {
  const tempUnit = units === "metric" ? "°C" : "°F";
  const windUnit = units === "metric" ? "km/h" : "mph";
  const icon = getWeatherIcon(data.weather_code, data.is_day);

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-[var(--muted)]">{location}</p>
          {data.observed_at && (
            <p className="text-xs text-[var(--muted)]">
              Updated: {data.observed_at}
            </p>
          )}
        </div>
        {cacheStatus && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              cacheStatus === "HIT"
                ? "bg-[var(--success)]/20 text-[var(--success)]"
                : "bg-[var(--accent)]/20 text-[var(--accent)]"
            }`}
          >
            Cache: {cacheStatus}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <span className="text-6xl">{icon}</span>
        <div>
          <p className="text-5xl font-light tabular-nums">
            {Math.round(data.temperature)}
            <span className="text-2xl text-[var(--muted)]">{tempUnit}</span>
          </p>
          <p className="text-[var(--muted)] mt-1">{data.weather_description}</p>
        </div>
      </div>

      <div className="flex gap-6 text-sm text-[var(--muted)]">
        <span>💨 {data.wind_speed} {windUnit}</span>
        <span>🧭 {data.wind_direction}°</span>
        <span>{data.is_day ? "☀️ Day" : "🌙 Night"}</span>
      </div>
    </div>
  );
}
