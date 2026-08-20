import { describe, it, expect } from "vitest";
import {
  RECENT_MAX,
  parseRecentLocations,
  rememberRecentLocation,
} from "@/lib/recent-locations";

describe("recent locations", () => {
  it("recovers from corrupt JSON", () => {
    expect(parseRecentLocations("{not json")).toEqual([]);
    expect(parseRecentLocations("null")).toEqual([]);
    expect(parseRecentLocations("[1,2]")).toEqual([]);
  });

  it("keeps valid entries and drops malformed ones", () => {
    const parsed = parseRecentLocations(
      JSON.stringify([
        { lat: -1.2921, lon: 36.8219, label: "Nairobi, Kenya" },
        { lat: 999, lon: 0, label: "bad" },
        { lat: 0, lon: 0 },
        { lat: 51.5, lon: -0.1, label: "London" },
      ])
    );
    expect(parsed.map((item) => item.label)).toEqual(["Nairobi, Kenya", "London"]);
  });

  it("moves duplicates to the front and caps size", () => {
    const seed = Array.from({ length: RECENT_MAX }, (_, i) => ({
      lat: i,
      lon: i,
      label: `Place ${i}`,
    }));
    const next = rememberRecentLocation({ lat: 0, lon: 0, label: "Place 0 updated" }, seed);
    expect(next).toHaveLength(RECENT_MAX);
    expect(next[0].label).toBe("Place 0 updated");
    expect(next.filter((item) => item.lat === 0 && item.lon === 0)).toHaveLength(1);
  });
});
