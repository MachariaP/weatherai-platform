/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

afterEach(cleanup);

describe("ErrorBanner", () => {
  it("maps backend_unavailable to a safe 503-style message", () => {
    render(
      <ErrorBanner
        error={{ error: "backend_unavailable", message: "Backend is unreachable" }}
      />
    );
    expect(screen.getByText("Weather unavailable")).toBeDefined();
    expect(screen.getByText(/not available right now/i)).toBeDefined();
    expect(screen.queryByText("Backend is unreachable")).toBeNull();
  });

  it("maps bad_request to Invalid coordinates", () => {
    render(
      <ErrorBanner
        error={{ error: "bad_request", message: "lat must be between -90 and 90" }}
      />
    );
    expect(screen.getByText("Invalid coordinates")).toBeDefined();
    expect(screen.getByText("lat must be between -90 and 90")).toBeDefined();
  });

  it("maps timeout to Request timed out", () => {
    render(
      <ErrorBanner error={{ error: "timeout", message: "did not respond" }} />
    );
    expect(screen.getByText("Request timed out")).toBeDefined();
    expect(screen.getByText(/too long/i)).toBeDefined();
  });

  it("uses a generic title for unknown codes", () => {
    render(<ErrorBanner error={{ error: "mystery", message: "x" }} />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("never renders the raw error code as visible text", () => {
    render(<ErrorBanner error={{ error: "backend_timeout", message: "slow" }} />);
    expect(screen.queryByText("backend_timeout")).toBeNull();
  });

  it("never renders stack traces or internal URLs", () => {
    render(
      <ErrorBanner
        error={{
          error: "mystery",
          message: "TypeError at /app/lib/api-client.ts http://localhost:8000",
        }}
      />
    );
    expect(screen.queryByText(/api-client/)).toBeNull();
    expect(screen.queryByText(/localhost/)).toBeNull();
    expect(screen.getByText(/try again/i)).toBeDefined();
  });

  it("calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(
      <ErrorBanner
        error={{ error: "upstream_error", message: "Weather service temporarily unavailable" }}
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits retry when no handler is given", () => {
    render(<ErrorBanner error={{ error: "upstream_error", message: "x" }} />);
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("is announced as an alert region", () => {
    render(<ErrorBanner error={{ error: "upstream_error", message: "x" }} />);
    expect(screen.getByRole("alert")).toBeDefined();
  });
});
