"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Location } from "@/components/providers/LocationProvider";
import { coordKey } from "@/lib/stored-locations";
import type { Units } from "@/lib/format";
import type { WeatherError, WeatherResponse } from "@/lib/types";

export const COMPARE_MAX = 2;

export type CompareSlot = {
  key: string;
  location: Location;
  status: "loading" | "success" | "error";
  data: WeatherResponse | null;
  error: WeatherError | null;
};

function parseError(status: number, body: unknown): WeatherError {
  if (body !== null && typeof body === "object") {
    const candidate = body as { error?: unknown; message?: unknown };
    if (typeof candidate.error === "string" && typeof candidate.message === "string") {
      return { error: candidate.error, message: candidate.message };
    }
  }
  return { error: "unknown", message: `Request failed (${status})` };
}

function slotKey(loc: Location, units: Units, days: number): string {
  return `${coordKey(loc.lat, loc.lon)}:${units}:${days}`;
}

/**
 * Fetch weather for explicitly selected comparison locations only.
 *
 * Always omits `ai` so comparison does not multiply the AI quota.
 * Uses GET /api/weather per location (FastAPI cache still applies).
 * Does not preload favorites. Independent loading/error per location.
 * Adding a second place does not refetch an already-fetched slot.
 */
export function useCompareWeather(
  locations: Location[],
  units: Units,
  days: number
): CompareSlot[] {
  const selected = locations.slice(0, COMPARE_MAX);
  const selectedPayload = JSON.stringify(selected);
  const [byKey, setByKey] = useState<Record<string, CompareSlot>>({});
  const inflightRef = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const current = JSON.parse(selectedPayload) as Location[];
    const keep = new Set(current.map((item) => slotKey(item, units, days)));

    for (const [key, controller] of inflightRef.current) {
      if (!keep.has(key)) {
        controller.abort();
        inflightRef.current.delete(key);
      }
    }

    if (current.length === 0) return;

    for (const loc of current) {
      const key = slotKey(loc, units, days);
      if (inflightRef.current.has(key)) continue;
      const controller = new AbortController();
      inflightRef.current.set(key, controller);
      const params = new URLSearchParams({
        lat: String(loc.lat),
        lon: String(loc.lon),
        units,
        days: String(days),
      });

      void (async () => {
        try {
          const res = await fetch(`/api/weather?${params}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          if (!keep.has(key)) return;
          if (!res.ok) {
            let body: unknown = null;
            try {
              body = await res.json();
            } catch {
              body = null;
            }
            setByKey((prev) => ({
              ...prev,
              [key]: {
                key,
                location: loc,
                status: "error",
                data: prev[key]?.data ?? null,
                error: parseError(res.status, body),
              },
            }));
            return;
          }
          const json = (await res.json()) as WeatherResponse;
          setByKey((prev) => ({
            ...prev,
            [key]: {
              key,
              location: loc,
              status: "success",
              data: json,
              error: null,
            },
          }));
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (!keep.has(key)) return;
          inflightRef.current.delete(key);
          setByKey((prev) => ({
            ...prev,
            [key]: {
              key,
              location: loc,
              status: "error",
              data: prev[key]?.data ?? null,
              error: { error: "network_error", message: "Could not reach the server" },
            },
          }));
        }
      })();
    }
  }, [selectedPayload, units, days]);

  return useMemo(
    () =>
      selected.map((loc) => {
        const key = slotKey(loc, units, days);
        return (
          byKey[key] ?? {
            key,
            location: loc,
            status: "loading" as const,
            data: null,
            error: null,
          }
        );
      }),
    [selected, byKey, units, days]
  );
}
