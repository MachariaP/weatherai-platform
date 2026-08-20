/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

describe("Phase 5 application shell", () => {
  it("starts with a lookup prompt instead of weather cards", () => {
    render(<Home />, { wrapper });
    expect(screen.getByRole("heading", { name: "Look up the weather" })).toBeDefined();
    expect(screen.queryByText(/7-day forecast/i)).toBeNull();
    expect(screen.queryByText(/hourly/i)).toBeNull();
  });

  it("shows selected coordinates after a valid search", () => {
    render(<Home />, { wrapper });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-1.2921" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "36.8219" } });
    fireEvent.submit(screen.getByRole("form", { name: "Search by coordinates" }));
    expect(screen.getByRole("heading", { name: "Location ready" })).toBeDefined();
    expect(screen.getByText("-1.2921")).toBeDefined();
    expect(screen.getByText("36.8219")).toBeDefined();
  });
});
