import { describe, it, expect } from "vitest";
import { atmosphereCategory } from "@/lib/atmosphere";

describe("atmosphereCategory", () => {
  it("maps clear sky", () => {
    expect(atmosphereCategory(0)).toBe("CLEAR");
  });

  it("maps partly cloudy", () => {
    expect(atmosphereCategory(1)).toBe("PARTLY_CLOUDY");
    expect(atmosphereCategory(2)).toBe("PARTLY_CLOUDY");
  });

  it("maps overcast", () => {
    expect(atmosphereCategory(3)).toBe("CLOUDY");
  });

  it("maps rain and heavy rain separately", () => {
    expect(atmosphereCategory(61)).toBe("RAIN");
    expect(atmosphereCategory(65)).toBe("HEAVY_RAIN");
    expect(atmosphereCategory(82)).toBe("HEAVY_RAIN");
  });

  it("maps snow, fog, and storm", () => {
    expect(atmosphereCategory(71)).toBe("SNOW");
    expect(atmosphereCategory(45)).toBe("FOG");
    expect(atmosphereCategory(95)).toBe("STORM");
  });

  it("falls back to unknown", () => {
    expect(atmosphereCategory(999)).toBe("UNKNOWN");
    expect(atmosphereCategory(null)).toBe("UNKNOWN");
    expect(atmosphereCategory(Number.NaN)).toBe("UNKNOWN");
  });
});
