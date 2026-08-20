"use client";

import { useLocation } from "@/components/providers/LocationProvider";
import { StarIcon } from "@/components/ui/icons";

export function FavoriteToggle() {
  const { location, isFavorite, addFavorite, removeFavorite, favoriteNotice } = useLocation();
  if (!location) return null;

  const saved = isFavorite(location);
  const label = saved ? "Remove from saved places" : "Save this place";

  return (
    <div className="shrink-0">
      <button
        type="button"
        aria-pressed={saved}
        aria-label={label}
        title={label}
        onClick={() => {
          if (saved) removeFavorite(location);
          else addFavorite(location);
        }}
        className="focus-ring grid h-10 w-10 place-items-center rounded-control text-text-muted transition-colors hover:text-accent aria-pressed:text-accent"
      >
        <StarIcon className="h-5 w-5" filled={saved} />
      </button>
      {favoriteNotice ? (
        <p role="alert" className="mt-1 max-w-[16rem] text-xs text-warning">
          {favoriteNotice}
        </p>
      ) : null}
    </div>
  );
}
