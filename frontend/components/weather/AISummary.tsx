"use client";

import type { WeatherError } from "@/lib/types";
import { SparkleIcon } from "@/components/ui/icons";

interface Props {
  enabled: boolean;
  summary: string | null;
  error?: WeatherError | null;
}

/**
 * AI insight is optional. This component never invents a summary.
 *
 * - disabled: render nothing
 * - enabled + summary: show the backend text
 * - enabled + null/empty: honest unavailable state
 * - enabled + request error: safe failure, no fabricated copy
 */
export function AISummary({ enabled, summary, error = null }: Props) {
  if (!enabled) return null;

  const text = summary?.trim() ?? "";

  let body: string;
  if (error && !text) {
    body = "AI insight could not be loaded for this request.";
  } else if (!text) {
    body = "No AI summary is available for this location.";
  } else {
    body = text;
  }

  return (
    <section
      aria-label="AI weather insight"
      className="rounded-panel border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="mb-3.5 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-accent-secondary">
          <SparkleIcon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text">AI insight</h2>
          <p className="text-[11px] text-text-muted">
            {text ? "From the weather service" : "Optional"}
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-[15px]">
        {body}
      </p>
    </section>
  );
}
