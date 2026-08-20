# Frontend UI — Architecture & Design Decisions

Phase 5 product polish. This document describes how the dashboard UI is
organized, the design system it follows, and the decisions behind it.

## Architecture

The frontend is a single-page dashboard built on Next.js App Router
(React 19, Tailwind CSS v4). The data boundary is unchanged:

```
Browser
  ↓ same-origin
Next.js /api/weather   (thin proxy — validates params)
  ↓ server-to-server
FastAPI /weather       (owns auth, retries, normalization, cache)
  ↓ Bearer
WeatherAI
```

The UI has no knowledge of WeatherAI. All values come from the frozen
`WeatherResponse` contract in `lib/types.ts`.

### Component hierarchy

```
app/layout.tsx                — providers, header, skip link, page shell
├── components/ui/Header      — brand, search, controls (responsive)
│   ├── WeatherLogo           — brand mark + wordmark
│   ├── SearchBar             — coordinate search + Get weather
│   ├── MyLocationButton      — geolocation action
│   ├── UnitToggle            — °C / °F segmented control
│   └── AiToggle              — "AI insights" switch
└── components/weather/WeatherDashboard — state orchestration
    ├── EmptyState            — initial state (no location yet)
    ├── CurrentWeather        — hero: temp, condition, details grid
    ├── AISummary             — insight card (only when ai_summary present)
    ├── ForecastGrid/Card     — 7-day strip
    └── HourlyScroll          — hourly scroll row
supporting: components/ui/ErrorBanner, components/ui/LoadingSkeleton,
components/ui/icons, lib/weather-icons (SVG glyphs), lib/format (helpers)
```

### State & data flow

- `LocationProvider` — holds the active location `{ lat, lon, label }`.
  `label` is always an honest coordinate string (never a fabricated
  city name).
- `PreferencesProvider` — `units` and `aiEnabled`, persisted to
  `localStorage` (`units`, `ai` keys). AI stays disabled by default.
- `useWeather` — fetches `/api/weather?lat&lon&units&ai`, tracks
  loading/error/cache-status, exposes `refetch` for retry.

## Design system

Defined as Tailwind v4 theme tokens in `app/globals.css`.

### Color

| Token               | Value      | Use                                    |
| ------------------- | ---------- | -------------------------------------- |
| `background`        | `#0a1120`  | page background                        |
| `surface`           | `#101a2e`  | controls, detail tiles                 |
| `surface-elevated`  | `#0d1626`  | header                                 |
| `card`              | `#152036`  | cards                                  |
| `border`            | `#24334e`  | hairlines                              |
| `border-strong`     | `#33456b`  | emphasized borders                     |
| `text`              | `#eef3fa`  | primary text                           |
| `text-secondary`    | `#a8b7cd`  | body/card text                         |
| `text-muted`        | `#7487a3`  | captions, labels                       |
| `accent`            | `#2dd4bf`  | primary action, selected states (teal) |
| `accent-secondary`  | `#22d3ee`  | secondary accent (AI mark, cyan)       |
| `accent-strong`     | `#14b8a6`  | accent hover                           |
| `success`           | `#34d399`  | live/positive states                   |
| `warning`           | `#fbbf24`  | soft warnings (geolocation)            |
| `error`             | `#f87171`  | errors                                 |

The page background is a flat dark navy; accent usage is deliberately
restrained — one primary CTA per state, teal for active/selected
elements, cyan reserved for the AI mark.

### Typography

System font stack (`--font-sans`). Hierarchy is driven by weight,
size, tracking, and case rather than a custom webfont:

- Display/hero — `font-extralight`, `6xl`–`7xl`, `tabular-nums`
- Section headings — `xs`, semibold, uppercase, wide tracking
- Body — `sm`/`base`, `text-secondary`
- Captions/labels — `xs`/`10px`, muted, uppercase for eyebrows

### Radius & elevation

- `rounded-card` (16px) — cards, controls
- `rounded-panel` (22px) — hero and section containers
- `rounded-control` (10px) — inputs/buttons
- Shadows: `card` and `float` only — no glow/halo effects

### Motion

Pulse skeletons animate only where useful; `prefers-reduced-motion`
disables pulse/spin and smooth scrolling.

## Weather visual language

`lib/weather-icons.tsx` maps WMO codes (from the backend contract) to
a small controlled set of stroke-based SVG glyphs:

`clear-day`, `clear-night`, `partly-day`, `partly-night`, `cloudy`,
`fog`, `rain`, `snow`, `storm`, `unknown`.

Unknown codes always render the graceful `unknown` mark — the UI never
claims a condition the backend did not describe. `components/ui/icons.tsx`
holds the shared UI glyphs (wind, compass, clock, pin, droplet, etc.)

## States

- **Empty** — explains the product, offers *Use my location* and
  *Search by coordinates*, and surfaces geolocation errors.
- **Loading** — skeletons mirror the final layout (hero, AI card,
  forecast strip, hourly row) so the page is never blank.
- **Error** — classifies backend error codes into friendly titles
  (`Invalid coordinates`, `Weather service unavailable`,
  `Request timed out`, `Backend unavailable`, …), keeps user-safe
  messages, and offers an accessible Retry action. No internals leaked.
- **Loaded** — hero + (optional) AI insight + 7-day forecast + hourly.

## Accessibility

- Semantic landmarks: `header`, `main` (with `tabindex=-1` skip target),
  `section` with `aria-label`, `dl`/`dt`/`dd` for details.
- Visible keyboard focus on every control (`:focus-visible` accent ring;
  the search container shows a ring while its inputs are focused).
- Toggles expose state via `aria-pressed` / `role="switch"` +
  `aria-checked`; inputs have labels and coordinate constraints.
- All glyphs are `aria-hidden`; text carries meaning — no information is
  conveyed by color alone (e.g., the Live/Cached badge pairs icon + text).
- Touch targets are ≥ 40px on mobile.

## Responsive behavior

| Breakpoint | Layout |
| ---------- | ------ |
| ≥ 1024px   | Header: brand · centered search · controls. Forecast = 7-column grid. |
| 768–1023px | Search stays in the header; forecast becomes a 7-column grid at md. |
| < 768px    | Header: brand + controls on row 1; full-width search + My location on row 2. Forecast & hourly scroll horizontally with slim scrollbars. |

Verified at 1440, 1280, 1024, 768, 390, and 375 px: no horizontal
overflow, no clipped controls, touch-friendly buttons.

## Deliberate constraints

- No feels-like temperature: it is not part of the frozen backend
  contract, and we never invent values.
- No city names: coordinates are displayed honestly.
- AI card only when `ai_summary` is non-null; the toggle is a product
  preference, not a developer switch.
- Precipitation is shown in millimetres as returned by the API.