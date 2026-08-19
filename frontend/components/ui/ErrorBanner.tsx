"use client";

import type { WeatherError } from "@/lib/types";

interface ErrorBannerProps {
  error: WeatherError;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 flex items-start gap-3">
      <span className="text-xl">⚠️</span>
      <div className="flex-1">
        <p className="font-medium text-[var(--danger)]">{error.error}</p>
        <p className="text-sm text-[var(--muted)] mt-1">{error.message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-[var(--danger)]/30 px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
