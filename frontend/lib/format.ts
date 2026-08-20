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
 * Label precipitation using the backend-provided number.
 * Does not convert mm ↔ in — FastAPI already returns the requested units.
 */
export function formatPrecip(value: number, units: Units = "metric"): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const amount = value >= 1 ? String(Math.round(value)) : value.toFixed(1);
  return `${amount} ${units === "imperial" ? "in" : "mm"}`;
}

/** Includes zero. Used for daily totals that FastAPI actually returned. */
export function formatPrecipAmount(value: number, units: Units = "metric"): string {
  if (!Number.isFinite(value)) return "Unavailable";
  const amount = value === 0 ? "0" : Math.abs(value) >= 1 ? String(Math.round(value)) : value.toFixed(1);
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

export function isCurrentHour(timeStr: string): boolean {
  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate() &&
    date.getHours() === now.getHours()
  );
}