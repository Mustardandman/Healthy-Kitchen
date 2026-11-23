import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import {
  getFavoritesExportPayload,
  syncSharedFavorites,
} from "@/db/queries";
import {
  isCloudFavoritesConfigured,
  pushCloudFavorites,
} from "@/lib/favorites-cloud";
import type { RecipeCardItem, RecipeDetail } from "@/types/recipe";

export async function POST(request: NextRequest) {
  try {
    ensureSeeded();
    const body = (await request.json()) as {
      favorites?: Array<{
        id: string;
        savedAt?: string;
        snapshot?: RecipeCardItem;
        detail?: RecipeDetail;
      }>;
    };

    const list = Array.isArray(body.favorites) ? body.favorites : [];
    const synced = syncSharedFavorites(list);

    if (isCloudFavoritesConfigured()) {
      await pushCloudFavorites(getFavoritesExportPayload());
    }

    return NextResponse.json(synced);
  } catch (error) {
    console.error("Error syncing shared favorites:", error);
    return NextResponse.json({ error: "Failed to sync favorites" }, { status: 500 });
  }
}

