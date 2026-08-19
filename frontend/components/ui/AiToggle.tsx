"use client";

import { usePreferences } from "@/components/providers/PreferencesProvider";

export function AiToggle() {
  const { aiEnabled, setAiEnabled } = usePreferences();

  return (
    <button
      onClick={() => setAiEnabled(!aiEnabled)}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        aiEnabled
          ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
          : "border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
      title={aiEnabled ? "AI summary enabled (uses limited quota)" : "Enable AI summary"}
    >
      🤖 AI {aiEnabled ? "On" : "Off"}
    </button>
  );
}
