# Frontend UI — Architecture & Design Decisions

Phase 5 product polish. This document describes how the dashboard UI is
organized, the design system it follows, and the decisions behind it.

## Architecture

The frontend is a single-page dashboard built on Next.js App Router
(React 19, Tailwind CSS v4, Inter). The data boundary is unchanged for
WeatherAI: the browser never holds the API key or talks to WeatherAI.

```
Browser
  ↓ same-origin
Next.js /api/weather   (thin proxy — validates params)
Next.js /api/geocode   (thin proxy — place search)
Next.js /api/reverse   (thin proxy — reverse geocode)
Next.js /api/geolocate (thin proxy — IP approximation)
  ↓ server-to-server
FastAPI /weather       (owns auth, retries, normalization, cache)
FastAPI /geocode, /reverse, /geolocate  (Photon + IP lookup + TTL cache)
  ↓
WeatherAI (lat/lon only)  |  Photon  |  IP lookup
```

The UI has no knowledge of WeatherAI or geocoder hosts. Weather values
come from the `WeatherResponse` contract in `lib/types.ts`. Place labels
come from FastAPI geocoding (`place_name` on weather, or `/api/geocode`).

### Component hierarchy

```
app/layout.tsx                — Inter, providers, header, footer, mobile nav
├── components/ui/Header      — brand, search, Dashboard/Forecast, My location, settings
│   ├── WeatherLogo
│   ├── SearchBar             — combobox suggestions + recent places + mobile lat/lon
│   └── MyLocationButton
├── components/weather/CurrentConditionsView — empty / loading / error / views
│   ├── EmptyState
│   ├── CurrentWeather        — hero + hide-missing metric tiles
│   ├── AISummary
│   ├── ForecastGrid/Card
│   ├── HourlyScroll
│   └── SettingsPanel         — units + AI preference (not in the header)
supporting: BottomNav, SiteFooter, ErrorBanner, LoadingSkeleton, icons
```

### State & data flow

- `LocationProvider` — `{ lat, lon, label }` is the single client location
  source of truth. **Identity is coordinates.** Labels are presentation.
  Recents (max 8) persist in `localStorage` (`weatherai:recent-locations`)
  and never store weather payloads. Saved places (max 20) persist separately
  (`weatherai:favorite-locations`): explicit star, coordinate identity, no
  account. Selecting a favorite updates LocationProvider, the canonical URL,
  and recents, and does not geocode again. Canonical URL is `/?lat=&lon=`.
  Invalid URL coordinates set a safe error and do not fetch weather.
- `PreferencesProvider` — `units`, `aiEnabled`, and `forecastDays` (3/5/7,
  default 7), persisted to `localStorage` (`units`, `ai`, `forecastDays`).
  AI stays disabled by default. Forecast range is not encoded in the URL.
- `ViewProvider` — dashboard / forecast / insights / settings. One weather
  payload; views only change layout.
- `useWeather` — fetches `/api/weather?lat&lon&units&days&ai`, clears data when
  coordinates **or** units/AI/days change, exposes `refetch`.

City search: the browser calls **`GET /api/geocode?q=`** only. Combined
input parses `lat, lon` locally when both tokens are numbers; otherwise it
debounces a suggestion request. Selecting a candidate sets `LocationProvider`
and the canonical URL. Typing does not update the URL.

## Design system

Defined as Tailwind v4 theme tokens in `app/globals.css`, from the Stitch
DESIGN.md palette.

### Color

| Token               | Value      | Use                                    |
| ------------------- | ---------- | -------------------------------------- |
| `background`        | `#0e1513`  | page background                        |
| `surface`           | `#1a211f`  | `surface-container` cards/controls     |
| `surface-elevated`  | `#0e1513`  | header/footer                          |
| `card`              | `#161d1b`  | recessed surfaces                      |
| `border`            | `#3c4a46`  | `outline-variant`                      |
| `text`              | `#dde4e1`  | `on-surface`                           |
| `text-secondary`    | `#bacac5`  | `on-surface-variant`                   |
| `text-muted`        | `#859490`  | `outline` captions                     |
| `accent`            | `#57f1db`  | primary                                |
| `on-accent`         | `#003731`  | text on primary                        |

### Typography

Inter via `next/font` (`--font-inter`). Hierarchy:

- Display temp — 72px / bold / tracking -0.02em
- Headline — 32px / 600
- Labels — 12px / medium / wide tracking / uppercase

### Radius

- `rounded-control` / `rounded-card` — 8px (Stitch `lg`)

## States

- **Empty** — dotted full-bleed canvas, cloud mark, *Use my location* /
  *Search by coordinates*, capability row (7-day / hourly / AI).
- **Loading** — 8/4 column skeletons matching the loaded dashboard.
- **Error** — classified titles, user-safe messages, Retry. No internals.
- **Loaded dashboard** — 8-col current+hourly, 4-col AI+7-day.
- **Forecast / AI Insights / Settings** — same payload, different layout.
  Settings is units, forecast range (3/5/7), AI toggle, and saved places
  (no extra backend). Those controls are not duplicated in the header.

## Metric tiles (hide missing)

Always: wind (on contract). Conditionally, only if FastAPI sent a finite
value: `precip_last_24h`, `humidity`, `uv_index`, `pressure`, feels-like
line. Never invent humidity, UV, pressure trend (“Falling”), or feels-like.

Daily and hourly forecast rows show precipitation **amount** (mm or in from
the contract) when the value is finite, including verified `0`. Null amounts
are omitted. The field is never shown as a percent.

`Observed HH:MM` uses clock digits from `current.observed_at` when present.
Refresh reissues `/api/weather` and may return `X-Cache: HIT`. Existing
weather stays on screen during a manual refresh; a location change still
clears stale weather immediately.

Hero heading: `place_name` when reverse geocode succeeded, else the
location label. Subtitle is always `lat, lon` at 4 decimals.

## Accessibility

Landmarks (`header`, `main`, `footer`, labeled `nav`s), skip link,
visible `:focus-visible` rings, labeled inputs, `role="switch"` / 
`aria-pressed` on toggles. Bottom nav is `md:hidden`; desktop Dashboard /
Forecast live in the header.

## Deliberate constraints

- WeatherAI remains coordinates-only. City search is Photon via FastAPI.
- Mock Stitch metrics are omitted when upstream has no keys.
- AI card never fabricates a summary: off → hidden on the dashboard;
  on + null → muted “not available”.
- Precipitation units are whatever FastAPI already returned (no mm↔in
  conversion in the UI).
