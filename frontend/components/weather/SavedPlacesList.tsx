"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { useAppView } from "@/components/providers/ViewProvider";
import { StarIcon } from "@/components/ui/icons";

export function SavedPlacesList() {
  const { favorites, setLocation, removeFavorite, favoriteNotice } = useLocation();
  const { setView } = useAppView();

  return (
    <section aria-label="Saved places" className="space-y-3 rounded-card border border-border bg-surface p-5">
      <div>
        <h2 className="text-sm font-medium text-text">Saved places</h2>
        <p className="text-xs text-text-muted">
          Stored in this browser only. Coordinates identify a place; weather is not saved.
        </p>
      </div>
      {favoriteNotice ? (
        <p role="alert" className="text-sm text-warning">
          {favoriteNotice}
        </p>
      ) : null}
      {favorites.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No saved places yet. Use Save this place on the dashboard.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {favorites.map((item) => (
            <li key={`${item.lat},${item.lon}`} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <StarIcon className="h-4 w-4 shrink-0 text-accent" filled />
              <button
                type="button"
                className="focus-ring min-h-10 flex-1 rounded-control px-2 py-2 text-left text-sm text-text hover:text-accent"
                onClick={() => {
                  setLocation(item);
                  setView("dashboard");
                }}
              >
                {item.label}
              </button>
              <button
                type="button"
                className="focus-ring min-h-10 shrink-0 rounded-control px-2 text-xs font-medium text-text-muted hover:text-accent"
                aria-label={`Remove ${item.label} from saved places`}
                onClick={() => removeFavorite(item)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
