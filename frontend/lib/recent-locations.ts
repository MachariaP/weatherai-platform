export interface StoredLocation {
  lat: number;
  lon: number;
  label: string;
}

export const RECENT_STORAGE_KEY = "weatherai:recent-locations";
export const RECENT_MAX = 8;

function isFiniteCoord(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function labelForCoords(
  lat: number,
  lon: number,
  recents: StoredLocation[]
): string | undefined {
  const key = coordKey(lat, lon);
  return recents.find((item) => coordKey(item.lat, item.lon) === key)?.label;
}

export function parseRecentLocations(raw: string | null): StoredLocation[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const hits: StoredLocation[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (item === null || typeof item !== "object") continue;
      const rec = item as { lat?: unknown; lon?: unknown; label?: unknown };
      if (!isFiniteCoord(rec.lat, -90, 90) || !isFiniteCoord(rec.lon, -180, 180)) continue;
      if (typeof rec.label !== "string" || !rec.label.trim()) continue;
      const key = coordKey(rec.lat, rec.lon);
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        lat: Number(rec.lat.toFixed(4)),
        lon: Number(rec.lon.toFixed(4)),
        label: rec.label.trim(),
      });
      if (hits.length >= RECENT_MAX) break;
    }
    return hits;
  } catch {
    return [];
  }
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
  const next: StoredLocation = {
    lat: Number(loc.lat.toFixed(4)),
    lon: Number(loc.lon.toFixed(4)),
    label: loc.label.trim(),
  };
  const key = coordKey(next.lat, next.lon);
  const rest = existing.filter((item) => coordKey(item.lat, item.lon) !== key);
  return [next, ...rest].slice(0, RECENT_MAX);
}

export function persistRecentLocations(items: StoredLocation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota or private mode — recents are convenience only.
  }
}

export function clearRecentLocations(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
