import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import { searchRecipes } from "@/db/queries";
import {
  getExternalProviderStatus,
  searchEdamamRecipes,
  searchSpoonacularRecipes,
} from "@/lib/providers/external-apis";
import type { Difficulty, MealCategory, PregnancySafetyStatus, RecipeSortOption } from "@/types/recipe";

export async function GET(request: NextRequest) {
  try {
    ensureSeeded();
    const { searchParams } = new URL(request.url);
    const ingredientsRaw = searchParams.get("ingredients");
    const dietaryRaw = searchParams.get("dietary");
    const q = searchParams.get("q") ?? undefined;
    const category = (searchParams.get("category") as MealCategory | "") ?? undefined;
    const maxTime = searchParams.get("maxTime") ? Number(searchParams.get("maxTime")) : undefined;
    const minProtein = searchParams.get("minProtein") ? Number(searchParams.get("minProtein")) : undefined;
    const maxCarbs = searchParams.get("maxCarbs") ? Number(searchParams.get("maxCarbs")) : undefined;
    const minFiber = searchParams.get("minFiber") ? Number(searchParams.get("minFiber")) : undefined;
    const maxCalories = searchParams.get("maxCalories") ? Number(searchParams.get("maxCalories")) : undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;

    const data = searchRecipes({
      q,
      category,
      subcategory: searchParams.get("subcategory") ?? undefined,
      ingredients: ingredientsRaw
        ? ingredientsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      maxTime,
      minProtein,
      maxCarbs,
      minFiber,
      maxCalories,
      dietary: dietaryRaw
        ? dietaryRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      safetyStatus: (searchParams.get("safetyStatus") as PregnancySafetyStatus | "") ?? undefined,
      classification: searchParams.get("classification") ?? undefined,
      difficulty: (searchParams.get("difficulty") as Difficulty | "") ?? undefined,
      cuisine: searchParams.get("cuisine") ?? undefined,
      sort: (searchParams.get("sort") as RecipeSortOption) ?? "relevant",
      page,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 24,
    });

    const providers = getExternalProviderStatus();

    // When external APIs are configured and the user runs a search on page 1, include live results
    if (page === 1 && q && (providers.spoonacularConfigured || providers.edamamConfigured)) {
      const [spoonHits, edamamHits] = await Promise.all([
        providers.spoonacularConfigured
          ? searchSpoonacularRecipes({
              query: q,
              category,
              maxTime,
              minProtein,
              maxCarbs,
              minFiber,
              maxCalories,
              number: 6,
            })
          : Promise.resolve([]),
        providers.edamamConfigured
          ? searchEdamamRecipes({ query: q, category })
          : Promise.resolve([]),
      ]);

      const combined = [...spoonHits, ...edamamHits, ...data.items];
      return NextResponse.json({
        ...data,
        items: combined.slice(0, 24),
        total: data.total + spoonHits.length + edamamHits.length,
        providers,
      });
    }

    return NextResponse.json({
      ...data,
      providers,
    });
  } catch (error) {
    console.error("Error searching recipes:", error);
    return NextResponse.json(
      { error: "Failed to search recipes." },
      { status: 500 }
    );
  }
}
