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
  units: "metric" | "imperial" = "metric"
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

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      units,
    });

    fetch(`/api/weather?${params}`, { signal: controller.signal })
      .then(async (res) => {
        setCacheStatus(res.headers.get("x-cache"));
        if (!res.ok) {
          const body = await res.json().catch(() => ({
            error: "unknown",
            message: `Request failed (${res.status})`,
          }));
          setError(body);
          setData(null);
        } else {
          setData(await res.json());
          setError(null);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError({
            error: "network_error",
            message: "Could not reach the server",
          });
          setData(null);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [lat, lon, units, tick]);

  return { data, isLoading, error, cacheStatus, refetch };
}
