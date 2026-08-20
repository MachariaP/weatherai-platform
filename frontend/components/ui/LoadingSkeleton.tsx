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
    <section aria-label="Loading current weather">
      <div className="mb-5 space-y-2">
        <Pulse className="h-9 w-56 sm:w-72" />
        <Pulse className="h-3.5 w-36" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]">
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="mb-6 flex items-center justify-between">
            <Pulse className="h-3 w-32" />
            <Pulse className="h-5 w-14 rounded-full" />
          </div>
          <Pulse className="h-16 w-40 sm:h-20 sm:w-48" />
          <Pulse className="mt-3 h-5 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-card border border-border bg-surface p-4">
              <Pulse className="h-3 w-14" />
              <Pulse className="h-6 w-20" />
              <Pulse className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ForecastSkeleton({ days = 7 }: { days?: number }) {
  const count = days === 3 || days === 5 ? days : 7;
  return (
    <section aria-label={`Loading ${count}-day forecast`}>
      <Pulse className="mb-3 h-3.5 w-28" />
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < count - 1 ? "border-b border-border" : ""
            }`}
          >
            <Pulse className="h-4 w-16" />
            <Pulse className="h-5 w-5 rounded-full" />
            <Pulse className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HourlySkeleton() {
  return (
    <section aria-label="Loading hourly forecast">
      <Pulse className="mb-3 h-3.5 w-28" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-[4.5rem] shrink-0 space-y-2.5 rounded-card border border-border bg-surface px-2 py-3"
          >
            <Pulse className="mx-auto h-3 w-8" />
            <Pulse className="mx-auto h-6 w-6 rounded-full" />
            <Pulse className="mx-auto h-3.5 w-8" />
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
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <div className="h-1 bg-accent/40" />
      <div className="space-y-3 p-5">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-4/5" />
      </div>
    </section>
  );
}

interface WeatherLoadingProps {
  showAi?: boolean;
  forecastDays?: number;
}

export function WeatherLoading({ showAi = false, forecastDays = 7 }: WeatherLoadingProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="space-y-6 pt-2 sm:space-y-8"
    >
      <p className="sr-only">Loading weather</p>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <CurrentWeatherSkeleton />
          <HourlySkeleton />
        </div>
        <div className="space-y-8 lg:col-span-4">
          {showAi ? <AiSummarySkeleton /> : null}
          <ForecastSkeleton days={forecastDays} />
        </div>
      </div>
    </div>
  );
}
