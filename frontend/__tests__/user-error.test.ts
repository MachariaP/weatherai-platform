import { describe, it, expect } from "vitest";
import { userFacingError } from "@/lib/user-error";

describe("userFacingError", () => {
  it("maps 503-style backend unavailability", () => {
    const copy = userFacingError({
      error: "backend_unavailable",
      message: "Backend is unreachable",
    });
    expect(copy.title).toBe("Weather unavailable");
    expect(copy.body).toMatch(/not available/i);
    expect(copy.body).not.toMatch(/backend/i);
  });

  it("maps timeout without exposing internals", () => {
    const copy = userFacingError({
      error: "backend_timeout",
      message: "Backend did not respond in time",
    });
    expect(copy.title).toBe("Request timed out");
    expect(copy.body).toMatch(/too long/i);
  });

  it("keeps a short validation message for invalid coordinates", () => {
    const copy = userFacingError({
      error: "bad_request",
      message: "lat must be between -90 and 90",
    });
    expect(copy.title).toBe("Invalid coordinates");
    expect(copy.body).toBe("lat must be between -90 and 90");
  });

  it("strips stack traces and file paths", () => {
    const copy = userFacingError({
      error: "mystery",
      message: "Error: boom\n    at fetchWeather (/app/lib/api-client.ts:120)",
    });
    expect(copy.body).toBe("Something went wrong. Try again in a moment.");
    expect(copy.body).not.toMatch(/api-client/);
    expect(copy.body).not.toMatch(/Error: boom/);
  });

  it("strips URLs and secrets", () => {
    const url = userFacingError({
      error: "mystery",
      message: "Failed http://127.0.0.1:8000/weather",
    });
    expect(url.body).not.toMatch(/http/);
    expect(url.body).not.toMatch(/8000/);

    const secret = userFacingError({
      error: "mystery",
      message: "Invalid API_KEY=sk-live-123",
    });
    expect(secret.body).not.toMatch(/API_KEY/);
    expect(secret.body).not.toMatch(/sk-live/);
  });
});
