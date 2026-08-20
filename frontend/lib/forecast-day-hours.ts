/**
 * Map a selected FastAPI daily `date` (YYYY-MM-DD) onto existing `hourly[]`.
 *
 * Hourly `time` values look like `2026-08-20T15:00` (no timezone in the public
 * contract). Matching is a date-prefix filter — not a timezone conversion.
 * Days without matching hourly rows stay empty; they are not fabricated.
 */

import { hourDateKey } from "@/lib/hourly-chart";
import type { HourlyForecast } from "@/lib/types";

export function hoursForForecastDay(
  hours: HourlyForecast[] | null | undefined,
  date: string | undefined | null
): HourlyForecast[] {
  const key = date?.trim() ?? "";
  if (!key) return [];
  const rows = Array.isArray(hours) ? hours : [];
  return rows.filter((hour) => hourDateKey(hour.time) === key);
}
