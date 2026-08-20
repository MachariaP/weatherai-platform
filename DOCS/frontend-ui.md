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
come from the public `WeatherResponse` contract (FastAPI OpenAPI → generated
TypeScript aliases in `lib/types.ts`). Place labels come from FastAPI
geocoding (`place_name` on weather, or `/api/geocode`).

### Component hierarchy

```
app/layout.tsx                — Inter, providers, header, footer, mobile nav
├── components/ui/Header      — brand, location switcher, Dashboard/Forecast, My location, settings
│   ├── WeatherLogo
│   ├── LocationSwitcher      — SearchBar: suggestions, saved/recent, GPS, coordinates, compare
│   └── MyLocationButton
├── components/weather/CurrentConditionsView — empty / loading / error / views
│   ├── EmptyState
│   ├── CurrentWeather        — hero + hide-missing metric tiles
│   ├── AISummary
│   ├── ForecastGrid/Card     — daily rows; selected day opens ForecastDaySheet
│   ├── HourlyScroll          — full hourly strip, current hour aligned
│   ├── HourlyChart           — next-24h SVG evolution (temperature / precipitation)
│   ├── CompareView           — explicit two-place comparison (ai omitted)
│   └── SettingsPanel         — units + AI + saved places + compare entry
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
- `ViewProvider` — dashboard / forecast / insights / settings / compare. One weather
  payload for the active location; compare fetches separately after explicit
  selection. Views only change layout except compare, which uses its own
  `/api/weather` requests (`ai` omitted).
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
- **Loaded dashboard** — 8-col current + hourly strip + hourly evolution chart,
  4-col AI + 7-day. Daily rows open a drill-down (desktop drawer / mobile sheet)
  from already-fetched `hourly[]`.
- **Forecast / AI Insights / Settings / Compare** — Settings is units, forecast
  range (3/5/7), AI toggle, saved places, and compare entry. Compare loads at
  most two saved places via `/api/weather` without `ai=true`. Selected forecast
  day is UI-only (not stored, not in the URL).

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

## Hourly evolution chart

Custom SVG (no chart library). Dashboard window is the **next 24 hourly rows
from the current hour** (or from the first row if none match). Forecast-day
drill-down plots **all hourly rows for that date**. Temperature is the
default metric. Precipitation is offered only when at least one finite amount
exists, including verified `0`. Hourly wind is not on the public contract, so
it is not a tab. Values are not converted. The existing hourly strip still
shows the longer raw timeline.

The dashboard stacks current conditions, hourly, and the daily list below
`lg` (1024px) so forecast labels stay readable around 768–900px. From `lg`
up, daily forecast sits in the right column.

## Forecast-day drill-down

Daily rows are buttons. The selected day is React state only. Hourly detail is
`hourly[]` filtered by the daily `date` prefix (`YYYY-MM-DD`). Days the hourly
payload does not cover show an honest empty message — they are not invented
and do not trigger another WeatherAI request. Desktop: right drawer.
Mobile: bottom sheet. Escape, overlay, and a close button dismiss it.

## Location switcher

Search, saved places, recents, GPS, coordinates, and compare all write
through `LocationProvider`. The combobox stays in the header so shareable
search and existing journeys keep working. Opening it shows Saved / Recent /
Actions (Use my location, Enter coordinates, Compare when two or more places
are saved). Geocoding remains `Browser → /api/geocode → FastAPI → Photon`.

## Compare mode

Opened from Settings or the switcher. Weather is fetched only for the places
the user selects, maximum two, via the existing `/api/weather` endpoint with
`ai` omitted. Favorites are not preloaded. Failures are per card. FastAPI
cache, rate limiter, and circuit breaker still apply.

## Motion

Open/close, metric tabs, and skeletons use `motion-safe:` transitions.
`prefers-reduced-motion` already disables pulse/spin in `globals.css`.
Interaction does not depend on animation.

## Accessibility

Landmarks (`header`, `main`, `footer`, labeled `nav`s), skip link,
visible `:focus-visible` rings, labeled inputs, `role="switch"` / 
`aria-pressed` on toggles. Bottom nav is `lg:hidden` so tablet keeps
touch tabs; desktop Dashboard / Forecast live in the header from `lg` up.
The hourly chart has a text summary and metric radios. Forecast drill-down
is a dialog with focus trap, Escape, and a close button. Compare cards use
per-location headings and independent loading/error status.

## Deliberate constraints

- WeatherAI remains coordinates-only. City search is Photon via FastAPI.
- Mock Stitch metrics are omitted when upstream has no keys.
- AI card never fabricates a summary: off → hidden on the dashboard;
  on + null → muted “not available”.
- Precipitation units are whatever FastAPI already returned (no mm↔in
  conversion in the UI).
