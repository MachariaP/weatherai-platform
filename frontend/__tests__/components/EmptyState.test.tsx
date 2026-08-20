/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EmptyState } from "@/components/weather/EmptyState";
import { LocationProvider } from "@/components/providers/LocationProvider";

afterEach(cleanup);

function renderEmpty() {
  return render(
    <LocationProvider>
      <EmptyState />
    </LocationProvider>
  );
}

describe("EmptyState", () => {
  it("explains the product and the first step", () => {
    renderEmpty();
    expect(screen.getByText("Your weather, at a glance.")).toBeDefined();
    expect(
      screen.getByText(/Enter coordinates or use your location/)
    ).toBeDefined();
  });

  it("offers both primary actions", () => {
    renderEmpty();
    expect(
      screen.getByRole("button", { name: /use my location/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /search by coordinates/i })
    ).toBeDefined();
  });

  it("renders capability chips", () => {
    renderEmpty();
    expect(screen.getByText("7-day forecast")).toBeDefined();
    expect(screen.getByText("Hourly outlook")).toBeDefined();
    expect(screen.getByText("AI insights")).toBeDefined();
  });

  it("does not surface a geolocation error initially", () => {
    renderEmpty();
    expect(screen.queryByRole("status")).toBeNull();
  });
});