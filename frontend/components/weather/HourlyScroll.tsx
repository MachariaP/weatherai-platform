"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import type { HourlyForecast } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatHourlyClock,
  formatPrecipAmount,
  formatTemp,
  isCurrentHour,
  type Units,
} from "@/lib/format";

interface Props {
  hours: HourlyForecast[] | null | undefined;
  units: Units;
  selectedTime?: string | null;
  onSelectTime?: (time: string) => void;
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
  return isCurrentHour(time) ? "Now" : formatHourlyClock(time);
}

function alignNowCard(list: HTMLElement, card: HTMLElement) {
  const delta =
    card.getBoundingClientRect().left - list.getBoundingClientRect().left;
  list.scrollLeft = Math.max(0, list.scrollLeft + delta);
}

/**
 * Horizontally scrollable hourly outlook.
 * Dashboard exploration passes the shared next-24 window; day drill-down
 * still passes that day's hours. "Now" is only the actual current hour.
 * Precipitation is an amount (never a percent), shown only when finite.
 * On load and when `hours` is replaced (refresh), the current hour is
 * aligned to the start of the visible strip.
 */
export function HourlyScroll({ hours, units, selectedTime = null, onSelectTime }: Props) {
  const rows = Array.isArray(hours) ? hours : [];
  const listRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLElement>(null);
  const selectedRef = useRef<HTMLElement>(null);
  const skipSelectScroll = useRef(true);
  const nowIndex = rows.findIndex(
    (hour) => Boolean(hour.time?.trim()) && isCurrentHour(hour.time)
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    const card = nowRef.current;
    if (!list || !card) return;
    alignNowCard(list, card);
    skipSelectScroll.current = true;
  }, [hours]);

  useLayoutEffect(() => {
    if (skipSelectScroll.current) {
      skipSelectScroll.current = false;
      return;
    }
    const card = selectedRef.current;
    const list = listRef.current;
    if (!card || !list || !selectedTime) return;
    const delta =
      card.getBoundingClientRect().left - list.getBoundingClientRect().left;
    list.scrollLeft += delta - 8;
  }, [selectedTime]);

  return (
    <section aria-label="Hourly forecast" className="min-w-0 max-w-full">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        Hourly outlook
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          Hourly forecast is not available.
        </p>
      ) : (
        <div
          ref={listRef}
          role="list"
          tabIndex={0}
          aria-label="Hourly forecast times"
          onKeyDown={handleScrollKeys}
          className="focus-ring -mx-4 w-[calc(100%+2rem)] min-w-0 overflow-x-auto px-4 pb-2 scroll-slim sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 md:mx-0 md:w-full md:px-0 md:pb-0 flex gap-4"
        >
          {rows.map((hour, index) => {
            const now = index === nowIndex;
            const timeKey = hour.time?.trim() ?? "";
            const selected = Boolean(timeKey) && timeKey === selectedTime;
            const description =
              hour.weather_description?.trim() || "Conditions unavailable";
            const temperature = isFiniteNumber(hour.temperature)
              ? formatTemp(hour.temperature)
              : "—";
            const timeLabel = hourLabel(hour.time);
            const precip = formatPrecipAmount(hour.precipitation, units);
            const precipLabel = precip ? `, ${precip}` : "";
            const cardClass = `flex w-20 shrink-0 flex-col items-center rounded-card border px-2 py-3 text-center motion-safe:transition-colors ${
              selected
                ? "border-accent/50 bg-accent/10"
                : now
                  ? "border-accent/40 bg-surface"
                  : "border-border bg-surface"
            }`;
            const body = (
              <>
                <p
                  className={`text-[11px] font-semibold tracking-wide ${
                    selected || now ? "text-accent" : "text-text-muted"
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
                      selected || now ? "text-accent" : "text-text-secondary"
                    }`}
                  />
                </div>
                <p className="sr-only">{description}</p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    selected || now ? "text-accent" : "text-text"
                  }`}
                >
                  {temperature}
                </p>
                <p className="mt-1 min-h-[1rem] text-[11px] tabular-nums text-text-muted">
                  {precip ?? ""}
                </p>
              </>
            );

            return (
              <article
                ref={(node) => {
                  if (now) nowRef.current = node;
                  if (selected) selectedRef.current = node;
                }}
                role="listitem"
                key={timeKey || `hour-${index}`}
                aria-current={now ? "true" : undefined}
                aria-label={onSelectTime ? undefined : `${timeLabel}: ${description}, ${temperature}${precipLabel}`}
                className={onSelectTime ? undefined : cardClass}
              >
                {onSelectTime && timeKey ? (
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${timeLabel}: ${description}, ${temperature}${precipLabel}`}
                    onClick={() => onSelectTime(timeKey)}
                    className={`focus-ring ${cardClass}`}
                  >
                    {body}
                  </button>
                ) : (
                  body
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
