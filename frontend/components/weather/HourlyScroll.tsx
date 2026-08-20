"use client";

import type { KeyboardEvent } from "react";
import type { HourlyForecast } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatHour24,
  formatPrecipAmount,
  formatTemp,
  isCurrentHour,
  type Units,
} from "@/lib/format";

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
  return isCurrentHour(time) ? "Now" : formatHour24(time);
}

/**
 * Horizontally scrollable hourly outlook from FastAPI `hourly`.
 * Precipitation is an amount (never a percent), shown only when finite.
 */
export function HourlyScroll({ hours, units }: Props) {
  const rows = Array.isArray(hours) ? hours : [];

  return (
    <section aria-label="Hourly forecast">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        Hourly outlook
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          Hourly forecast is not available.
        </p>
      ) : (
        <div
          role="list"
          tabIndex={0}
          aria-label="Hourly forecast times"
          onKeyDown={handleScrollKeys}
          className="focus-ring -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scroll-slim sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:pb-0"
        >
          {rows.map((hour, index) => {
            const now = Boolean(hour.time?.trim()) && isCurrentHour(hour.time);
            const description =
              hour.weather_description?.trim() || "Conditions unavailable";
            const temperature = isFiniteNumber(hour.temperature)
              ? formatTemp(hour.temperature)
              : "—";
            const timeLabel = hourLabel(hour.time);
            const precip = formatPrecipAmount(hour.precipitation, units);
            const precipLabel = precip ? `, ${precip}` : "";

            return (
              <article
                role="listitem"
                key={hour.time?.trim() ? hour.time : `hour-${index}`}
                aria-label={`${timeLabel}: ${description}, ${temperature}${precipLabel}`}
                className={`flex w-20 shrink-0 flex-col items-center rounded-card border px-2 py-3 text-center ${
                  now ? "border-accent/40 bg-surface" : "border-border bg-surface"
                }`}
              >
                <p
                  className={`text-[11px] font-semibold tracking-wide ${
                    now ? "text-accent" : "text-text-muted"
                  }`}
                >
                  {timeLabel}
                </p>
                <div className="my-2 grid place-items-center">
                  <WeatherIcon
                    name={getWeatherIconName(
                      isFiniteNumber(hour.weather_code) ? hour.weather_code : -1
                    )}
                    className={`h-6 w-6 ${
                      now ? "text-accent" : "text-text-secondary"
                    }`}
                  />
                </div>
                <p className="sr-only">{description}</p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    now ? "text-accent" : "text-text"
                  }`}
                >
                  {temperature}
                </p>
                <p className="mt-1 min-h-[1rem] text-[11px] tabular-nums text-text-muted">
                  {precip ?? ""}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
