"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherError, WeatherResponse } from "@/lib/types";

export type WeatherStatus = "idle" | "loading" | "success" | "error";

export interface UseWeatherResult {
  status: WeatherStatus;
  data: WeatherResponse | null;
  isLoading: boolean;
  error: WeatherError | null;
  cacheStatus: string | null;
  refetch: () => void;
}

function parseError(status: number, body: unknown): WeatherError {
  if (body !== null && typeof body === "object") {
    const candidate = body as { error?: unknown; message?: unknown };
    if (
      typeof candidate.error === "string" &&
      typeof candidate.message === "string"
    ) {
      return { error: candidate.error, message: candidate.message };
    }
  }
  return { error: "unknown", message: `Request failed (${status})` };
}

/**
 * Browser weather fetch around GET /api/weather.
 *
 * Does not call WeatherAI, does not cache, and does not normalize.
 * FastAPI owns those concerns behind the Phase 3 boundary.
 */
export function useWeather(
  lat: number | null,
  lon: number | null,
  units: "metric" | "imperial" = "metric",
  ai: boolean = false
): UseWeatherResult {
  const hasLocation = lat !== null && lon !== null;
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(hasLocation);
  const [error, setError] = useState<WeatherError | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const locationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) {
      abortRef.current?.abort();
      locationKeyRef.current = null;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    const nextLocationKey = `${lat},${lon}`;
    const locationChanged = locationKeyRef.current !== nextLocationKey;
    locationKeyRef.current = nextLocationKey;

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      units,
    });
    if (ai) params.set("ai", "true");

    const run = async () => {
      setIsLoading(true);
      setError(null);
      if (locationChanged) {
        setData(null);
        setCacheStatus(null);
      }

      try {
        const res = await fetch(`/api/weather?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (cancelled) return;

        setCacheStatus(res.headers.get("x-cache"));

        if (!res.ok) {
          let body: unknown;
          try {
            body = await res.json();
          } catch {
            body = null;
          }
          if (!cancelled) {
            setError(parseError(res.status, body));
            setData(null);
          }
        } else {
          let json: WeatherResponse;
          try {
            json = await res.json();
          } catch {
            if (!cancelled) {
              setError({
                error: "malformed_response",
                message: "Backend returned an unexpected response",
              });
              setData(null);
            }
            return;
          }
          if (!cancelled) {
            setData(json);
            setError(null);
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError({
          error: "network_error",
          message: "Could not reach the server",
        });
        setData(null);
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

  // Location can flip from null → set on the same hook instance. Until the
  // effect starts, treat that as loading so the UI does not flash a
  // "missing current weather" error.
  const awaitingFirstResult = hasLocation && data === null && error === null;
  const loading = hasLocation && (isLoading || awaitingFirstResult);

  const status: WeatherStatus = !hasLocation
    ? "idle"
    : loading
      ? "loading"
      : error
        ? "error"
        : data
          ? "success"
          : "idle";

  return {
    status,
    data: hasLocation ? data : null,
    isLoading: loading,
    error: hasLocation ? error : null,
    cacheStatus: hasLocation ? cacheStatus : null,
    refetch,
  };
}
