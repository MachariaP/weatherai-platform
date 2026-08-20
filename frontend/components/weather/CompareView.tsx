"use client";

import { useMemo, useState } from "react";
import { useLocation, type Location } from "@/components/providers/LocationProvider";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useAppView } from "@/components/providers/ViewProvider";
import { COMPARE_MAX, useCompareWeather, type CompareSlot } from "@/hooks/useCompareWeather";
import { coordKey, sameCoords } from "@/lib/stored-locations";
import {
  formatPrecipAmount,
  formatTemp,
  formatWind,
  type Units,
} from "@/lib/format";
import { userFacingError } from "@/lib/user-error";
import { StarIcon } from "@/components/ui/icons";
import type { WeatherResponse } from "@/lib/types";

const COMPARE_DAYS = 3;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toggleLocation(current: Location[], next: Location): Location[] {
  const exists = current.some((item) => sameCoords(item, next));
  if (exists) return current.filter((item) => !sameCoords(item, next));
  if (current.length >= COMPARE_MAX) return current;
  return [...current, next];
}

function todayHighLow(data: WeatherResponse): string | null {
  const day = data.daily?.[0];
  if (!day) return null;
  if (!isFiniteNumber(day.temp_max) || !isFiniteNumber(day.temp_min)) return null;
  return `${formatTemp(day.temp_max)} / ${formatTemp(day.temp_min)}`;
}

function dailyPrecip(data: WeatherResponse, units: Units): string | null {
  const day = data.daily?.[0];
  if (!day) return null;
  return formatPrecipAmount(day.precipitation, units);
}

function windLabel(data: WeatherResponse, units: Units): string | null {
  const speed = data.current?.wind_speed;
  if (!isFiniteNumber(speed)) return null;
  return formatWind(speed, units);
}

function outlook(data: WeatherResponse): string | null {
  const days = Array.isArray(data.daily) ? data.daily.slice(0, 3) : [];
  const parts = days
    .map((day) => day.weather_description?.trim())
    .filter((text): text is string => Boolean(text));
  return parts.length > 0 ? parts.join(" → ") : null;
}

type RowKey = "temperature" | "condition" | "range" | "wind" | "precip" | "outlook";

function rowValue(slot: CompareSlot, key: RowKey, units: Units): string | null {
  const data = slot.data;
  if (!data?.current) return null;
  switch (key) {
    case "temperature":
      return isFiniteNumber(data.current.temperature)
        ? formatTemp(data.current.temperature)
        : null;
    case "condition":
      return data.current.weather_description?.trim() || null;
    case "range":
      return todayHighLow(data);
    case "wind":
      return windLabel(data, units);
    case "precip":
      return dailyPrecip(data, units);
    case "outlook":
      return outlook(data);
    default:
      return null;
  }
}

const ROWS: { key: RowKey; label: string }[] = [
  { key: "temperature", label: "Now" },
  { key: "condition", label: "Condition" },
  { key: "range", label: "High / low" },
  { key: "wind", label: "Wind" },
  { key: "precip", label: "Precipitation" },
  { key: "outlook", label: "Outlook" },
];

function CompareCard({ slot, units }: { slot: CompareSlot; units: Units }) {
  const loading = slot.status === "loading" && !slot.data;
  const failed = slot.status === "error" && !slot.data;
  const live = userFacingError(
    slot.error ?? { error: "unknown", message: "Weather unavailable" }
  );

  return (
    <article
      aria-labelledby={`compare-${slot.key}`}
      aria-busy={slot.status === "loading"}
      className="min-h-[16rem] rounded-card border border-border bg-surface p-4 motion-safe:transition-opacity"
    >
      <h2 id={`compare-${slot.key}`} className="text-base font-semibold text-text">
        {slot.location.label}
      </h2>
      {loading ? (
        <p className="mt-3 text-sm text-text-muted" role="status">
          Loading weather
        </p>
      ) : null}
      {failed ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {live.title}. {live.body}
        </p>
      ) : null}
      {slot.status === "error" && slot.data ? (
        <p className="mt-2 text-xs text-warning" role="status">
          Latest refresh failed. Showing the last loaded values.
        </p>
      ) : null}
      {slot.data?.current ? (
        <dl className="mt-4 space-y-3">
          {ROWS.map((row) => {
            const value = rowValue(slot, row.key, units);
            if (!value) return null;
            return (
              <div key={row.key} className="flex items-start justify-between gap-3 text-sm">
                <dt className="text-text-muted">{row.label}</dt>
                <dd className="max-w-[60%] text-right tabular-nums text-text">{value}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </article>
  );
}

export function CompareView() {
  const { favorites } = useLocation();
  const { units } = usePreferences();
  const { setView } = useAppView();
  const [selected, setSelected] = useState<Location[]>([]);
  const slots = useCompareWeather(selected, units, COMPARE_DAYS);

  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => coordKey(item.lat, item.lon))),
    [selected]
  );

  return (
    <section aria-label="Compare saved places" className="space-y-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Compare places</h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Weather is fetched only for the places you select here (up to {COMPARE_MAX}).
            AI summaries are not requested.
          </p>
        </div>
        <button
          type="button"
          className="focus-ring h-10 rounded-control border border-border px-3 text-sm text-text-secondary hover:text-text"
          onClick={() => setView("dashboard")}
        >
          Back to dashboard
        </button>
      </div>

      {favorites.length < 2 ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          Save at least two places to compare them.
        </p>
      ) : (
        <div>
          <p id="compare-pick-label" className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Choose two saved places
          </p>
          <ul
            aria-labelledby="compare-pick-label"
            className="flex flex-wrap gap-2"
          >
            {favorites.map((item) => {
              const key = coordKey(item.lat, item.lon);
              const on = selectedKeys.has(key);
              const blocked = !on && selected.length >= COMPARE_MAX;
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={blocked}
                    onClick={() => setSelected((prev) => toggleLocation(prev, item))}
                    className={`focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-control border px-3 text-sm motion-safe:transition-colors ${
                      on
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-border bg-surface text-text-secondary hover:text-text disabled:opacity-40"
                    }`}
                  >
                    <StarIcon className="h-3.5 w-3.5" filled={on} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selected.length === 0 ? (
        <p className="text-sm text-text-muted">Select places above to load a comparison.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {slots.map((slot) => (
            <CompareCard key={slot.key} slot={slot} units={units} />
          ))}
        </div>
      )}
    </section>
  );
}
