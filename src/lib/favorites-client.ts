import type { RecipeCardItem } from "@/types/recipe";

export const FAVORITES_STORAGE_KEY = "nourish_shared_favorites_v1";
export const FAVORITES_UPDATED_EVENT = "nourish:favorites-updated";

export interface StoredFavoritesState {
  ids: string[];
  snapshots: Record<string, RecipeCardItem>;
  updatedAt: string;
}

export function readStoredFavorites(): StoredFavoritesState {
  if (typeof window === "undefined") {
    return { ids: [], snapshots: {}, updatedAt: "" };
  }
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return { ids: [], snapshots: {}, updatedAt: "" };
    const parsed = JSON.parse(raw) as Partial<StoredFavoritesState>;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids.filter((x) => typeof x === "string") : [],
      snapshots:
        parsed.snapshots && typeof parsed.snapshots === "object" ? parsed.snapshots : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return { ids: [], snapshots: {}, updatedAt: "" };
  }
}

export function writeStoredFavorites(state: StoredFavoritesState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function emitFavoritesUpdated(ids: string[], items?: RecipeCardItem[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FAVORITES_UPDATED_EVENT, {
      detail: { ids, items },
    })
  );
}

export async function toggleFavoriteClient(
  recipeId: string,
  recipeSnapshot?: RecipeCardItem
): Promise<{ isFavorited: boolean; ids: string[] }> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipeId, recipeSnapshot }),
  });
  if (!res.ok) {
    throw new Error("Failed to toggle favorite");
  }
  const data = (await res.json()) as { isFavorited: boolean };

  const current = readStoredFavorites();
  const nextIds = data.isFavorited
    ? Array.from(new Set([recipeId, ...current.ids]))
    : current.ids.filter((id) => id !== recipeId);
  const nextSnapshots = { ...current.snapshots };
  if (data.isFavorited && recipeSnapshot) {
    nextSnapshots[recipeId] = recipeSnapshot;
  } else if (!data.isFavorited) {
    delete nextSnapshots[recipeId];
  }

  writeStoredFavorites({
    ids: nextIds,
    snapshots: nextSnapshots,
    updatedAt: new Date().toISOString(),
  });
  emitFavoritesUpdated(nextIds);

  return { isFavorited: data.isFavorited, ids: nextIds };
}

export async function syncSharedFavoritesWithServer(): Promise<{
  restored: boolean;
  ids: string[];
  items: RecipeCardItem[];
}> {
  const res = await fetch("/api/favorites", { cache: "no-store" });
  if (!res.ok) {
    return { restored: false, ids: [], items: [] };
  }
  const serverData = (await res.json()) as {
    ids: string[];
    items: RecipeCardItem[];
  };
  const stored = readStoredFavorites();

  // If server was wiped (e.g. Render free-tier /tmp reset or redeploy) and local cache has saved favorites, restore them cleanly
  if (serverData.ids.length === 0 && stored.ids.length > 0) {
    const syncRes = await fetch("/api/favorites/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favorites: stored.ids.map((id) => ({
          id,
          snapshot: stored.snapshots[id],
        })),
      }),
    });
    if (syncRes.ok) {
      const synced = (await syncRes.json()) as {
        ids: string[];
        items: RecipeCardItem[];
      };
      const nextSnapshots: Record<string, RecipeCardItem> = {};
      for (const item of synced.items) {
        nextSnapshots[item.id] = item;
      }
      writeStoredFavorites({
        ids: synced.ids,
        snapshots: nextSnapshots,
        updatedAt: new Date().toISOString(),
      });
      emitFavoritesUpdated(synced.ids, synced.items);
      return { restored: synced.ids.length > 0, ids: synced.ids, items: synced.items };
    }
  }

  // Otherwise mirror authoritative server favorites to localStorage so shared state persists across future restarts
  if (serverData.ids.length > 0) {
    const nextSnapshots: Record<string, RecipeCardItem> = { ...stored.snapshots };
    for (const item of serverData.items) {
      nextSnapshots[item.id] = item;
    }
    writeStoredFavorites({
      ids: serverData.ids,
      snapshots: nextSnapshots,
      updatedAt: new Date().toISOString(),
    });
    emitFavoritesUpdated(serverData.ids, serverData.items);
  }

  return { restored: false, ids: serverData.ids, items: serverData.items };
}

