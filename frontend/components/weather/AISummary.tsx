"use client";

interface Props {
  summary: string;
}

export function AISummary({ summary }: Props) {
  return (
    <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">🤖</span>
        <span className="text-xs font-medium text-[var(--accent)]">
          AI-generated summary
        </span>
      </div>
      <p className="text-sm text-[var(--foreground)] leading-relaxed">
        {summary}
      </p>
    </div>
  );
}
