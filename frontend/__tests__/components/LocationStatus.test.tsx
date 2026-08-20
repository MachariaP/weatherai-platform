/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import Home from "@/app/page";
import { Header } from "@/components/ui/Header";
import { LocationProvider } from "@/components/providers/LocationProvider";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";

afterEach(cleanup);

function wrapper({ children }: { children: ReactNode }) {
  return (
    <LocationProvider>
      <PreferencesProvider>
        <Header />
        {children}
      </PreferencesProvider>
    </LocationProvider>
  );
}

describe("homepage shell", () => {
  it("starts with a lookup prompt instead of weather cards", () => {
    render(<Home />, { wrapper });
    expect(screen.getByRole("heading", { name: "Look up the weather" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Current weather" })).toBeNull();
    expect(screen.queryByRole("region", { name: "7-day forecast" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Hourly forecast" })).toBeNull();
  });
});
