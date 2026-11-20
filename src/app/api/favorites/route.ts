import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import {
  getFavoriteIds,
  getFavorites,
  getRecipeByIdOrSlug,
  toggleFavorite,
  upsertExternalRecipeRecord,
} from "@/db/queries";
import { resolveAnyExternalRecipeDetail } from "@/lib/providers/external-apis";

export async function GET() {
  try {
    ensureSeeded();
    return NextResponse.json({
      items: getFavorites(),
      ids: getFavoriteIds(),
    });
  } catch (error) {
    console.error("Error loading favorites:", error);
    return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureSeeded();
    const body = (await request.json()) as { recipeId?: string };
    if (!body.recipeId) {
      return NextResponse.json({ error: "recipeId is required" }, { status: 400 });
    }

    const existing = getRecipeByIdOrSlug(body.recipeId);
    if (!existing) {
      const external = await resolveAnyExternalRecipeDetail(body.recipeId);
      if (external) {
        upsertExternalRecipeRecord(external);
      }
    }

    const res = toggleFavorite(body.recipeId);
    return NextResponse.json(res);
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
