"use client";

import type { ReactNode } from "react";
import type { CurrentWeather as CurrentWeatherData } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatWind,
  formatWindDirection,
  formatTime,
  formatDate,
} from "@/lib/format";
import {
  WindIcon,
  CompassIcon,
  SunIcon,
  MoonIcon,
  ClockIcon,
  CheckIcon,
  MapPinIcon,
} from "@/components/ui/icons";

interface Props {
  data: CurrentWeatherData;
  units: "metric" | "imperial";
  location: string;
  cacheStatus: string | null;
}

interface DetailProps {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function Detail({ icon, label, value, sub }: DetailProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/70 p-3.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card text-text-muted">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
          {label}
        </dt>
        <dd className="truncate text-sm font-semibold text-text">{value}</dd>
        {sub && <dd className="text-xs text-text-muted">{sub}</dd>}
      </div>
    </div>
  );
}

export function CurrentWeather({ data, units, location, cacheStatus }: Props) {
  const iconName = getWeatherIconName(data.weather_code, data.is_day);
  const updatedTime = formatTime(data.observed_at);
  const updatedDate = formatDate(data.observed_at);
  const isCached = cacheStatus === "HIT";

  return (
    <section
      aria-label="Current weather"
      className="rounded-panel border border-border bg-card shadow-card"
    >
      <div className="p-5 sm:p-7">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Current location
            </p>
            <h2 className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-text">
              <MapPinIcon className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="truncate">{location}</span>
            </h2>
          </div>
          {cacheStatus && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                isCached
                  ? "border-border-strong bg-surface text-text-secondary"
                  : "border-success/25 bg-success/10 text-success"
              }`}
            >
              {isCached ? (
                <ClockIcon className="h-3.5 w-3.5" />
              ) : (
                <CheckIcon className="h-3.5 w-3.5" />
              )}
              {isCached ? "Cached" : "Live"}
            </span>
          )}
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5 sm:gap-6">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-border bg-surface sm:h-24 sm:w-24">
              <WeatherIcon
                name={iconName}
                className="h-11 w-11 text-accent sm:h-14 sm:w-14"
              />
            </div>
            <div>
              <p className="text-6xl font-extralight leading-none tabular-nums text-text sm:text-7xl">
                {Math.round(data.temperature)}
                <span className="text-3xl font-light text-text-secondary sm:text-4xl">
                  {units === "metric" ? "°C" : "°F"}
                </span>
              </p>
              <p className="mt-2 text-base font-medium capitalize text-text-secondary sm:text-lg">
                {data.weather_description}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {data.is_day ? "Daytime" : "Night"}
              </p>
            </div>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-3 lg:max-w-xl">
            <Detail
              icon={<WindIcon className="h-4 w-4" />}
              label="Wind"
              value={formatWind(data.wind_speed, units)}
              sub={`From ${formatWindDirection(data.wind_direction)}`}
            />
            <Detail
              icon={<CompassIcon className="h-4 w-4" />}
              label="Direction"
              value={formatWindDirection(data.wind_direction)}
              sub={`${Math.round(data.wind_direction)}°`}
            />
            <Detail
              icon={data.is_day ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              label="Conditions"
              value={data.is_day ? "Day" : "Night"}
            />
            <Detail
              icon={<ClockIcon className="h-4 w-4" />}
              label="Updated"
              value={updatedTime ?? "—"}
              sub={updatedDate ?? undefined}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}