"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherError, WeatherResponse } from "@/lib/types";

interface UseWeatherResult {
  data: WeatherResponse | null;
  isLoading: boolean;
  error: WeatherError | null;
  cacheStatus: string | null;
  refetch: () => void;
}

export function useWeather(
  lat: number | null,
  lon: number | null,
  units: "metric" | "imperial" = "metric",
  ai: boolean = false
): UseWeatherResult {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<WeatherError | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (lat === null || lon === null) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let cancelled = false;

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      units,
    });
    if (ai) params.set("ai", "true");

    // setState calls are inside async callbacks (not synchronously in the effect body)
    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/weather?${params}`, {
          signal: controller.signal,
        });
        if (cancelled) return;

        setCacheStatus(res.headers.get("x-cache"));

        if (!res.ok) {
          const body = await res.json().catch(() => ({
            error: "unknown",
            message: `Request failed (${res.status})`,
          }));
          if (!cancelled) {
            setError(body);
            setData(null);
          }
        } else {
          const json = await res.json();
          if (!cancelled) {
            setData(json);
            setError(null);
          }
        }
      } catch (err: unknown) {
        if (!cancelled && err instanceof Error && err.name !== "AbortError") {
          setError({
            error: "network_error",
            message: "Could not reach the server",
          });
          setData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lon, units, ai, tick]);

  return { data, isLoading, error, cacheStatus, refetch };
}
