import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/reverse/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-client", () => ({
  fetchReverse: vi.fn(),
}));

import { fetchReverse } from "@/lib/api-client";
const mockFetchReverse = vi.mocked(fetchReverse);

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/reverse");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/reverse", () => {
  it("returns 400 for lat out of range", async () => {
    const res = await GET(makeRequest({ lat: "91", lon: "0" }));
    expect(res.status).toBe(400);
    expect(mockFetchReverse).not.toHaveBeenCalled();
  });

  it("returns 400 for lon out of range", async () => {
    const res = await GET(makeRequest({ lat: "0", lon: "181" }));
    expect(res.status).toBe(400);
    expect(mockFetchReverse).not.toHaveBeenCalled();
  });

  it("returns a label when FastAPI succeeds", async () => {
    mockFetchReverse.mockResolvedValue({
      ok: true,
      data: { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" },
    });
    const res = await GET(makeRequest({ lat: "-1.2864", lon: "36.8172" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      lat: -1.2864,
      lon: 36.8172,
      label: "Nairobi, Kenya",
    });
  });

  it("forwards a 404 from FastAPI", async () => {
    mockFetchReverse.mockResolvedValue({
      ok: false,
      status: 404,
      error: { error: "not_found", message: "No place name for these coordinates" },
    });
    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });

  it("does not leak internals when fetchReverse throws", async () => {
    mockFetchReverse.mockRejectedValue(new Error("ECONNREFUSED nominatim"));
    const res = await GET(makeRequest({ lat: "0", lon: "0" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("backend_unavailable");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("nominatim");
  });
});
