/**
 * Typed API client for Next.js server → FastAPI communication.
 *
 * Server-side only.  Does not contain:
 *   - WeatherAI API keys or URLs
 *   - Caching logic (FastAPI owns the cache)
 *   - Retry logic (FastAPI owns retries to WeatherAI)
 *   - UI state or React components
 *
 * This client talks to OUR backend, not to WeatherAI directly.
 */

import type { WeatherError, WeatherParams, WeatherResponse } from "./types";

const BACKEND_TIMEOUT_MS = 8_000;

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error(
      "BACKEND_URL is not set. Add it to frontend/.env.local (see .env.local.example)."
    );
  }
  return url;
}

export type WeatherResult =
  | { ok: true; data: WeatherResponse; cacheStatus: string | null }
  | { ok: false; status: number; error: WeatherError };

export async function fetchWeather(
  params: WeatherParams
): Promise<WeatherResult> {
  const url = new URL("/weather", getBackendUrl());

  url.searchParams.set("lat", String(params.lat));
  url.searchParams.set("lon", String(params.lon));
  if (params.days !== undefined) url.searchParams.set("days", String(params.days));
  if (params.ai !== undefined) url.searchParams.set("ai", String(params.ai));
  if (params.units !== undefined) url.searchParams.set("units", params.units);
  if (params.lang !== undefined) url.searchParams.set("lang", params.lang);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return {
        ok: false,
        status: 504,
        error: { error: "backend_timeout", message: "Backend did not respond in time" },
      };
    }
    return {
      ok: false,
      status: 503,
      error: { error: "backend_unavailable", message: "Backend is unreachable" },
    };
  }

  if (!res.ok) {
    let errorBody: WeatherError;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = { error: "unknown", message: `Backend returned ${res.status}` };
    }
    return { ok: false, status: res.status, error: errorBody };
  }

  const data: WeatherResponse = await res.json();
  const cacheStatus = res.headers.get("x-cache");

  return { ok: true, data, cacheStatus };
}
