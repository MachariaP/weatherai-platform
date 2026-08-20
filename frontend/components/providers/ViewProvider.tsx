"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type AppView = "dashboard" | "forecast" | "insights" | "settings";

interface ViewContextValue {
  view: AppView;
  setView: (view: AppView) => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<AppView>("dashboard");
  const setView = useCallback((next: AppView) => setViewState(next), []);
  return (
    <ViewContext.Provider value={{ view, setView }}>{children}</ViewContext.Provider>
  );
}

export function useAppView(): ViewContextValue {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useAppView must be inside ViewProvider");
  return ctx;
}
