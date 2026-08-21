"use client";

import { atmosphereCategory } from "@/lib/atmosphere";

interface Props {
  code: unknown;
  isDay: boolean;
}

/**
 * Fixed, non-interactive atmosphere behind dashboard content.
 * CSS-only motion — no per-frame React state. Empty/unknown stay the
 * existing forest-black theme.
 */
export function WeatherAtmosphere({ code, isDay }: Props) {
  const category = atmosphereCategory(code);
  if (category === "UNKNOWN") return null;

  return (
    <div
      aria-hidden="true"
      className="weather-atmosphere"
      data-atm={category}
      data-day={isDay ? "day" : "night"}
    />
  );
}
