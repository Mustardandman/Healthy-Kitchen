import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import {
  cardSnapshotToRecipeDetail,
  getFavoriteIds,
  getFavorites,
  getFavoritesExportPayload,
  getRecipeByIdOrSlug,
  syncSharedFavorites,
  toggleFavorite,
  upsertExternalRecipeRecord,
} from "@/db/queries";
import {
  fetchCloudFavorites,
  isCloudFavoritesConfigured,
  pushCloudFavorites,
} from "@/lib/favorites-cloud";
import { resolveAnyExternalRecipeDetail } from "@/lib/providers/external-apis";
import type { RecipeCardItem } from "@/types/recipe";

export async function GET() {
  try {
    ensureSeeded();
    let ids = getFavoriteIds();
    if (ids.length === 0 && isCloudFavoritesConfigured()) {
      const cloud = await fetchCloudFavorites();
      if (cloud && cloud.favorites.length > 0) {
        syncSharedFavorites(cloud.favorites);
        ids = getFavoriteIds();
      }
    }
    return NextResponse.json({
      items: getFavorites(),
      ids,
    });
  } catch (error) {
    console.error("Error loading favorites:", error);
    return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureSeeded();
    const body = (await request.json()) as {
      recipeId?: string;
      recipeSnapshot?: RecipeCardItem;
    };
    if (!body.recipeId) {
      return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
    }

    const existing = getRecipeByIdOrSlug(body.recipeId);
    if (!existing) {
      const external = await resolveAnyExternalRecipeDetail(body.recipeId);
      if (external) {
        upsertExternalRecipeRecord(external);
      } else if (body.recipeSnapshot) {
        upsertExternalRecipeRecord(cardSnapshotToRecipeDetail(body.recipeSnapshot));
      }
    }

    const res = toggleFavorite(body.recipeId);
    if (isCloudFavoritesConfigured()) {
      await pushCloudFavorites(getFavoritesExportPayload());
    }
    return NextResponse.json(res);
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
