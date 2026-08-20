"use client";

import type { ForecastDay } from "@/lib/types";
import type { Units } from "@/lib/format";
import { ForecastDaysToggle } from "@/components/ui/ForecastDaysToggle";
import { ForecastCard } from "./ForecastCard";

interface Props {
  days: ForecastDay[] | null | undefined;
  units: Units;
  requestedDays?: number;
}

const MAX_DAYS = 7;

/**
 * Daily rows from the FastAPI `daily` array.
 * Heading follows the requested range; the list is whatever FastAPI returned
 * (capped defensively at 7). Missing days are not invented.
 */
export function ForecastGrid({ days, units, requestedDays = 7 }: Props) {
  const visible = Array.isArray(days) ? days.slice(0, MAX_DAYS) : [];
  const headingDays =
    requestedDays === 3 || requestedDays === 5 || requestedDays === 7 ? requestedDays : 7;
  const heading = `${headingDays}-day forecast`;

  return (
    <section aria-label={heading}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          {heading}
        </h2>
        <ForecastDaysToggle />
      </div>
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
