"use client";

import { LocationSwitcher } from "./LocationSwitcher";
import { MyLocationButton } from "./MyLocationButton";
import { WeatherLogo } from "./WeatherLogo";
import { useLocation } from "@/components/providers/LocationProvider";
import { useAppView } from "@/components/providers/ViewProvider";
import { CalendarIcon, DashboardIcon, SettingsIcon } from "./icons";

export function Header() {
  const { detecting, error, location } = useLocation();
  const { view, setView } = useAppView();

  const statusMessage = detecting
    ? "Finding your location"
    : error
      ? error
      : location
        ? `Location set to ${location.label}`
        : "";

  const navClass = (active: boolean) =>
    `focus-ring inline-flex items-center gap-1 border-b-2 pb-1 text-[12px] font-medium tracking-[0.05em] transition-colors ${
      active
        ? "border-accent font-bold text-accent"
        : "border-transparent text-text-muted hover:text-accent"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-6">
        <div className="flex flex-wrap items-center gap-3 py-3 md:h-[4.25rem] md:flex-nowrap md:gap-4 md:py-0">
          <WeatherLogo />

          <div className="order-3 w-full md:order-2 md:min-w-0 md:flex-1 md:max-w-xl md:mx-auto lg:max-w-2xl">
            <LocationSwitcher />
          </div>

          <div className="order-2 ml-auto flex items-center gap-2 md:order-4 md:ml-0">
            <nav className="hidden items-center gap-4 lg:flex" aria-label="Dashboard views">
              <button
                type="button"
                className={navClass(view === "dashboard")}
                aria-current={view === "dashboard" ? "page" : undefined}
                onClick={() => setView("dashboard")}
              >
                <DashboardIcon className="h-4 w-4" />
                Dashboard
              </button>
              <button
                type="button"
                className={navClass(view === "forecast")}
                aria-current={view === "forecast" ? "page" : undefined}
                onClick={() => setView("forecast")}
              >
                <CalendarIcon className="h-4 w-4" />
                Forecast
              </button>
            </nav>
            <MyLocationButton />
            <button
              type="button"
              aria-label="Settings"
              onClick={() => setView("settings")}
              className="focus-ring grid h-10 w-10 place-items-center rounded-control text-text-muted transition-colors hover:text-accent"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      </div>
    </header>
  );
}
