"use client";

import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { HourlyForecast } from "@/lib/types";
import {
  chartSummary,
  metricValue,
  nextHourlyWindow,
  precipitationAvailable,
  toChartPoints,
  tooltipFields,
  type HourlyChartMetric,
} from "@/lib/hourly-chart";
import { formatPrecipAmount, formatTemp, type Units } from "@/lib/format";

interface Props {
  hours: HourlyForecast[] | null | undefined;
  units: Units;
  /** Dashboard default: next 24 hours from now. Drill-down: all provided hours. */
  range?: "next24" | "all";
}

const VIEW_W = 640;
const VIEW_H = 168;
const PAD = { top: 18, right: 16, bottom: 28, left: 40 };

function finiteValues(values: Array<number | null>): number[] {
  return values.filter((value): value is number => value !== null);
}

function yFor(value: number, min: number, max: number): number {
  const innerH = VIEW_H - PAD.top - PAD.bottom;
  if (max === min) return PAD.top + innerH / 2;
  return PAD.top + ((max - value) / (max - min)) * innerH;
}

function xFor(index: number, count: number): number {
  const innerW = VIEW_W - PAD.left - PAD.right;
  if (count <= 1) return PAD.left + innerW / 2;
  return PAD.left + (index / (count - 1)) * innerW;
}

function nearestIndex(clientX: number, svg: SVGSVGElement, count: number): number {
  if (count <= 1) return 0;
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const ratio = (clientX - rect.left) / rect.width;
  const x = ratio * VIEW_W;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < count; i += 1) {
    const dist = Math.abs(xFor(i, count) - x);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * Custom SVG chart (no chart library). Temperature is the default metric.
 * Precipitation is offered only when at least one finite amount exists.
 * Hourly wind is not on the public contract, so it is not a tab.
 */
export function HourlyChart({ hours, units, range = "next24" }: Props) {
  const windowHours = useMemo(() => {
    if (range === "all") {
      return Array.isArray(hours)
        ? hours.filter((hour) => Boolean(hour.time?.trim()))
        : [];
    }
    return nextHourlyWindow(hours);
  }, [hours, range]);
  const points = useMemo(() => toChartPoints(windowHours), [windowHours]);
  const precipOk = precipitationAvailable(windowHours);
  const [metric, setMetric] = useState<HourlyChartMetric>("temperature");
  const [active, setActive] = useState<number | null>(null);

  const shownMetric: HourlyChartMetric =
    metric === "precipitation" && !precipOk ? "temperature" : metric;

  const values = points.map((point) => metricValue(point, shownMetric));
  const numeric = finiteValues(values);
  const min = numeric.length ? Math.min(...numeric) : 0;
  const max = numeric.length ? Math.max(...numeric) : 1;
  const pad = shownMetric === "precipitation" ? 0 : Math.max((max - min) * 0.12, 0.5);
  const yMin = shownMetric === "precipitation" ? 0 : min - pad;
  const yMax = shownMetric === "precipitation" ? Math.max(max, 0.1) : max + pad;

  const plotted = points
    .map((point, index) => {
      const value = values[index];
      if (value === null) return null;
      return { index, x: xFor(index, points.length), y: yFor(value, yMin, yMax), value };
    })
    .filter((row): row is { index: number; x: number; y: number; value: number } => row !== null);

  const linePath = plotted.map((row, i) => `${i === 0 ? "M" : "L"} ${row.x} ${row.y}`).join(" ");
  const nowPoint = points.findIndex((point) => point.isNow);
  const summary = chartSummary(points, shownMetric, units);
  const activePoint = active !== null ? points[active] : null;
  const tip = activePoint ? tooltipFields(activePoint, units) : [];
  const activePlotted = plotted.find((row) => row.index === active);

  function onPointer(event: PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    setActive(nearestIndex(event.clientX, event.currentTarget, points.length));
  }

  function onChartKey(event: KeyboardEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActive((index) => Math.min(points.length - 1, (index ?? -1) + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((index) => Math.max(0, (index ?? points.length) - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(points.length - 1);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  const gridYs = [0, 0.5, 1].map((t) => PAD.top + t * (VIEW_H - PAD.top - PAD.bottom));

  return (
    <section aria-label="Hourly evolution" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Hourly evolution
        </h2>
        {points.length > 0 ? (
          <div
            role="radiogroup"
            aria-label="Hourly chart metric"
            className="inline-flex rounded-control border border-border bg-surface p-0.5"
          >
            <button
              type="button"
              role="radio"
              aria-checked={shownMetric === "temperature"}
              className={`focus-ring rounded-[6px] px-2.5 py-1 text-[11px] font-medium motion-safe:transition-colors ${
                shownMetric === "temperature"
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:text-text"
              }`}
              onClick={() => setMetric("temperature")}
            >
              Temperature
            </button>
            {precipOk ? (
              <button
                type="button"
                role="radio"
                aria-checked={shownMetric === "precipitation"}
                className={`focus-ring rounded-[6px] px-2.5 py-1 text-[11px] font-medium motion-safe:transition-colors ${
                  shownMetric === "precipitation"
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text"
                }`}
                onClick={() => setMetric("precipitation")}
              >
                Precipitation
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {points.length === 0 ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          Hourly evolution is not available.
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-card border border-border bg-surface px-2 py-3 sm:px-3">
          <p className="sr-only">{summary}</p>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            role="img"
            tabIndex={0}
            aria-label={summary}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onChartKey}
            className="focus-ring h-40 w-full max-w-full touch-pan-y text-accent sm:h-44"
          >
            {gridYs.map((y) => (
              <line
                key={y}
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.12"
                className="text-text-muted"
              />
            ))}
            <text
              x={PAD.left - 8}
              y={PAD.top + 4}
              textAnchor="end"
              className="fill-text-muted"
              fontSize="10"
            >
              {shownMetric === "precipitation"
                ? formatPrecipAmount(yMax, units)?.replace(/ (mm|in)$/, "") ?? String(yMax)
                : formatTemp(yMax)}
            </text>
            <text
              x={PAD.left - 8}
              y={VIEW_H - PAD.bottom}
              textAnchor="end"
              className="fill-text-muted"
              fontSize="10"
            >
              {shownMetric === "precipitation"
                ? formatPrecipAmount(yMin, units)?.replace(/ (mm|in)$/, "") ?? "0"
                : formatTemp(yMin)}
            </text>
            {nowPoint >= 0 ? (
              <>
                <line
                  x1={xFor(nowPoint, points.length)}
                  x2={xFor(nowPoint, points.length)}
                  y1={PAD.top}
                  y2={VIEW_H - PAD.bottom}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  strokeOpacity="0.45"
                />
                <text
                  x={xFor(nowPoint, points.length) + 4}
                  y={PAD.top - 4}
                  className="fill-accent"
                  fontSize="9"
                  fontWeight="600"
                >
                  NOW
                </text>
              </>
            ) : null}
            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {plotted.map((row) => (
              <circle
                key={points[row.index].time || row.index}
                cx={row.x}
                cy={row.y}
                r={active === row.index ? 4.5 : 3}
                fill="currentColor"
                className="motion-safe:transition-[r]"
              />
            ))}
            {points.length <= 8
              ? points.map((point, index) => (
                  <text
                    key={`tick-${point.time || index}`}
                    x={xFor(index, points.length)}
                    y={VIEW_H - 8}
                    textAnchor="middle"
                    className="fill-text-muted"
                    fontSize="9"
                  >
                    {point.label}
                  </text>
                ))
              : [0, Math.floor((points.length - 1) / 2), points.length - 1].map((index) => (
                  <text
                    key={`tick-${index}`}
                    x={xFor(index, points.length)}
                    y={VIEW_H - 8}
                    textAnchor="middle"
                    className="fill-text-muted"
                    fontSize="9"
                  >
                    {points[index].label}
                  </text>
                ))}
          </svg>
          {activePoint && activePlotted ? (
            <div
              role="status"
              className="pointer-events-none absolute z-10 max-w-[12rem] rounded-control border border-border bg-background px-2.5 py-2 text-xs text-text shadow-none"
              style={{
                left: `clamp(0.5rem, ${(activePlotted.x / VIEW_W) * 100}% - 4.5rem, calc(100% - 12.5rem))`,
                top: `clamp(0.25rem, ${(activePlotted.y / VIEW_H) * 100}% - 4.5rem, calc(100% - 7rem))`,
              }}
            >
              {tip.map((field) => (
                <p key={field.label} className="flex justify-between gap-3">
                  <span className="text-text-muted">{field.label}</span>
                  <span className="tabular-nums">{field.value}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
