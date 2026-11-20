import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import { matchRecipesByFridgeIngredients } from "@/db/queries";
import type { FridgeMatchMode, MealCategory } from "@/types/recipe";

export async function POST(request: NextRequest) {
  try {
    ensureSeeded();
    const body = (await request.json()) as {
      ingredients?: string[];
      mode?: FridgeMatchMode;
      requireAll?: boolean;
      category?: MealCategory | "";
      limit?: number;
    };

    const result = matchRecipesByFridgeIngredients({
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
      mode: body.mode ?? "use_what_i_have",
      requireAll: Boolean(body.requireAll),
      category: body.category ?? "",
      limit: body.limit ?? 36,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error matching fridge ingredients:", error);
    return NextResponse.json(
      { error: "Failed to match ingredients." },
      { status: 500 }
    );
  }
}

