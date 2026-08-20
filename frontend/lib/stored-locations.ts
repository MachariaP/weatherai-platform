export interface StoredLocation {
  lat: number;
  lon: number;
  label: string;
}

export function coordKey(lat: number, lon: number): string {
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
}

function isFiniteCoord(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function normalizeStoredLocation(loc: StoredLocation): StoredLocation {
  return {
    lat: Number(loc.lat.toFixed(4)),
    lon: Number(loc.lon.toFixed(4)),
    label: loc.label.trim(),
  };
}

export function sameCoords(a: { lat: number; lon: number }, b: { lat: number; lon: number }): boolean {
  return coordKey(a.lat, a.lon) === coordKey(b.lat, b.lon);
}

export function labelForCoords(
  lat: number,
  lon: number,
  locations: StoredLocation[]
): string | undefined {
  const key = coordKey(lat, lon);
  return locations.find((item) => coordKey(item.lat, item.lon) === key)?.label;
}

/**
 * SSR-safe parse of a localStorage location list.
 * Corrupt JSON, non-arrays, and malformed rows are dropped.
 */
export function parseStoredLocations(raw: string | null, max: number): StoredLocation[] {
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
      if (hits.length >= max) break;
    }
    return hits;
  } catch {
    return [];
  }
}

export function persistStoredLocations(key: string, items: StoredLocation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Quota or private mode — local lists are convenience only.
  }
}

export function clearStoredLocations(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
