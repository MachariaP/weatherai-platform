"use client";

import { SparkleIcon } from "@/components/ui/icons";

interface Props {
  summary: string;
}

export function AISummary({ summary }: Props) {
  return (
    <section
      aria-label="AI weather insight"
      className="rounded-panel border border-accent/20 bg-accent/5 p-5 shadow-card sm:p-6"
    >
      <div className="mb-3.5 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface text-accent-secondary">
          <SparkleIcon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text">AI insight</h2>
          <p className="text-[11px] text-text-muted">AI-generated summary</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary sm:text-[15px]">
        {summary}
      </p>
    </section>
  );
}