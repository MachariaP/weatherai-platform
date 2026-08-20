"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_FORECAST_DAYS,
  FORECAST_DAYS_STORAGE_KEY,
  parseForecastDays,
  type ForecastDays,
} from "@/lib/forecast-days";

export type Units = "metric" | "imperial";

export interface PreferencesContextValue {
  units: Units;
  aiEnabled: boolean;
  forecastDays: ForecastDays;
  setUnits: (u: Units) => void;
  setAiEnabled: (v: boolean) => void;
  setForecastDays: (days: ForecastDays) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function getStoredUnits(): Units {
  if (typeof window === "undefined") return "metric";
  return localStorage.getItem("units") === "imperial" ? "imperial" : "metric";
}

function getStoredAi(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ai") === "true";
}

function getStoredForecastDays(): ForecastDays {
  if (typeof window === "undefined") return DEFAULT_FORECAST_DAYS;
  return parseForecastDays(localStorage.getItem(FORECAST_DAYS_STORAGE_KEY));
}

let unitsListeners: Array<() => void> = [];
function subscribeUnits(cb: () => void) {
  unitsListeners.push(cb);
  return () => {
    unitsListeners = unitsListeners.filter((l) => l !== cb);
  };
}

let aiListeners: Array<() => void> = [];
function subscribeAi(cb: () => void) {
  aiListeners.push(cb);
  return () => {
    aiListeners = aiListeners.filter((l) => l !== cb);
  };
}

let forecastListeners: Array<() => void> = [];
function subscribeForecastDays(cb: () => void) {
  forecastListeners.push(cb);
  return () => {
    forecastListeners = forecastListeners.filter((l) => l !== cb);
  };
}

function getServerUnits(): Units {
  return "metric";
}

function getServerAi(): boolean {
  return false;
}

function getServerForecastDays(): ForecastDays {
  return DEFAULT_FORECAST_DAYS;
}

/**
 * User display preferences.
 *
 * Units default to metric. AI summaries stay off until the user opts in.
 * Forecast range defaults to 7 days and is a viewing preference only —
 * it is not part of the shareable location URL.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const units = useSyncExternalStore(subscribeUnits, getStoredUnits, getServerUnits);
  const aiEnabled = useSyncExternalStore(subscribeAi, getStoredAi, getServerAi);
  const forecastDays = useSyncExternalStore(
    subscribeForecastDays,
    getStoredForecastDays,
    getServerForecastDays
  );

  const setUnits = useCallback((u: Units) => {
    localStorage.setItem("units", u);
    unitsListeners.forEach((l) => l());
  }, []);

  const setAiEnabled = useCallback((v: boolean) => {
    localStorage.setItem("ai", String(v));
    aiListeners.forEach((l) => l());
  }, []);

  const setForecastDays = useCallback((days: ForecastDays) => {
    localStorage.setItem(FORECAST_DAYS_STORAGE_KEY, String(days));
    forecastListeners.forEach((l) => l());
  }, []);

  return (
    <PreferencesContext.Provider
      value={{ units, aiEnabled, forecastDays, setUnits, setAiEnabled, setForecastDays }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be inside PreferencesProvider");
  return ctx;
}
