"use client";

function Pulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--card-border)]/50 ${className}`}
    />
  );
}

export function CurrentWeatherSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 space-y-4">
      <Pulse className="h-5 w-32" />
      <Pulse className="h-16 w-40" />
      <div className="flex gap-4">
        <Pulse className="h-4 w-24" />
        <Pulse className="h-4 w-24" />
        <Pulse className="h-4 w-24" />
      </div>
    </div>
  );
}

export function ForecastSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 space-y-3"
        >
          <Pulse className="h-4 w-16" />
          <Pulse className="h-8 w-8 mx-auto" />
          <Pulse className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function HourlySkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 w-20 space-y-2"
        >
          <Pulse className="h-3 w-12" />
          <Pulse className="h-6 w-6 mx-auto" />
          <Pulse className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

export function AiSummarySkeleton() {
  return (
    <div className="rounded-panel border border-accent/20 bg-accent/5 p-5 space-y-3 sm:p-6">
      <div className="flex items-center gap-3">
        <Pulse className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Pulse className="h-3.5 w-24" />
          <Pulse className="h-3 w-32" />
        </div>
      </div>
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-4/5" />
    </div>
  );
}
