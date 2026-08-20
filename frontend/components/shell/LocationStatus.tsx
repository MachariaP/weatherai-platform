"use client";

import { EmptyState } from "@/components/weather/EmptyState";
import { useLocation } from "@/components/providers/LocationProvider";

/** Initial lookup body when no coordinates are selected. */
export function LocationStatus() {
  const { location } = useLocation();
  if (location) return null;
  return <EmptyState />;
}
