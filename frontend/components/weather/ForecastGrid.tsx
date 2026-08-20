"use client";

import type { KeyboardEvent } from "react";
import type { ForecastDay } from "@/lib/types";
import type { Units } from "@/lib/format";
import { ForecastCard } from "./ForecastCard";

interface Props {
  days: ForecastDay[] | null | undefined;
  units: Units;
}

const MAX_DAYS = 7;

function handleScrollKeys(e: KeyboardEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const step = 124;
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

/**
 * Up to seven days from the FastAPI `daily` array.
 * Extra entries are ignored; missing/empty arrays show a fallback.
 */
export function ForecastGrid({ days, units }: Props) {
  const visible = Array.isArray(days) ? days.slice(0, MAX_DAYS) : [];

  return (
    <section aria-label="7-day forecast">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        7-day forecast
      </h2>
      {visible.length === 0 ? (
        <p className="rounded-card border border-border bg-card px-4 py-3 text-sm text-text-secondary">
          Daily forecast is not available.
        </p>
      ) : (
        <div
          role="list"
          tabIndex={0}
          aria-label="Daily forecast days"
          onKeyDown={handleScrollKeys}
          className="focus-ring -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scroll-slim sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] md:gap-3 md:overflow-visible md:px-0 md:pb-0"
        >
          {visible.map((day, index) => (
            <div role="listitem" key={day.date?.trim() ? day.date : `day-${index}`}>
              <ForecastCard day={day} units={units} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
