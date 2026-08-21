/**
 * Presentation helpers for weather values.
 *
 * Pure functions — no I/O, easily testable.  The frontend displays the
 * values exactly as the backend contract provides them; these helpers
 * only format units/labels, they never convert or invent data.
 */

export type Units = "metric" | "imperial";

export function formatTemp(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatWind(value: number, units: Units): string {
  const unit = units === "metric" ? "km/h" : "mph";
  return `${Math.round(value)} ${unit}`;
}

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function formatWindDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
}

/** Honest coordinates label — we never invent a city name. */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lon).toFixed(2)}° ${lonDir}`;
}

export function formatDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en", { weekday: "short" });
}

export function formatHour(timeStr: string): string {
  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) return timeStr;
  return date.toLocaleTimeString("en", { hour: "numeric", hour12: true });
}

/**
 * Clock digits from a timezone-naive ISO-like timestamp (`…T09:45`).
 * Does not run the value through Date / locale conversion.
 */
export function formatNaiveClock(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const match = iso.trim().match(/T(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

export function naiveDateKey(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const match = iso.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Clock digits from FastAPI `observed_at` (WeatherAI `current.time`).
 *
 * The backend passes the string through unchanged. Typical values look like
 * `2026-08-19T12:00` with no timezone. This helper prints those clock digits
 * and does not convert them into the browser locale or the selected location.
 */
export function formatObservedClock(iso: string | null | undefined): string | null {
  return formatNaiveClock(iso);
}

/** Hourly clock label that preserves raw digits when the stamp is naive ISO. */
export function formatHourlyClock(time: string): string {
  return formatNaiveClock(time) ?? formatHour24(time);
}

export type HourRelation = "now" | "future" | "past";

/**
 * Naive hour identity from a timezone-naive ISO-like stamp.
 * `2026-08-21T09:45` / `…T09:00` / `…T09:00:00` → `2026-08-21T09`.
 * Does not construct Date. Malformed input → null.
 */
export function naiveHourKey(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const match = iso
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})T(\d{2})(?::\d{2}(?::\d{2})?)?$/);
  return match ? `${match[1]}T${match[2]}` : null;
}

/**
 * True when the hourly row's naive date+hour matches `observed_at`'s.
 * Browser timezone is irrelevant. Missing/malformed values → false.
 */
export function isObservedHour(
  hourlyTime: string | null | undefined,
  observedAt: string | null | undefined
): boolean {
  const hour = naiveHourKey(hourlyTime);
  const observed = naiveHourKey(observedAt);
  if (!hour || !observed) return false;
  return hour === observed;
}

/**
 * Past / observation-hour / future relative to provider `observed_at`.
 * Without a usable observation stamp, nothing is "now"; rows are treated as
 * future so labels stay forecast-style rather than inventing browser past.
 */
export function hourRelation(
  time: string,
  observedAt: string | null | undefined
): HourRelation {
  const hour = naiveHourKey(time);
  if (!hour) return "future";
  const observed = naiveHourKey(observedAt);
  if (!observed) return "future";
  if (hour === observed) return "now";
  return hour < observed ? "past" : "future";
}

export function formatSelectedHourLabel(
  time: string,
  observedAt: string | null | undefined
): string {
  const relation = hourRelation(time, observedAt);
  const clock = formatHourlyClock(time);
  if (relation === "now") return "Now";
  if (relation === "past") return `At ${clock}`;
  return `Forecast at ${clock}`;
}

export function formatScrubberValueText(
  time: string,
  observedAt: string | null | undefined
): string {
  const relation = hourRelation(time, observedAt);
  const clock = formatHourlyClock(time);
  if (relation === "now") return `Current conditions at ${clock}`;
  if (relation === "past") return `At ${clock}`;
  return `Forecast at ${clock}`;
}

/**
 * Right endpoint of the next-24 window.
 * "Tomorrow" means a later calendar date than the window start in the naive
 * timestamps — not a timezone conversion and not the browser's local tomorrow.
 */
export function formatWindowEndLabel(
  startTime: string | undefined | null,
  endTime: string | undefined | null,
  compact = false,
  observedAt: string | null | undefined = null
): string {
  if (!endTime?.trim()) return "";
  if (isObservedHour(endTime, observedAt)) return "Now";
  const clock = formatHourlyClock(endTime);
  const startDay = naiveDateKey(startTime);
  const endDay = naiveDateKey(endTime);
  if (startDay && endDay && endDay > startDay) {
    return compact ? `${clock} +1d` : `Tomorrow ${clock}`;
  }
  return clock;
}

export function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/**
 * Label a precipitation AMOUNT using the backend-provided number.
 * Does not convert mm ↔ in — FastAPI already returns the requested units.
 * 0 is a real measurement. null / non-finite means unavailable.
 */
export function formatPrecip(
  value: number | null | undefined,
  units: Units = "metric"
): string {
  return formatPrecipAmount(value, units) ?? "";
}

/** Includes verified zero. Returns null when FastAPI did not send a finite amount. */
export function formatPrecipAmount(
  value: number | null | undefined,
  units: Units = "metric"
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const amount =
    value === 0 ? "0" : Math.abs(value) >= 1 ? String(Math.round(value)) : value.toFixed(1);
  return `${amount} ${units === "imperial" ? "in" : "mm"}`;
}

export function formatLatLon(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

export function parseLatLonQuery(raw: string): { lat: number; lon: number } | null {
  const parts = raw.trim().split(/[,\s;]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export function uvBand(value: number): string {
  if (value < 3) return "Low";
  if (value < 6) return "Moderate";
  if (value < 8) return "High";
  if (value < 11) return "Very high";
  return "Extreme";
}

export function formatHour24(timeStr: string): string {
  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) return timeStr;
  return date.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatForecastDate(dateStr: string): string | null {
  if (!dateStr?.trim()) return null;
  const date = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}