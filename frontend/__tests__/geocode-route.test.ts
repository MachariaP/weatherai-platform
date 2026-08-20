import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/geocode/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-client", () => ({
  fetchGeocode: vi.fn(),
}));

import { fetchGeocode } from "@/lib/api-client";
const mockFetchGeocode = vi.mocked(fetchGeocode);

function makeRequest(q?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/geocode");
  if (q !== undefined) url.searchParams.set("q", q);
  return new NextRequest(url);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/geocode", () => {
  it("returns 400 for a short query", async () => {
    const res = await GET(makeRequest("a"));
    expect(res.status).toBe(400);
    expect(mockFetchGeocode).not.toHaveBeenCalled();
  });

  it("returns a place when FastAPI succeeds", async () => {
    mockFetchGeocode.mockResolvedValue({
      ok: true,
      data: { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" },
    });
    const res = await GET(makeRequest("Nairobi"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      lat: -1.2864,
      lon: 36.8172,
      label: "Nairobi, Kenya",
    });
  });

  it("forwards a 404 from FastAPI", async () => {
    mockFetchGeocode.mockResolvedValue({
      ok: false,
      status: 404,
      error: { error: "not_found", message: "No matching location" },
    });
    const res = await GET(makeRequest("zzzz"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });

  it("does not leak internals when fetchGeocode throws", async () => {
    mockFetchGeocode.mockRejectedValue(new Error("ECONNREFUSED nominatim"));
    const res = await GET(makeRequest("Nairobi"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("backend_unavailable");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("nominatim");
  });
});
