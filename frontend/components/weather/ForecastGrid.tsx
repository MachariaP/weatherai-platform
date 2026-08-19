"use client";

import type { ForecastDay } from "@/lib/types";
import { ForecastCard } from "./ForecastCard";

interface Props {
  days: ForecastDay[];
  units: "metric" | "imperial";
}

export function ForecastGrid({ days, units }: Props) {
  if (days.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-medium text-[var(--muted)] mb-3">
        {days.length}-Day Forecast
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day) => (
          <ForecastCard key={day.date} day={day} units={units} />
        ))}
      </div>
    </section>
  );
}
