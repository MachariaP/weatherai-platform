/**
 * Public API contract aliases sourced from FastAPI OpenAPI.
 *
 * Field shapes live in `lib/generated/api-schema.ts` (do not edit that file).
 * Regenerate with `npm run generate:api-types`.
 *
 * Frontend-only types (UI state, preferences, recents/favorites, view models)
 * stay handwritten in their own modules. They are not generated.
 */

import type { components, paths } from "./generated/api-schema";

export type WeatherResponse = components["schemas"]["WeatherResponse"];
export type CurrentWeather = components["schemas"]["CurrentWeather"];
export type ForecastDay = components["schemas"]["ForecastDay"];
export type HourlyForecast = components["schemas"]["HourlyForecast"];
export type GeocodeResult = components["schemas"]["GeocodeResult"];
export type GeocodeSearchResponse = components["schemas"]["GeocodeSearchResponse"];
export type ApiError = components["schemas"]["ApiError"];

/** Same public error body FastAPI returns: `{ error, message }`. */
export type WeatherError = ApiError;

/** Place candidate; same public model as reverse/geolocate. */
export type GeocodeHit = GeocodeResult;

/** Query params for FastAPI `GET /weather` (and the Next.js proxy). */
export type WeatherParams = NonNullable<
  paths["/weather"]["get"]["parameters"]["query"]
>;
