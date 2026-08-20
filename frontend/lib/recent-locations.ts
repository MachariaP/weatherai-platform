import {
  clearStoredLocations,
  coordKey,
  labelForCoords,
  normalizeStoredLocation,
  parseStoredLocations,
  persistStoredLocations,
  type StoredLocation,
} from "@/lib/stored-locations";

export type { StoredLocation };
export { coordKey, labelForCoords };

export const RECENT_STORAGE_KEY = "weatherai:recent-locations";
export const RECENT_MAX = 8;

export function parseRecentLocations(raw: string | null): StoredLocation[] {
  return parseStoredLocations(raw, RECENT_MAX);
}

export function loadRecentLocations(): StoredLocation[] {
  if (typeof window === "undefined") return [];
  try {
    return parseRecentLocations(window.localStorage.getItem(RECENT_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function rememberRecentLocation(
  loc: StoredLocation,
  existing: StoredLocation[]
): StoredLocation[] {
  const next = normalizeStoredLocation(loc);
  const key = coordKey(next.lat, next.lon);
  const rest = existing.filter((item) => coordKey(item.lat, item.lon) !== key);
  return [next, ...rest].slice(0, RECENT_MAX);
}

export function persistRecentLocations(items: StoredLocation[]): void {
  persistStoredLocations(RECENT_STORAGE_KEY, items);
}

export function clearRecentLocations(): void {
  clearStoredLocations(RECENT_STORAGE_KEY);
}
