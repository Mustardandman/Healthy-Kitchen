import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import { searchRecipes } from "@/db/queries";
import {
  getExternalProviderStatus,
  searchEdamamRecipes,
  searchFatSecretRecipes,
  searchSpoonacularRecipes,
  searchTheMealDbRecipes,
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
    const subcategory = searchParams.get("subcategory") ?? undefined;
    const maxTime = searchParams.get("maxTime") ? Number(searchParams.get("maxTime")) : undefined;
    const minProtein = searchParams.get("minProtein") ? Number(searchParams.get("minProtein")) : undefined;
    const maxCarbs = searchParams.get("maxCarbs") ? Number(searchParams.get("maxCarbs")) : undefined;
    const minFiber = searchParams.get("minFiber") ? Number(searchParams.get("minFiber")) : undefined;
    const maxCalories = searchParams.get("maxCalories") ? Number(searchParams.get("maxCalories")) : undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;

    const data = searchRecipes({
      q,
      category,
      subcategory,
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

    if (page === 1) {
      const effectiveQuery = q || subcategory || "";
      const [edamamHits, fatsecretHits, spoonHits, tmdbHits] = await Promise.all([
        providers.edamamConfigured
          ? searchEdamamRecipes({ query: effectiveQuery, category, limit: 8 })
          : Promise.resolve([]),
        providers.fatsecretConfigured && effectiveQuery
          ? searchFatSecretRecipes({ query: effectiveQuery, category })
          : Promise.resolve([]),
        providers.spoonacularConfigured && effectiveQuery
          ? searchSpoonacularRecipes({
            query: effectiveQuery,
            category,
            maxTime,
            minProtein,
            maxCarbs,
            minFiber,
            maxCalories,
            number: 6,
          })
          : Promise.resolve([]),
        providers.themealdbEnabled && effectiveQuery
          ? searchTheMealDbRecipes({ query: effectiveQuery, category, limit: 4 })
          : Promise.resolve([]),
      ]);

      const externalHits = [...edamamHits, ...fatsecretHits, ...spoonHits, ...tmdbHits];
      const seen = new Set(externalHits.map((r) => r.id));
      const dedupedLocal = data.items.filter((r) => !seen.has(r.id));
      const combined = [...externalHits, ...dedupedLocal];

      return NextResponse.json({
        ...data,
        items: combined.slice(0, 24),
        total: data.total + externalHits.length,
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
