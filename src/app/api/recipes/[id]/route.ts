import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getRecipeByIdOrSlug } from "@/db/queries";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    ensureSeeded();
    const { id } = await context.params;
    const recipe = getRecipeByIdOrSlug(id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Error fetching recipe detail:", error);
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 });
  }
}

