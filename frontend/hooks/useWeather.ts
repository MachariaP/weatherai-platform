"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherError, WeatherResponse } from "@/lib/types";

export type WeatherStatus = "idle" | "loading" | "success" | "error";

export interface UseWeatherResult {
  status: WeatherStatus;
  data: WeatherResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
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
 *
 * Location / units / AI / days changes clear previous weather (no mixed payloads).
 * Manual refetch keeps the last valid payload visible and does not bypass
 * the FastAPI TTL cache.
 */
export function useWeather(
  lat: number | null,
  lon: number | null,
  units: "metric" | "imperial" = "metric",
  ai: boolean = false,
  days: number = 7
): UseWeatherResult {
  const hasLocation = lat !== null && lon !== null;
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(hasLocation);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<WeatherError | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const dataRef = useRef<WeatherResponse | null>(null);
  const locationKeyRef = useRef<string | null>(null);
  const prefsKeyRef = useRef<string | null>(null);

  const commitData = (next: WeatherResponse | null) => {
    dataRef.current = next;
    setData(next);
  };

  const refetch = useCallback(() => {
    if (inFlightRef.current) return;
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (lat === null || lon === null) {
      abortRef.current?.abort();
      inFlightRef.current = false;
      locationKeyRef.current = null;
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    const nextLocationKey = `${lat},${lon}`;
    const nextPrefsKey = `${units}:${ai}:${days}`;
    const locationChanged = locationKeyRef.current !== nextLocationKey;
    const prefsChanged =
      prefsKeyRef.current !== null && prefsKeyRef.current !== nextPrefsKey;
    locationKeyRef.current = nextLocationKey;
    prefsKeyRef.current = nextPrefsKey;

    const keepVisible =
      !locationChanged && !prefsChanged && dataRef.current !== null;

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      units,
      days: String(days),
    });
    if (ai) params.set("ai", "true");

    const run = async () => {
      inFlightRef.current = true;
      setError(null);
      if (keepVisible) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setIsRefreshing(false);
        commitData(null);
        setCacheStatus(null);
      }

      try {
        const res = await fetch(`/api/weather?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (cancelled) return;

        const nextCache = res.headers.get("x-cache");

        if (!res.ok) {
          let body: unknown;
          try {
            body = await res.json();
          } catch {
            body = null;
          }
          if (!cancelled) {
            setError(parseError(res.status, body));
            if (!keepVisible) {
              commitData(null);
              setCacheStatus(null);
            }
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
              if (!keepVisible) {
                commitData(null);
              }
            }
            return;
          }
          if (!cancelled) {
            commitData(json);
            setCacheStatus(nextCache);
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
        if (!keepVisible) {
          commitData(null);
          setCacheStatus(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          inFlightRef.current = false;
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lon, units, ai, days, tick]);

  // Location can flip from null → set on the same hook instance. Until the
  // effect starts, treat that as loading so the UI does not flash a
  // "missing current weather" error.
  const awaitingFirstResult = hasLocation && data === null && error === null;
  const loading = hasLocation && (isLoading || awaitingFirstResult) && !isRefreshing;

  const status: WeatherStatus = !hasLocation
    ? "idle"
    : loading
      ? "loading"
      : error && !data
        ? "error"
        : data
          ? "success"
          : error
            ? "error"
            : "idle";

  return {
    status,
    data: hasLocation ? data : null,
    isLoading: loading,
    isRefreshing: hasLocation ? isRefreshing : false,
    error: hasLocation ? error : null,
    cacheStatus: hasLocation ? cacheStatus : null,
    refetch,
  };
}
