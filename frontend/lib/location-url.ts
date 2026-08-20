export type ParsedLocationSearch =
  | { status: "absent" }
  | { status: "invalid" }
  | { status: "valid"; lat: number; lon: number };

export function parseLocationSearch(search: string): ParsedLocationSearch {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const latRaw = params.get("lat");
  const lonRaw = params.get("lon");
  if (latRaw === null && lonRaw === null) return { status: "absent" };
  if (latRaw === null || lonRaw === null) return { status: "invalid" };
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return { status: "invalid" };
  }
  return { status: "valid", lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) };
}

export function locationHref(lat: number, lon: number): string {
  return `/?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
}

export function coordsMatchUrl(lat: number, lon: number, search: string): boolean {
  const parsed = parseLocationSearch(search);
  if (parsed.status !== "valid") return false;
  return parsed.lat === Number(lat.toFixed(4)) && parsed.lon === Number(lon.toFixed(4));
}
