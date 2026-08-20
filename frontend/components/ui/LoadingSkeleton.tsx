"use client";

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-border/60 motion-safe:animate-pulse ${className}`}
    />
  );
}

export function CurrentWeatherSkeleton() {
  return (
    <section
      aria-label="Loading current weather"
      className="rounded-panel border border-border bg-card p-5 shadow-card sm:p-7"
    >
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-5 w-44" />
        </div>
        <Pulse className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5 sm:gap-6">
          <Pulse className="h-20 w-20 rounded-2xl sm:h-24 sm:w-24" />
          <div className="space-y-3">
            <Pulse className="h-12 w-40 sm:h-14 sm:w-48" />
            <Pulse className="h-5 w-32" />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 lg:max-w-xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="space-y-2 rounded-xl border border-border bg-surface/70 p-3.5"
            >
              <Pulse className="h-3 w-14" />
              <Pulse className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ForecastSkeleton() {
  return (
    <section aria-label="Loading 7-day forecast">
      <Pulse className="mb-3 h-3.5 w-28" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-card border border-border bg-card p-3.5"
          >
            <Pulse className="mx-auto h-3 w-14" />
            <Pulse className="mx-auto h-8 w-8 rounded-full" />
            <Pulse className="mx-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HourlySkeleton() {
  return (
    <section aria-label="Loading hourly forecast">
      <Pulse className="mb-3 h-3.5 w-24" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-24 shrink-0 space-y-2.5 rounded-card border border-border bg-card p-3"
          >
            <Pulse className="mx-auto h-3 w-10" />
            <Pulse className="mx-auto h-7 w-7 rounded-full" />
            <Pulse className="mx-auto h-3.5 w-9" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AiSummarySkeleton() {
  return (
    <section
      aria-label="Loading AI insight"
      className="space-y-3 rounded-panel border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center gap-3">
        <Pulse className="h-9 w-9 rounded-xl" />
        <div className="space-y-2">
          <Pulse className="h-3.5 w-24" />
          <Pulse className="h-3 w-32" />
        </div>
      </div>
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-4/5" />
    </section>
  );
}

interface WeatherLoadingProps {
  showAi?: boolean;
}

export function WeatherLoading({ showAi = false }: WeatherLoadingProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="space-y-6 pt-4 sm:space-y-8"
    >
      <p className="sr-only">Loading weather</p>
      <CurrentWeatherSkeleton />
      {showAi ? <AiSummarySkeleton /> : null}
      <HourlySkeleton />
      <ForecastSkeleton />
    </div>
  );
}
