"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Units = "metric" | "imperial";

export interface PreferencesContextValue {
  units: Units;
  aiEnabled: boolean;
  setUnits: (u: Units) => void;
  setAiEnabled: (v: boolean) => void;
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

function getServerUnits(): Units {
  return "metric";
}

function getServerAi(): boolean {
  return false;
}

/**
 * User display preferences.
 *
 * Units default to metric. AI summaries stay off until the user opts in,
 * because upstream AI data is optional and quota-limited.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const units = useSyncExternalStore(subscribeUnits, getStoredUnits, getServerUnits);
  const aiEnabled = useSyncExternalStore(subscribeAi, getStoredAi, getServerAi);

  const setUnits = useCallback((u: Units) => {
    localStorage.setItem("units", u);
    unitsListeners.forEach((l) => l());
  }, []);

  const setAiEnabled = useCallback((v: boolean) => {
    localStorage.setItem("ai", String(v));
    aiListeners.forEach((l) => l());
  }, []);

  return (
    <PreferencesContext.Provider value={{ units, aiEnabled, setUnits, setAiEnabled }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be inside PreferencesProvider");
  return ctx;
}
