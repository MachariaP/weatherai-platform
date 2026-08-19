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

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const latStr = sp.get("lat");
  const lonStr = sp.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: "bad_request", message: "lat and lon are required" },
      { status: 400 }
    );
  }

  const lat = Number(latStr);
  const lon = Number(lonStr);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    return NextResponse.json(
      { error: "bad_request", message: "lat must be a number between -90 and 90" },
      { status: 400 }
    );
  }

  if (Number.isNaN(lon) || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "bad_request", message: "lon must be a number between -180 and 180" },
      { status: 400 }
    );
  }

  const daysStr = sp.get("days");
  let days: number | undefined;
  if (daysStr !== null) {
    days = Number(daysStr);
    if (!Number.isInteger(days) || days < 1 || days > 7) {
      return NextResponse.json(
        { error: "bad_request", message: "days must be an integer between 1 and 7" },
        { status: 400 }
      );
    }
  }

  const units = sp.get("units") ?? undefined;
  if (units !== undefined && !VALID_UNITS.has(units)) {
    return NextResponse.json(
      { error: "bad_request", message: "units must be 'metric' or 'imperial'" },
      { status: 400 }
    );
  }

  const aiStr = sp.get("ai");
  const ai = aiStr === "true" ? true : aiStr === "false" ? false : undefined;

  const lang = sp.get("lang") ?? undefined;

  const result = await fetchWeather({
    lat,
    lon,
    days,
    ai,
    units: units as "metric" | "imperial" | undefined,
    lang,
  });

  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status });
  }

  const headers: Record<string, string> = {};
  if (result.cacheStatus) {
    headers["X-Cache"] = result.cacheStatus;
  }

  return NextResponse.json(result.data, { status: 200, headers });
}
