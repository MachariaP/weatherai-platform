"use client";

import type { ForecastDay } from "@/lib/types";
import { ForecastCard } from "./ForecastCard";

interface Props {
  days: ForecastDay[];
}

export function ForecastGrid({ days }: Props) {
  if (days.length === 0) return null;

  return (
    <section aria-label="Forecast">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {days.length}-day forecast
      </h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scroll-slim sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-7 md:gap-3 md:overflow-visible md:px-0 md:pb-0">
        {days.map((day) => (
          <ForecastCard key={day.date} day={day} />
        ))}
      </div>
    </section>
  );
}