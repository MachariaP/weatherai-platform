/**
 * Next.js Route Handler: GET /api/weather
 *
 * Intentionally thin.  Validates query parameters, delegates to the
 * FastAPI backend via fetchWeather(), and returns the result.
 *
 * Does NOT:
 *   - Cache (FastAPI owns caching)
 *   - Retry (FastAPI owns retries to WeatherAI)
 *   - Know about WeatherAI's API shape, auth, or URL
 *   - Add business logic
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchWeather } from "@/lib/api-client";

const VALID_UNITS = new Set(["metric", "imperial"]);

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE, ...extraHeaders },
  });
}

function badRequest(message: string) {
  return jsonResponse({ error: "bad_request", message }, 400);
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const latStr = sp.get("lat");
  const lonStr = sp.get("lon");

  if (!latStr || !lonStr) {
    return badRequest("lat and lon are required");
  }

  const lat = Number(latStr);
  const lon = Number(lonStr);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return badRequest("lat must be a number between -90 and 90");
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return badRequest("lon must be a number between -180 and 180");
  }

  const daysStr = sp.get("days");
  let days: number | undefined;
  if (daysStr !== null) {
    days = Number(daysStr);
    if (!Number.isInteger(days) || days < 1 || days > 7) {
      return badRequest("days must be an integer between 1 and 7");
    }
  }

  const units = sp.get("units") ?? undefined;
  if (units !== undefined && !VALID_UNITS.has(units)) {
    return badRequest("units must be 'metric' or 'imperial'");
  }

  const aiStr = sp.get("ai");
  let ai: boolean | undefined;
  if (aiStr !== null) {
    if (aiStr !== "true" && aiStr !== "false") {
      return badRequest("ai must be 'true' or 'false'");
    }
    ai = aiStr === "true";
  }

  const lang = sp.get("lang") ?? undefined;

  try {
    const result = await fetchWeather({
      lat,
      lon,
      days,
      ai,
      units: units as "metric" | "imperial" | undefined,
      lang,
    });

    if (!result.ok) {
      return jsonResponse(result.error, result.status);
    }

    const extra: Record<string, string> = {};
    if (result.cacheStatus) {
      extra["X-Cache"] = result.cacheStatus;
    }

    return jsonResponse(result.data, 200, extra);
  } catch {
    return jsonResponse(
      { error: "backend_unavailable", message: "Backend is unreachable" },
      503
    );
  }
}
