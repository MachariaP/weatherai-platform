/** UI forecast-range options. FastAPI still accepts any integer 1–7. */
export const FORECAST_DAY_OPTIONS = [3, 5, 7] as const;
export type ForecastDays = (typeof FORECAST_DAY_OPTIONS)[number];
export const DEFAULT_FORECAST_DAYS: ForecastDays = 7;
export const FORECAST_DAYS_STORAGE_KEY = "forecastDays";

export function isForecastDays(value: unknown): value is ForecastDays {
  return value === 3 || value === 5 || value === 7;
}

/** Recover from missing, non-numeric, or unsupported stored values. */
export function parseForecastDays(raw: string | null | undefined): ForecastDays {
  if (raw == null || raw.trim() === "") return DEFAULT_FORECAST_DAYS;
  const n = Number(raw);
  if (!Number.isInteger(n) || !isForecastDays(n)) return DEFAULT_FORECAST_DAYS;
  return n;
}

export function forecastRangeLabel(days: ForecastDays): string {
  return `${days}-day forecast`;
}
