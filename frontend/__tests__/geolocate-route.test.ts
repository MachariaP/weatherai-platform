import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/geolocate/route";

vi.mock("@/lib/api-client", () => ({
  fetchGeolocate: vi.fn(),
}));

import { fetchGeolocate } from "@/lib/api-client";
const mockFetchGeolocate = vi.mocked(fetchGeolocate);

afterEach(() => {
  vi.clearAllMocks();
});

function makeRequest(headers?: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/geolocate", { headers });
}

describe("GET /api/geolocate", () => {
  it("returns coordinates when FastAPI succeeds", async () => {
    mockFetchGeolocate.mockResolvedValue({
      ok: true,
      data: { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" },
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      lat: -1.2864,
      lon: 36.8172,
      label: "Nairobi, Kenya",
    });
  });

  it("does not leak internals when fetchGeolocate throws", async () => {
    mockFetchGeolocate.mockRejectedValue(new Error("ECONNREFUSED ipwho"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("backend_unavailable");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("ipwho");
  });

  it("forwards the caller address for IP approximation", async () => {
    mockFetchGeolocate.mockResolvedValue({
      ok: true,
      data: { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" },
    });
    await GET(makeRequest({ "x-forwarded-for": "8.8.8.8" }));
    expect(mockFetchGeolocate).toHaveBeenCalledWith("8.8.8.8");
  });
});
