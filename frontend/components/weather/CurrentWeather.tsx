"use client";

import type { ReactNode } from "react";
import type { CurrentWeather as CurrentWeatherData } from "@/lib/types";
import { WeatherIcon, getWeatherIconName } from "@/lib/weather-icons";
import {
  formatWind,
  formatWindDirection,
  formatPrecipAmount,
  formatLatLon,
  formatTemp,
  uvBand,
} from "@/lib/format";
import {
  WindIcon,
  DropletIcon,
  HumidityIcon,
  SunIcon,
  GaugeIcon,
  MapPinIcon,
} from "@/components/ui/icons";

interface Props {
  data: CurrentWeatherData;
  units: "metric" | "imperial";
  location: string;
  cacheStatus?: string | null;
  lat?: number | null;
  lon?: number | null;
  actions?: ReactNode;
}

interface DetailProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  extra?: ReactNode;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatTemperature(value: unknown): string {
  if (!isFiniteNumber(value)) return "Unavailable";
  return String(Math.round(value));
}

function Detail({ icon, label, value, sub, extra }: DetailProps) {
  return (
    <div className="flex min-h-[7.5rem] flex-col justify-between rounded-card border border-border/70 bg-card p-4">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-text-secondary">
        <span className="text-text-muted">{icon}</span>
        {label}
      </dt>
      <dd>
        <p className="truncate text-xl font-semibold tabular-nums text-text">{value}</p>
        {sub ? <p className="mt-1 text-xs text-text-secondary">{sub}</p> : null}
        {extra}
      </dd>
    </div>
  );
}

/**
 * Current conditions from the FastAPI public contract.
 *
 * Optional extras (feels-like, humidity, UV, pressure, 24h precip) render
 * only when the backend sent a finite value. Missing tiles stay out of the DOM.
 */
export function CurrentWeather({
  data,
  units,
  location,
  lat = null,
  lon = null,
  actions,
}: Props) {
  const isDay = data.is_day === true;
  const iconName = getWeatherIconName(
    isFiniteNumber(data.weather_code) ? data.weather_code : -1,
    isDay
  );
  const description = data.weather_description?.trim() || "Conditions unavailable";
  const temperature = formatTemperature(data.temperature);
  const hasTemp = temperature !== "Unavailable";
  const windValue = isFiniteNumber(data.wind_speed)
    ? formatWind(data.wind_speed, units)
    : "Unavailable";
  const hasDirection = isFiniteNumber(data.wind_direction);
  const compass = hasDirection ? formatWindDirection(data.wind_direction) : null;
  const precision = lat != null && lon != null ? formatLatLon(lat, lon) : null;
  const feelsLike = isFiniteNumber(data.feels_like) ? formatTemp(data.feels_like) : null;
  const precip24h = isFiniteNumber(data.precip_last_24h) ? data.precip_last_24h : null;
  const humidity = isFiniteNumber(data.humidity) ? data.humidity : null;
  const uv = isFiniteNumber(data.uv_index) ? data.uv_index : null;
  const pressure = isFiniteNumber(data.pressure) ? data.pressure : null;

  return (
    <section aria-label="Current weather">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[32px] sm:leading-10">
            {location || "Unknown location"}
          </h1>
          {actions}
        </div>
        {precision ? (
          <p className="mt-1 flex items-center gap-1 font-medium tracking-wide text-text-muted">
            <MapPinIcon className="h-4 w-4 shrink-0" />
            <span className="text-sm">{precision}</span>
          </p>
        ) : null}
      </header>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(14rem,1fr)] md:gap-4">
        <div className="relative min-h-[200px] overflow-hidden rounded-card border border-border bg-surface p-4 sm:p-5">
          <div className="relative z-10 mb-6 flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-secondary">
              Current conditions
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-end gap-3">
            <p
              key={temperature}
              className="wx-in text-[72px] font-bold leading-[80px] tracking-[-0.02em] tabular-nums text-text motion-reduce:animate-none"
            >
              {hasTemp ? `${temperature}°` : temperature}
            </p>
            <div className="mb-2 min-w-0">
              <p
                key={description}
                className="wx-in flex items-center gap-1 text-xl font-semibold capitalize text-accent motion-reduce:animate-none"
              >
                <WeatherIcon name={iconName} animated className="h-6 w-6" />
                {description}
              </p>
              {feelsLike ? (
                <p className="mt-0.5 text-sm text-text-muted">Feels like {feelsLike}</p>
              ) : null}
              <p className="mt-0.5 text-xs text-text-muted">
                {units === "metric" ? "°C" : "°F"} · {isDay ? "Daytime" : "Night"}
              </p>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Detail
            icon={<WindIcon className="h-4 w-4" />}
            label="Wind"
            value={
              isFiniteNumber(data.wind_speed) ? (
                <>
                  {Math.round(data.wind_speed)}{" "}
                  <span className="text-sm font-normal text-text-muted">
                    {units === "metric" ? "km/h" : "mph"}
                  </span>
                </>
              ) : (
                windValue
              )
            }
            sub={compass ? `Direction: ${compass}` : undefined}
          />
          {precip24h !== null ? (
            <Detail
              icon={<DropletIcon className="h-4 w-4" />}
              label="Precipitation"
              value={formatPrecipAmount(precip24h, units) ?? "Unavailable"}
              sub="In last 24h"
            />
          ) : null}
          {humidity !== null ? (
            <Detail
              icon={<HumidityIcon className="h-4 w-4" />}
              label="Humidity"
              value={`${Math.round(humidity)}%`}
              extra={
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, Math.max(0, humidity))}%` }}
                  />
                </div>
              }
            />
          ) : null}
          {uv !== null ? (
            <Detail
              icon={<SunIcon className="h-4 w-4" />}
              label="UV index"
              value={
                <>
                  {Math.round(uv)}{" "}
                  <span className="ml-1 rounded border border-warning/30 bg-warning/10 px-1 text-[12px] font-normal text-warning">
                    {uvBand(uv)}
                  </span>
                </>
              }
            />
          ) : null}
          {pressure !== null ? (
            <Detail
              icon={<GaugeIcon className="h-4 w-4" />}
              label="Pressure"
              value={
                <>
                  {Math.round(pressure)}{" "}
                  <span className="text-sm font-normal text-text-muted">hPa</span>
                </>
              }
            />
          ) : null}
        </dl>
      </div>
    </section>
  );
}
