/**
 * Controlled weather icon system.
 *
 * Maps WMO weather codes (as provided by our backend contract) to a small
 * set of recognizable SVG glyphs.  Unknown codes always fall back to a
 * graceful "unknown" mark — the frontend never claims a condition the
 * backend did not describe.
 */

export type WeatherIconName =
  | "clear-day"
  | "clear-night"
  | "partly-day"
  | "partly-night"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "storm"
  | "unknown";

export function getWeatherIconName(code: number, isDay: boolean = true): WeatherIconName {
  if (code === 0) return isDay ? "clear-day" : "clear-night";
  if (code === 1 || code === 2) return isDay ? "partly-day" : "partly-night";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return "rain";
  if (code === 61 || code === 63 || code === 65 || code === 66 || code === 67) return "rain";
  if (code === 71 || code === 73 || code === 75 || code === 77) return "snow";
  if (code === 80 || code === 81 || code === 82) return "rain";
  if (code === 85 || code === 86) return "snow";
  if (code === 95 || code === 96 || code === 99) return "storm";
  return "unknown";
}

interface IconProps {
  name: WeatherIconName;
  className?: string;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const CLOUD =
  "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z";

const SUN_RAYS =
  "M8 2.5v1.6M8 11.9v1.6M2.5 8h1.6M11.9 8h1.6M4.1 4.1l1.1 1.1M10.8 10.8l1.1 1.1M11.9 4.1l-1.1 1.1M5.2 10.8l-1.1 1.1";

export function WeatherIcon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...STROKE}
    >
      {name === "clear-day" && (
        <>
          <circle cx="8" cy="8" r="3.4" />
          <path d={SUN_RAYS} />
        </>
      )}

      {name === "clear-night" && (
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      )}

      {name === "partly-day" && (
        <>
          <circle cx="8.5" cy="7.5" r="2.8" />
          <path d={SUN_RAYS} transform="translate(0.5 -0.5)" />
          <path d={CLOUD} transform="translate(1 -1.5)" />
        </>
      )}

      {name === "partly-night" && (
        <>
          <path d="M11 3.5a6.5 6.5 0 1 0 6 8.8A6 6 0 0 1 11 3.5Z" />
          <path d={CLOUD} transform="translate(1.5 -1)" />
        </>
      )}

      {name === "cloudy" && (
        <>
          <path d={CLOUD} transform="translate(-5 -5.5) scale(0.62)" opacity="0.55" />
          <path d={CLOUD} />
        </>
      )}

      {name === "fog" && (
        <>
          <path d={CLOUD} transform="translate(0 -2.5) scale(0.9)" />
          <path d="M4 16.5h16M4 19.5h10.5" />
        </>
      )}

      {name === "rain" && (
        <>
          <path d={CLOUD} transform="translate(0 -2.5) scale(0.9)" />
          <path d="M8.25 16.75 6.75 20M12.25 16.75 10.75 20M16.25 16.75 14.75 20" />
        </>
      )}

      {name === "snow" && (
        <>
          <path d={CLOUD} transform="translate(0 -2.5) scale(0.9)" />
          <path d="M8.5 17.25v3M7 18.75h3M12.5 17.25v3M11 18.75h3M16.5 17.25v3M15 18.75h3" />
        </>
      )}

      {name === "storm" && (
        <>
          <path d={CLOUD} transform="translate(0 -2.5) scale(0.9)" />
          <path
            d="M13.25 12.75 9.5 17.5h3l-1.75 3.5L15.25 15.5h-3.1l1.1-2.75Z"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}

      {name === "unknown" && (
        <>
          <circle cx="12" cy="12" r="8.25" strokeDasharray="2.5 3" />
          <path d="M12 8.25a2.75 2.75 0 1 0 2.9 3.4M12 14.75v.5" />
        </>
      )}
    </svg>
  );
}