"use client";

import { useAppView, type AppView } from "@/components/providers/ViewProvider";
import { CalendarIcon, DashboardIcon, SettingsIcon, SparkleIcon } from "./icons";

const TABS: { view: AppView; label: string; icon: typeof DashboardIcon }[] = [
  { view: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { view: "forecast", label: "Forecast", icon: CalendarIcon },
  { view: "insights", label: "AI Insights", icon: SparkleIcon },
  { view: "settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav() {
  const { view, setView } = useAppView();

  return (
    <nav
      aria-label="Mobile views"
      className="lg:hidden fixed bottom-0 z-50 w-full border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-16 items-center justify-around">
        {TABS.map((tab) => {
          const active = view === tab.view;
          const Icon = tab.icon;
          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => setView(tab.view)}
              aria-current={active ? "page" : undefined}
              className={`focus-ring flex h-full w-full flex-col items-center justify-center text-[12px] font-medium tracking-[0.04em] transition-colors ${
                active ? "font-bold text-accent" : "text-text-muted hover:text-accent"
              }`}
            >
              <span
                className={`mb-1 ${active ? "rounded-full bg-accent/20 px-4 py-1" : ""}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
