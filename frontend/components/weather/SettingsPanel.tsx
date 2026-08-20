"use client";

import { UnitToggle } from "@/components/ui/UnitToggle";
import { AiToggle } from "@/components/ui/AiToggle";

export function SettingsPanel() {
  return (
    <section aria-label="Settings" className="mx-auto max-w-lg space-y-6 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Settings</h1>
      <p className="text-sm text-text-secondary">
        Units and AI insight preferences are stored in this browser.
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
            <p className="text-sm font-medium text-text">AI insights</p>
            <p className="text-xs text-text-muted">
              Requests a summary when the backend can provide one.
            </p>
          </div>
          <AiToggle />
        </div>
      </div>
    </section>
  );
}
