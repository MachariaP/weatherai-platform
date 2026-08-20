"use client";

import { SparkleIcon } from "@/components/ui/icons";

interface Props {
  summary: string;
}

export function AISummary({ summary }: Props) {
  return (
    <section
      aria-label="AI weather insight"
      className="relative overflow-hidden rounded-panel border border-accent/25 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-5 shadow-card sm:p-6"
    >
      <div className="mb-3.5 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/25 bg-accent/15 text-accent">
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