"use client";

import type { ForecastDay } from "@/lib/types";
import type { Units } from "@/lib/format";
import { ForecastCard } from "./ForecastCard";

interface Props {
  days: ForecastDay[] | null | undefined;
  units: Units;
}

const MAX_DAYS = 7;

/**
 * Up to seven days from the FastAPI `daily` array.
 * Extra entries are ignored; missing/empty arrays show a fallback.
 */
export function ForecastGrid({ days, units }: Props) {
  const visible = Array.isArray(days) ? days.slice(0, MAX_DAYS) : [];

  return (
    <section aria-label="7-day forecast">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        7-day forecast
      </h2>
      {visible.length === 0 ? (
        <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          Daily forecast is not available.
        </p>
      ) : (
        <div
          role="list"
          aria-label="Daily forecast days"
          className="overflow-hidden rounded-card border border-border bg-surface"
        >
          {visible.map((day, index) => (
            <div
              role="listitem"
              key={day.date?.trim() ? day.date : `day-${index}`}
              className={index < visible.length - 1 ? "border-b border-border" : ""}
            >
              <ForecastCard day={day} units={units} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
