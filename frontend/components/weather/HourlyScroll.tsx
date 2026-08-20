"use client";

import type { HourlyForecast } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import { formatHour, formatPrecip, isCurrentHour } from "@/lib/format";
import { DropletIcon } from "@/components/ui/icons";

interface Props {
  hours: HourlyForecast[];
}

export function HourlyScroll({ hours }: Props) {
  if (hours.length === 0) return null;

  return (
    <section aria-label="Hourly forecast">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        Hourly forecast
      </h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scroll-slim sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:pb-0">
        {hours.map((hour) => {
          const now = isCurrentHour(hour.time);
          const precip = formatPrecip(hour.precipitation);
          return (
            <div
              key={hour.time}
              className={`w-24 shrink-0 rounded-card border p-3 text-center transition-colors ${
                now ? "border-accent/40 bg-accent/5" : "border-border bg-card"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wide ${
                  now ? "text-accent" : "text-text-muted"
                }`}
              >
                {now ? "Now" : formatHour(hour.time)}
              </p>
              <div className="my-2.5 grid place-items-center">
                <WeatherIcon
                  name={getWeatherIconName(hour.weather_code)}
                  className={`h-7 w-7 ${
                    now ? "text-accent" : "text-text-secondary"
                  }`}
                />
              </div>
              <p className="text-base font-semibold tabular-nums text-text">
                {Math.round(hour.temperature)}°
              </p>
              {precip && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                  <DropletIcon className="h-3 w-3" />
                  {precip}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}