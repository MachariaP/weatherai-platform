/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ObservedRefresh } from "@/components/weather/ObservedRefresh";

afterEach(cleanup);

describe("ObservedRefresh", () => {
  it("shows Observed clock digits without inventing a time", () => {
    render(
      <ObservedRefresh
        observedAt="2026-08-21T15:15"
        onRefresh={() => {}}
        refreshing={false}
      />
    );
    expect(screen.getByText("Observed 15:15")).toBeDefined();
  });

  it("groups Live/Cached with observation freshness", () => {
    const { rerender } = render(
      <ObservedRefresh
        observedAt="2026-08-21T15:15"
        cacheStatus="HIT"
        onRefresh={() => {}}
        refreshing={false}
      />
    );
    expect(screen.getByText("Cached")).toBeDefined();
    rerender(
      <ObservedRefresh
        observedAt="2026-08-21T15:15"
        cacheStatus="MISS"
        onRefresh={() => {}}
        refreshing={false}
      />
    );
    expect(screen.getByText("Live")).toBeDefined();
  });

  it("keeps Observed independent of refresh clicks", () => {
    const onRefresh = vi.fn();
    render(
      <ObservedRefresh
        observedAt="2026-08-21T09:45"
        cacheStatus="HIT"
        onRefresh={onRefresh}
        refreshing={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Observed 09:45")).toBeDefined();
  });
});
