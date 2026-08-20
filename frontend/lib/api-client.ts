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

export type WeatherResult =
  | { ok: true; data: WeatherResponse; cacheStatus: string | null }
  | { ok: false; status: number; error: WeatherError };

function getBackendUrl(): string | undefined {
  const url = process.env.BACKEND_URL;
  return url && url.length > 0 ? url : undefined;
}

function isTimeoutError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const name = "name" in err ? String(err.name) : "";
  const message = "message" in err ? String(err.message).toLowerCase() : "";
  if (name === "TimeoutError") return true;
  return name === "AbortError" && message.includes("timeout");
}

function unavailable(): WeatherResult {
  return {
    ok: false,
    status: 503,
    error: { error: "backend_unavailable", message: "Backend is unreachable" },
  };
}

function timeout(): WeatherResult {
  return {
    ok: false,
    status: 504,
    error: {
      error: "backend_timeout",
      message: "Backend did not respond in time",
    },
  };
}

function malformed(): WeatherResult {
  return {
    ok: false,
    status: 502,
    error: {
      error: "malformed_response",
      message: "Backend returned an unexpected response",
    },
  };
}

function parseErrorBody(status: number, body: unknown): WeatherError {
  if (body !== null && typeof body === "object") {
    const candidate = body as { error?: unknown; message?: unknown };
    if (typeof candidate.error === "string" && typeof candidate.message === "string") {
      return { error: candidate.error, message: candidate.message };
    }
  }
  return { error: "unknown", message: `Backend returned ${status}` };
}

/**
 * Runtime check for the FastAPI public contract.
 *
 * This is not WeatherAI-shape validation and not a second normalizer.
 * It only confirms the JSON looks like WeatherResponse before we
 * treat it as success.
 */
function isWeatherResponse(value: unknown): value is WeatherResponse {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.lat !== "number" || typeof v.lon !== "number") return false;
  if (typeof v.units !== "string") return false;
  if (v.current === null || typeof v.current !== "object") return false;
  if (!Array.isArray(v.daily) || !Array.isArray(v.hourly)) return false;
  if (
    v.ai_summary !== null &&
    v.ai_summary !== undefined &&
    typeof v.ai_summary !== "string"
  ) {
    return false;
  }
  return true;
}

export async function fetchWeather(
  params: WeatherParams
): Promise<WeatherResult> {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    return unavailable();
  }

  const url = new URL("/weather", backendUrl);

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
    if (isTimeoutError(err)) {
      return timeout();
    }
    return unavailable();
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: { error: "unknown", message: `Backend returned ${res.status}` },
      };
    }
    return malformed();
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: parseErrorBody(res.status, body),
    };
  }

  if (!isWeatherResponse(body)) {
    return malformed();
  }

  return {
    ok: true,
    data: body,
    cacheStatus: res.headers.get("x-cache"),
  };
}
