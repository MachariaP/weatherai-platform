import { describe, it, expect } from "vitest";
import { locationHref, parseLocationSearch } from "@/lib/location-url";

describe("location URL", () => {
  it("parses valid coordinates", () => {
    expect(parseLocationSearch("?lat=-1.2921&lon=36.8219")).toEqual({
      status: "valid",
      lat: -1.2921,
      lon: 36.8219,
    });
  });

  it("treats a missing pair as absent", () => {
    expect(parseLocationSearch("")).toEqual({ status: "absent" });
    expect(parseLocationSearch("?q=Nairobi")).toEqual({ status: "absent" });
  });

  it("rejects out-of-range or incomplete coordinates", () => {
    expect(parseLocationSearch("?lat=999&lon=999")).toEqual({ status: "invalid" });
    expect(parseLocationSearch("?lat=-1.29")).toEqual({ status: "invalid" });
    expect(parseLocationSearch("?lat=abc&lon=1")).toEqual({ status: "invalid" });
  });

  it("builds the canonical href from coordinates", () => {
    expect(locationHref(-1.2921, 36.8219)).toBe("/?lat=-1.2921&lon=36.8219");
  });
});
