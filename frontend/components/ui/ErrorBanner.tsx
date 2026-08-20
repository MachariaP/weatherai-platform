"use client";

import type { WeatherError } from "@/lib/types";
import { userFacingError } from "@/lib/user-error";
import { AlertIcon, RefreshIcon } from "./icons";

interface ErrorBannerProps {
  error: WeatherError;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const { title, body } = userFacingError(error);

  return (
    <div
      role="alert"
      className="rounded-panel border border-error/30 bg-error/10 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-error/25 bg-error/15 text-error">
          <AlertIcon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <p className="mt-1 text-sm text-text-secondary">{body}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-error/30 px-4 text-sm font-semibold text-error transition-colors hover:bg-error/10"
          >
            <RefreshIcon className="h-4 w-4" />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
