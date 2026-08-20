/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SettingsPanel } from "@/components/weather/SettingsPanel";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}

describe("SettingsPanel", () => {
  it("exposes temperature units and AI insights", () => {
    render(<SettingsPanel />, { wrapper });
    expect(screen.getByRole("heading", { name: "Settings" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Temperature units" })).toBeDefined();
    expect(screen.getByRole("switch", { name: "AI insights" })).toBeDefined();
  });

  it("switches units from metric to imperial", () => {
    render(<SettingsPanel />, { wrapper });
    const fahrenheit = screen.getByRole("button", { name: "Fahrenheit" });
    expect(screen.getByRole("button", { name: "Celsius" }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    fireEvent.click(fahrenheit);
    expect(fahrenheit.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("units")).toBe("imperial");
  });

  it("toggles the AI preference on and off", () => {
    render(<SettingsPanel />, { wrapper });
    const toggle = screen.getByRole("switch", { name: "AI insights" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("ai")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });
});
