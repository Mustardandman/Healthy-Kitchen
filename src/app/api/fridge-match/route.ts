import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import { matchRecipesByFridgeIngredients } from "@/db/queries";
import {
  findSpoonacularByIngredients,
  findTheMealDbByIngredients,
  getExternalProviderStatus,
} from "@/lib/providers/external-apis";
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

    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const localResult = matchRecipesByFridgeIngredients({
      ingredients,
      mode: body.mode ?? "use_what_i_have",
      requireAll: Boolean(body.requireAll),
      category: body.category ?? "",
      limit: body.limit ?? 36,
    });

    const providers = getExternalProviderStatus();
    if (ingredients.length > 0) {
      const [spoonMatches, tmdbMatches] = await Promise.all([
        providers.spoonacularConfigured
          ? findSpoonacularByIngredients(ingredients, 6)
          : Promise.resolve([]),
        providers.themealdbEnabled
          ? findTheMealDbByIngredients(ingredients)
          : Promise.resolve([]),
      ]);

      const externalMatches = [...spoonMatches, ...tmdbMatches];
      if (externalMatches.length > 0) {
        return NextResponse.json({
          ...localResult,
          results: [...externalMatches, ...localResult.results].slice(0, body.limit ?? 40),
          providers,
        });
      }
    }

    return NextResponse.json({
      ...localResult,
      providers,
    });
  } catch (error) {
    console.error("Error matching fridge ingredients:", error);
    return NextResponse.json(
      { error: "Failed to match ingredients." },
      { status: 500 }
    );
  }
}
