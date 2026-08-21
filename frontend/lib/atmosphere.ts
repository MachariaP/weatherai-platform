/**
 * Presentation-only atmosphere categories from the public weather_code.
 * Does not read raw WeatherAI payloads or invent conditions.
 */

export type AtmosphereCategory =
  | "CLEAR"
  | "PARTLY_CLOUDY"
  | "CLOUDY"
  | "RAIN"
  | "HEAVY_RAIN"
  | "SNOW"
  | "FOG"
  | "STORM"
  | "UNKNOWN";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function atmosphereCategory(code: unknown): AtmosphereCategory {
  if (!isFiniteNumber(code)) return "UNKNOWN";
  if (code === 0) return "CLEAR";
  if (code === 1 || code === 2) return "PARTLY_CLOUDY";
  if (code === 3) return "CLOUDY";
  if (code === 45 || code === 48) return "FOG";
  if (code === 65 || code === 67 || code === 82) return "HEAVY_RAIN";
  if (
    code === 51 ||
    code === 53 ||
    code === 55 ||
    code === 56 ||
    code === 57 ||
    code === 61 ||
    code === 63 ||
    code === 66 ||
    code === 80 ||
    code === 81
  ) {
    return "RAIN";
  }
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return "SNOW";
  }
  if (code === 95 || code === 96 || code === 99) return "STORM";
  return "UNKNOWN";
}
