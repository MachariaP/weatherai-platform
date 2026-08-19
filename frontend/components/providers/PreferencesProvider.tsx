"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Units = "metric" | "imperial";

interface PreferencesContextValue {
  units: Units;
  setUnits: (u: Units) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<Units>("metric");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("units");
    if (saved === "imperial") setUnitsState("imperial");
    setHydrated(true);
  }, []);

  const setUnits = useCallback((u: Units) => {
    setUnitsState(u);
    localStorage.setItem("units", u);
  }, []);

  if (!hydrated) return null;

  return (
    <PreferencesContext.Provider value={{ units, setUnits }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be inside PreferencesProvider");
  return ctx;
}
