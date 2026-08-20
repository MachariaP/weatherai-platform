"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";
import { SparkleIcon } from "./icons";

export function AiToggle() {
  const { aiEnabled, setAiEnabled } = usePreferences();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={aiEnabled}
      aria-label="AI insights"
      onClick={() => setAiEnabled(!aiEnabled)}
      className="focus-ring inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 shadow-card transition-colors hover:border-border-strong"
    >
      <SparkleIcon
        className={`h-4 w-4 ${aiEnabled ? "text-accent" : "text-text-muted"}`}
      />
      <span className="hidden text-sm font-medium text-text-secondary sm:inline">
        AI insights
      </span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          aiEnabled ? "bg-accent" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            aiEnabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}