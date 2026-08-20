import {
  coordKey,
  normalizeStoredLocation,
  parseStoredLocations,
  persistStoredLocations,
  sameCoords,
  type StoredLocation,
} from "@/lib/stored-locations";

export type { StoredLocation };
export { coordKey, sameCoords };

export const FAVORITE_STORAGE_KEY = "weatherai:favorite-locations";
export const FAVORITE_MAX = 20;

export const FAVORITE_FULL_MESSAGE =
  "Saved places is full (20). Remove one to add another.";

export function parseFavoriteLocations(raw: string | null): StoredLocation[] {
  return parseStoredLocations(raw, FAVORITE_MAX);
}

export function loadFavoriteLocations(): StoredLocation[] {
  if (typeof window === "undefined") return [];
  try {
    return parseFavoriteLocations(window.localStorage.getItem(FAVORITE_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function persistFavoriteLocations(items: StoredLocation[]): void {
  persistStoredLocations(FAVORITE_STORAGE_KEY, items);
}

export function isFavoriteLocation(
  loc: { lat: number; lon: number },
  favorites: StoredLocation[]
): boolean {
  return favorites.some((item) => sameCoords(item, loc));
}

export type AddFavoriteResult =
  | { status: "added"; items: StoredLocation[] }
  | { status: "duplicate"; items: StoredLocation[] }
  | { status: "full"; items: StoredLocation[] };

/**
 * Explicit save. Does not reorder existing favorites on visit.
 * Never silently evicts a saved place.
 */
export function addFavoriteLocation(
  loc: StoredLocation,
  existing: StoredLocation[]
): AddFavoriteResult {
  const next = normalizeStoredLocation(loc);
  if (!next.label) {
    return { status: "duplicate", items: existing };
  }
  if (isFavoriteLocation(next, existing)) {
    return { status: "duplicate", items: existing };
  }
  if (existing.length >= FAVORITE_MAX) {
    return { status: "full", items: existing };
  }
  return { status: "added", items: [...existing, next] };
}

export function removeFavoriteLocation(
  loc: { lat: number; lon: number },
  existing: StoredLocation[]
): StoredLocation[] {
  return existing.filter((item) => !sameCoords(item, loc));
}
