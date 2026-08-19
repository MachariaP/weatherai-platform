/**
 * Map weather codes to emoji icons.
 * Based on WMO weather interpretation codes used by WeatherAI.
 */
const WEATHER_ICONS: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

export function getWeatherIcon(code: number, isDay: boolean = true): string {
  if (code === 0 && !isDay) return "🌙";
  if (code === 1 && !isDay) return "🌙";
  return WEATHER_ICONS[code] ?? "🌡️";
}
