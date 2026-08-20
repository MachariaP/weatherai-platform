"use client";

import { UnitToggle } from "@/components/ui/UnitToggle";
import { AiToggle } from "@/components/ui/AiToggle";
import { ForecastDaysToggle } from "@/components/ui/ForecastDaysToggle";
import { SavedPlacesList } from "@/components/weather/SavedPlacesList";
import { useLocation } from "@/components/providers/LocationProvider";
import { useAppView } from "@/components/providers/ViewProvider";

function CompareEntry() {
  const { favorites } = useLocation();
  const { setView } = useAppView();
  if (favorites.length < 2) return null;
  return (
    <section aria-label="Compare saved places" className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-sm font-medium text-text">Compare places</h2>
      <p className="mt-1 text-xs text-text-muted">
        Load weather for two saved places only after you choose them. AI is not requested.
      </p>
      <button
        type="button"
        className="focus-ring mt-3 inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-strong"
        onClick={() => setView("compare")}
      >
        Compare saved places
      </button>
    </section>
  );
}

export function SettingsPanel() {
  return (
    <section aria-label="Settings" className="mx-auto max-w-lg space-y-6 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Settings</h1>
      <p className="text-sm text-text-secondary">
        Units, forecast range, and AI insight preferences are stored in this browser.
        Saved places stay on this device and are not synced.
      </p>
      <div className="space-y-4 rounded-card border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text">Temperature units</p>
            <p className="text-xs text-text-muted">Applies to the next weather request.</p>
          </div>
          <UnitToggle />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text">Forecast range</p>
            <p className="text-xs text-text-muted">
              Requests 3, 5, or 7 daily rows. Default is 7 days.
            </p>
          </div>
          <ForecastDaysToggle />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text">AI insights</p>
            <p className="text-xs text-text-muted">
              Requests a summary when the backend can provide one.
            </p>
          </div>
          <AiToggle />
        </div>
      </div>
      <SavedPlacesList />
      <CompareEntry />
    </section>
  );
}
