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
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <div className="h-1 bg-accent" />
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <SparkleIcon className="h-4 w-4 text-accent" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            AI insights
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{body}</p>
      </div>
    </section>
  );
}
