"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";

export function AiToggle() {
  const { aiEnabled, setAiEnabled } = usePreferences();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={aiEnabled}
      aria-label="AI insights"
      onClick={() => setAiEnabled(!aiEnabled)}
      className={`focus-ring inline-flex h-10 w-14 shrink-0 items-center justify-center rounded-control border px-2 transition-colors ${
        aiEnabled
          ? "border-accent/30 bg-accent/15"
          : "border-border bg-surface hover:border-border-strong"
      }`}
    >
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
