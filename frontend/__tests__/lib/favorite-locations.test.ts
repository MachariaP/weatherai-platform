import { describe, it, expect } from "vitest";
import {
  FAVORITE_MAX,
  addFavoriteLocation,
  parseFavoriteLocations,
  removeFavoriteLocation,
} from "@/lib/favorite-locations";

const NAIROBI = { lat: -1.2921, lon: 36.8219, label: "Nairobi, Kenya" };
const LONDON = { lat: 51.5074, lon: -0.1278, label: "London, United Kingdom" };

describe("favorite locations", () => {
  it("recovers from corrupt JSON", () => {
    expect(parseFavoriteLocations("{not json")).toEqual([]);
    expect(parseFavoriteLocations("null")).toEqual([]);
    expect(parseFavoriteLocations("[1,2]")).toEqual([]);
  });

  it("keeps valid entries, drops malformed, and ignores weather-like extras", () => {
    const parsed = parseFavoriteLocations(
      JSON.stringify([
        { lat: -1.2921, lon: 36.8219, label: "Nairobi, Kenya", temperature: 22, units: "metric" },
        { lat: 999, lon: 0, label: "bad" },
        { lat: 0, lon: 0 },
        { lat: 51.5, lon: -0.1, label: "London" },
      ])
    );
    expect(parsed).toEqual([
      { lat: -1.2921, lon: 36.8219, label: "Nairobi, Kenya" },
      { lat: 51.5, lon: -0.1, label: "London" },
    ]);
  });

  it("dedupes by rounded coordinates and does not reorder on duplicate add", () => {
    const first = addFavoriteLocation(NAIROBI, []);
    expect(first.status).toBe("added");
    const second = addFavoriteLocation(
      { lat: -1.29214, lon: 36.82194, label: "Nairobi, Kenya" },
      first.status === "added" ? first.items : []
    );
    expect(second.status).toBe("duplicate");
    expect(second.items).toHaveLength(1);
    expect(second.items[0].label).toBe("Nairobi, Kenya");
  });

  it("does not capture units, AI, or forecast days", () => {
    const result = addFavoriteLocation(
      { ...NAIROBI, units: "imperial", ai: true, days: 3 } as typeof NAIROBI,
      []
    );
    expect(result.status).toBe("added");
    if (result.status === "added") {
      expect(result.items[0]).toEqual({
        lat: -1.2921,
        lon: 36.8219,
        label: "Nairobi, Kenya",
      });
    }
  });

  it("appends new favorites without moving existing ones", () => {
    const one = addFavoriteLocation(NAIROBI, []);
    const two = addFavoriteLocation(LONDON, one.status === "added" ? one.items : []);
    expect(two.status).toBe("added");
    if (two.status === "added") {
      expect(two.items.map((item) => item.label)).toEqual([
        "Nairobi, Kenya",
        "London, United Kingdom",
      ]);
    }
  });

  it("rejects additional favorites at the limit without evicting", () => {
    const seed = Array.from({ length: FAVORITE_MAX }, (_, i) => ({
      lat: i,
      lon: i,
      label: `Place ${i}`,
    }));
    const result = addFavoriteLocation(NAIROBI, seed);
    expect(result.status).toBe("full");
    expect(result.items).toHaveLength(FAVORITE_MAX);
    expect(result.items.some((item) => item.label === "Nairobi, Kenya")).toBe(false);
  });

  it("removes by coordinate identity", () => {
    const added = addFavoriteLocation(LONDON, [NAIROBI]);
    const items = added.status === "added" ? added.items : [NAIROBI];
    const next = removeFavoriteLocation({ lat: -1.29214, lon: 36.82194 }, items);
    expect(next.map((item) => item.label)).toEqual(["London, United Kingdom"]);
  });
});
