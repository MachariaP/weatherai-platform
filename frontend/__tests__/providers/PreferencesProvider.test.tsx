/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  PreferencesProvider,
  usePreferences,
} from "@/components/providers/PreferencesProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("PreferencesProvider", () => {
  it("defaults to metric units, AI disabled, and 7-day forecast", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    expect(result.current.units).toBe("metric");
    expect(result.current.aiEnabled).toBe(false);
    expect(result.current.forecastDays).toBe(7);
  });

  it("updates units to imperial", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => {
      result.current.setUnits("imperial");
    });

    expect(result.current.units).toBe("imperial");
    expect(localStorage.getItem("units")).toBe("imperial");
  });

  it("can switch units back to metric", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => result.current.setUnits("imperial"));
    act(() => result.current.setUnits("metric"));

    expect(result.current.units).toBe("metric");
    expect(localStorage.getItem("units")).toBe("metric");
  });

  it("enables the AI preference when opted in", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => {
      result.current.setAiEnabled(true);
    });

    expect(result.current.aiEnabled).toBe(true);
    expect(localStorage.getItem("ai")).toBe("true");
  });

  it("can disable AI after it was enabled", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => result.current.setAiEnabled(true));
    act(() => result.current.setAiEnabled(false));

    expect(result.current.aiEnabled).toBe(false);
    expect(localStorage.getItem("ai")).toBe("false");
  });

  it("reads stored units, AI, and forecast range", () => {
    localStorage.setItem("units", "imperial");
    localStorage.setItem("ai", "true");
    localStorage.setItem("forecastDays", "3");

    const { result } = renderHook(() => usePreferences(), { wrapper });

    expect(result.current.units).toBe("imperial");
    expect(result.current.aiEnabled).toBe(true);
    expect(result.current.forecastDays).toBe(3);
  });

  it("selects 3, 5, and 7 day ranges and persists them", () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => result.current.setForecastDays(3));
    expect(result.current.forecastDays).toBe(3);
    expect(localStorage.getItem("forecastDays")).toBe("3");

    act(() => result.current.setForecastDays(5));
    expect(result.current.forecastDays).toBe(5);

    act(() => result.current.setForecastDays(7));
    expect(result.current.forecastDays).toBe(7);
    expect(localStorage.getItem("forecastDays")).toBe("7");
  });

  it("falls back to 7 when stored forecast days are invalid", () => {
    localStorage.setItem("forecastDays", "4");
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.forecastDays).toBe(7);
  });

  it("ignores stored AI values other than true", () => {
    localStorage.setItem("ai", "yes");

    const { result } = renderHook(() => usePreferences(), { wrapper });

    expect(result.current.aiEnabled).toBe(false);
  });

  it("throws when used outside PreferencesProvider", () => {
    expect(() => renderHook(() => usePreferences())).toThrow(
      /must be inside PreferencesProvider/
    );
  });
});
