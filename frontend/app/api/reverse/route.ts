/**
 * Next.js Route Handler: GET /api/reverse
 *
 * Thin proxy to FastAPI /reverse.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchReverse } from "@/lib/api-client";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json(
      { error: "bad_request", message: "lat must be a number between -90 and 90" },
      { status: 400, headers: NO_STORE }
    );
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "bad_request", message: "lon must be a number between -180 and 180" },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const result = await fetchReverse(lat, lon);
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
