"use client";

import type { KeyboardEvent } from "react";
import type { HourlyForecast } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatHour,
  formatPrecip,
  formatTemp,
  isCurrentHour,
  type Units,
} from "@/lib/format";
import { DropletIcon } from "@/components/ui/icons";

interface Props {
  hours: HourlyForecast[] | null | undefined;
  units: Units;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function handleScrollKeys(e: KeyboardEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const step = 108;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    el.scrollBy({ left: step, behavior: "smooth" });
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    el.scrollBy({ left: -step, behavior: "smooth" });
  } else if (e.key === "Home") {
    e.preventDefault();
    el.scrollTo({ left: 0, behavior: "smooth" });
  } else if (e.key === "End") {
    e.preventDefault();
    el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }
}

function hourLabel(time: string | undefined): string {
  if (!time?.trim()) return "Unavailable";
  return isCurrentHour(time) ? "Now" : formatHour(time);
}

/**
 * Horizontally scrollable hourly outlook from FastAPI `hourly`.
 * Keyboard: focus the list, then ArrowLeft/ArrowRight, Home, and End.
 */
export function HourlyScroll({ hours, units }: Props) {
  const rows = Array.isArray(hours) ? hours : [];

  return (
    <section aria-label="Hourly forecast">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        Hourly forecast
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-card border border-border bg-card px-4 py-3 text-sm text-text-secondary">
          Hourly forecast is not available.
        </p>
      ) : (
        <div
          role="list"
          tabIndex={0}
          aria-label="Hourly forecast times"
          onKeyDown={handleScrollKeys}
          className="focus-ring -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scroll-slim sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:pb-0"
        >
          {rows.map((hour, index) => {
            const now = Boolean(hour.time?.trim()) && isCurrentHour(hour.time);
            const precip = isFiniteNumber(hour.precipitation)
              ? formatPrecip(hour.precipitation, units)
              : "";
            const description =
              hour.weather_description?.trim() || "Conditions unavailable";
            const temperature = isFiniteNumber(hour.temperature)
              ? formatTemp(hour.temperature)
              : "—";
            const timeLabel = hourLabel(hour.time);

            return (
              <article
                role="listitem"
                key={hour.time?.trim() ? hour.time : `hour-${index}`}
                aria-label={`${timeLabel}: ${description}, ${temperature}${precip ? `, ${precip}` : ""}`}
                className={`w-24 shrink-0 rounded-card border p-3 text-center transition-colors ${
                  now ? "border-accent/30 bg-accent/5" : "border-border bg-card"
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    now ? "text-accent" : "text-text-muted"
                  }`}
                >
                  {timeLabel}
                </p>
                <div className="my-2.5 grid place-items-center">
                  <WeatherIcon
                    name={getWeatherIconName(
                      isFiniteNumber(hour.weather_code) ? hour.weather_code : -1
                    )}
                    className={`h-7 w-7 ${
                      now ? "text-accent" : "text-text-secondary"
                    }`}
                  />
                </div>
                <p className="truncate text-[10px] capitalize text-text-secondary">
                  {description}
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums text-text">
                  {temperature}
                </p>
                {precip ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                    <DropletIcon className="h-3 w-3" />
                    {precip}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
