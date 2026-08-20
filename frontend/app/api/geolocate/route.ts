/**
 * Next.js Route Handler: GET /api/geolocate
 *
 * Thin proxy to FastAPI /geolocate (IP approximation when browser GPS fails).
 * Forwards the browser's address so FastAPI can look it up; never returns IPs.
 */

import { NextResponse } from "next/server";
import { fetchGeolocate } from "@/lib/api-client";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function clientForwardedFor(request: Request): string | null {
  return request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
}

export async function GET(request: Request) {
  try {
    const result = await fetchGeolocate(clientForwardedFor(request));
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
