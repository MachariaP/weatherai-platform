/**
 * Next.js Route Handler: GET /api/geocode
 *
 * Thin proxy to FastAPI /geocode. The browser never talks to the geocoder
 * or WeatherAI.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchGeocode } from "@/lib/api-client";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json(
      { error: "bad_request", message: "Enter a place name or coordinates" },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const result = await fetchGeocode(q);
    if (!result.ok) {
      return NextResponse.json(result.error, {
        status: result.status,
        headers: NO_STORE,
      });
    }
    return NextResponse.json(result.data, { status: 200, headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "backend_unavailable", message: "Backend is unreachable" },
      { status: 503, headers: NO_STORE }
    );
  }
}
