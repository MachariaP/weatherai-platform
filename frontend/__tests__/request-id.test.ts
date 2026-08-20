import { describe, it, expect } from "vitest";
import { resolveRequestId } from "@/lib/request-id";

describe("resolveRequestId", () => {
  it("reuses a safe incoming id", () => {
    expect(resolveRequestId("trace-id-from-proxy")).toBe("trace-id-from-proxy");
  });

  it("generates a uuid when incoming is missing or unsafe", () => {
    const generated = resolveRequestId("nope");
    expect(generated).not.toBe("nope");
    expect(generated.length).toBeGreaterThanOrEqual(8);
    expect(resolveRequestId(null).length).toBeGreaterThanOrEqual(8);
  });
});
