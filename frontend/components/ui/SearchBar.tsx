"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation } from "@/components/providers/LocationProvider";
import { formatCoordinates, parseLatLonQuery } from "@/lib/format";
import { coordKey } from "@/lib/stored-locations";
import type { GeocodeHit } from "@/lib/types";
import { MapPinIcon, SearchIcon, StarIcon } from "./icons";

const DEBOUNCE_MS = 300;

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

function geocodeErrorMessage(status: number, code?: string): string {
  if (status === 404 || code === "not_found") return "No matching location";
  if (status === 504 || code === "timeout" || code === "backend_timeout") {
    return "Location search timed out";
  }
  return "Location search is unavailable";
}

function parseHits(body: unknown): GeocodeHit[] | null {
  if (body === null || typeof body !== "object") return null;
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) return null;
  const hits: GeocodeHit[] = [];
  for (const item of results) {
    if (item === null || typeof item !== "object") continue;
    const hit = item as { lat?: unknown; lon?: unknown; label?: unknown; region?: unknown; country?: unknown };
    if (typeof hit.lat !== "number" || typeof hit.lon !== "number") continue;
    if (!Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) continue;
    if (typeof hit.label !== "string" || !hit.label.trim()) continue;
    const next: GeocodeHit = { lat: hit.lat, lon: hit.lon, label: hit.label.trim() };
    if (typeof hit.region === "string" && hit.region.trim()) next.region = hit.region.trim();
    if (typeof hit.country === "string" && hit.country.trim()) next.country = hit.country.trim();
    hits.push(next);
  }
  return hits;
}

export function SearchBar() {
  const { setLocation, recents, clearRecents, favorites, removeFavorite } = useLocation();
  const [query, setQuery] = useState("");
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searched, setSearched] = useState(false);
  const errorId = useId();
  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const committedQueryRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLFormElement | null>(null);

  const trimmedQuery = query.trim();
  const coordQuery = parseLatLonQuery(trimmedQuery);
  const recentOnly = recents.filter(
    (item) => !favorites.some((fav) => coordKey(fav.lat, fav.lon) === coordKey(item.lat, item.lon))
  );
  const browseItems = [...favorites, ...recentOnly];
  const showBrowse = open && trimmedQuery.length < 2 && !coordQuery && browseItems.length > 0;
  const showResults = open && trimmedQuery.length >= 2 && !coordQuery;
  const listOpen = showBrowse || showResults;

  // Depend on trimmedQuery only. parseLatLonQuery returns a new object each
  // render, so listing coordQuery would retrigger setState every paint.
  useEffect(() => {
    if (coordQuery || trimmedQuery.length < 2 || committedQueryRef.current === trimmedQuery) {
      abortRef.current?.abort();
      setResults((prev) => (prev.length === 0 ? prev : []));
      setSearching(false);
      setSearched(false);
      return;
    }

    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;
      setSearching(true);
      setError(null);
      void (async () => {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmedQuery)}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          let body: unknown = null;
          try {
            body = await res.json();
          } catch {
            body = null;
          }
          if (requestId !== requestIdRef.current) return;
          if (!res.ok) {
            const code =
              body !== null && typeof body === "object" && "error" in body
                ? String((body as { error: unknown }).error)
                : undefined;
            setResults([]);
            setSearched(true);
            setError(geocodeErrorMessage(res.status, code));
            return;
          }
          const hits = parseHits(body);
          if (hits === null) {
            setResults([]);
            setSearched(true);
            setError("Location search is unavailable");
            return;
          }
          setResults(hits);
          setActiveIndex(0);
          setSearched(true);
          setOpen(true);
          setError(null);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setSearched(true);
          setError("Location search is unavailable");
        } finally {
          if (requestId === requestIdRef.current) setSearching(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- coordQuery is derived from trimmedQuery
  }, [trimmedQuery]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function applyHit(hit: { lat: number; lon: number; label: string }) {
    setError(null);
    setOpen(false);
    committedQueryRef.current = hit.label.trim();
    setQuery(hit.label);
    setLocation({
      lat: Number(hit.lat.toFixed(4)),
      lon: Number(hit.lon.toFixed(4)),
      label: hit.label,
    });
  }

  function applyCoords(lat: number, lon: number, label?: string) {
    applyHit({
      lat,
      lon,
      label: label?.trim() || formatCoordinates(lat, lon),
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (trimmedQuery) {
      if (coordQuery) {
        applyCoords(coordQuery.lat, coordQuery.lon);
        return;
      }
      if (results[activeIndex]) {
        applyHit(results[activeIndex]);
        return;
      }
      if (searched && results.length === 0 && !searching) {
        return;
      }
      return;
    }

    const lat = parseCoordinate(latStr);
    const lon = parseCoordinate(lonStr);

    if (lat === null && lon === null) {
      setError("Enter a place name or coordinates");
      return;
    }
    if (lat === null || lat < -90 || lat > 90) {
      setError("Latitude must be a number between -90 and 90");
      return;
    }
    if (lon === null || lon < -180 || lon > 180) {
      setError("Longitude must be a number between -180 and 180");
      return;
    }

    applyCoords(lat, lon);
  }

  function onQueryKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const items = showBrowse ? browseItems : results;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    // Enter in a form input otherwise submits and jsdom navigates.
    if (e.key === "Enter") {
      e.preventDefault();
      if (coordQuery) {
        applyCoords(coordQuery.lat, coordQuery.lon);
        return;
      }
      if (open && items[activeIndex]) applyHit(items[activeIndex]);
      return;
    }
    if (!listOpen || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    }
  }

  return (
    <form
      ref={rootRef}
      id="weather-search"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Search location"
      className="w-full"
    >
      <p className="sr-only">Search by place name or coordinates</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 z-10 grid w-10 place-items-center text-text-muted">
            <SearchIcon className="h-4 w-4" />
          </span>
          <label className="sr-only" htmlFor="weather-query">
            Location or coordinates
          </label>
          <input
            id="weather-query"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-activedescendant={
              listOpen ? `${listId}-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            placeholder="Search location or coordinates..."
            value={query}
            onChange={(e) => {
              committedQueryRef.current = null;
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(0);
              if (error) setError(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onQueryKeyDown}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className="h-10 w-full rounded-control border border-border bg-surface py-2 pl-10 pr-3 text-sm text-text placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none"
          />
          {listOpen ? (
            <div
              id={listId}
              role="listbox"
              aria-label={
                showBrowse
                  ? favorites.length > 0 && recentOnly.length > 0
                    ? "Saved and recent locations"
                    : favorites.length > 0
                      ? "Saved places"
                      : "Recent locations"
                  : "Location suggestions"
              }
              className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-control border border-border bg-surface py-1"
            >
              {showBrowse ? (
                <>
                  {favorites.length > 0 ? (
                    <>
                      <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                        Saved
                      </p>
                      {favorites.map((item, index) => (
                        <div
                          key={`fav-${item.lat},${item.lon}`}
                          className={`flex items-stretch ${
                            index === activeIndex ? "bg-accent/15" : ""
                          }`}
                        >
                          <button
                            type="button"
                            role="option"
                            id={`${listId}-option-${index}`}
                            aria-selected={index === activeIndex}
                            className={`flex min-h-10 min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm ${
                              index === activeIndex
                                ? "border-l-2 border-accent font-medium text-text"
                                : "border-l-2 border-transparent text-text-secondary hover:bg-accent/10"
                            }`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => applyHit(item)}
                          >
                            <StarIcon className="h-3.5 w-3.5 shrink-0 text-accent" filled />
                            {item.label}
                          </button>
                          <button
                            type="button"
                            className="focus-ring shrink-0 px-3 text-[11px] font-medium text-text-muted hover:text-accent"
                            aria-label={`Remove ${item.label} from saved places`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              removeFavorite(item);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </>
                  ) : null}
                  {recentOnly.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between px-3 py-1.5">
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                          Recent
                        </p>
                        <button
                          type="button"
                          className="text-[11px] font-medium text-text-muted hover:text-accent"
                          onClick={() => clearRecents()}
                        >
                          Clear
                        </button>
                      </div>
                      {recentOnly.map((item, offset) => {
                        const index = favorites.length + offset;
                        return (
                          <button
                            key={`recent-${item.lat},${item.lon}`}
                            type="button"
                            role="option"
                            id={`${listId}-option-${index}`}
                            aria-selected={index === activeIndex}
                            className={`flex min-h-10 w-full px-3 py-2 text-left text-sm ${
                              index === activeIndex
                                ? "border-l-2 border-accent bg-accent/15 font-medium text-text"
                                : "border-l-2 border-transparent text-text-secondary hover:bg-accent/10"
                            }`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => applyHit(item)}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </>
                  ) : null}
                </>
              ) : searching && results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-muted">Searching…</p>
              ) : searched && results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-secondary">No locations found</p>
              ) : (
                results.map((item, index) => (
                  <button
                    key={`${item.lat},${item.lon},${item.label}`}
                    type="button"
                    role="option"
                    id={`${listId}-option-${index}`}
                    aria-selected={index === activeIndex}
                    className={`flex min-h-10 w-full flex-col justify-center px-3 py-2 text-left ${
                      index === activeIndex
                        ? "border-l-2 border-accent bg-accent/15 font-medium text-text"
                        : "border-l-2 border-transparent text-text-secondary hover:bg-accent/10"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => applyHit(item)}
                  >
                    <span className="text-sm">{item.label}</span>
                    {item.region ? (
                      <span className="text-xs text-text-muted">{item.region}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:hidden">
          <div className="flex items-center rounded-control border border-border bg-surface transition-colors focus-within:border-accent">
            <span className="grid h-10 w-8 shrink-0 place-items-center text-text-muted">
              <MapPinIcon className="h-3.5 w-3.5" />
            </span>
            <label className="sr-only" htmlFor="weather-lat">
              Latitude
            </label>
            <input
              id="weather-lat"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Lat"
              value={latStr}
              onChange={(e) => {
                setLatStr(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error !== null && error.toLowerCase().includes("latitude")}
              aria-describedby={error ? errorId : undefined}
              className="w-full min-w-0 bg-transparent py-2 pr-2.5 font-mono text-sm text-text placeholder:font-sans placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <div className="flex items-center rounded-control border border-border bg-surface transition-colors focus-within:border-accent">
            <span className="grid h-10 w-8 shrink-0 place-items-center text-text-muted">
              <SearchIcon className="h-3.5 w-3.5" />
            </span>
            <label className="sr-only" htmlFor="weather-lon">
              Longitude
            </label>
            <input
              id="weather-lon"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Long"
              value={lonStr}
              onChange={(e) => {
                setLonStr(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error !== null && error.toLowerCase().includes("longitude")}
              aria-describedby={error ? errorId : undefined}
              className="w-full min-w-0 bg-transparent py-2 pr-2.5 font-mono text-sm text-text placeholder:font-sans placeholder:text-text-muted focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={searching && !coordQuery && trimmedQuery.length >= 2 && results.length === 0}
          className="focus-ring inline-flex h-10 w-full shrink-0 items-center justify-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong active:translate-y-px disabled:opacity-60 sm:w-auto"
        >
          {searching ? "Searching…" : "Get Weather"}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
