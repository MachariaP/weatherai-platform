/**
 * Small shared UI icon set.
 *
 * Consistent stroke-based 24x24 glyphs used across controls and
 * weather surfaces.  All icons inherit `currentColor` so they adapt
 * to surrounding text/border colors.
 */

interface IconProps {
  className?: string;
}

const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 21s-6.5-5.2-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.8 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </svg>
  );
}

export function CrosshairIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 1.5v3.5M12 19v3.5M1.5 12H5M19 12h3.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 3.5 13.8 9l5.7 1.6-5.7 1.6L12 17.9l-1.8-5.7L4.5 10.6 10.2 9 12 3.5Z" />
      <path d="M19 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" opacity="0.55" />
    </svg>
  );
}

export function WindIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M3 8.5h10.5a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12.5h15.5a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16.5h8" />
    </svg>
  );
}

export function CompassIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function DropletIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 3.5s6 5.9 6 10.5a6 6 0 1 1-12 0C6 9.4 12 3.5 12 3.5Z" />
    </svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3.5V7h-3.5" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4.5M12 17.5v.25" />
    </svg>
  );
}

export function LogoMark({ className }: IconProps) {
  return (
    <svg {...BASE} strokeWidth={1.8} className={className}>
      <circle cx="7.5" cy="8.5" r="2.8" fill="currentColor" stroke="none" />
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.5v.25" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1.9Z" />
    </svg>
  );
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17" />
    </svg>
  );
}

export function HumidityIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M12 3.5s5.5 5.4 5.5 9.8a5.5 5.5 0 1 1-11 0C6.5 8.9 12 3.5 12 3.5Z" />
      <path d="M9.5 14.2c.4 1.6 1.6 2.3 2.5 2.3" />
    </svg>
  );
}

export function GaugeIcon({ className }: IconProps) {
  return (
    <svg {...BASE} className={className}>
      <path d="M5.2 16.2a7.5 7.5 0 1 1 13.6 0" />
      <path d="M12 12.5 15 9.2" />
      <circle cx="12" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}