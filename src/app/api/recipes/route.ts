import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import { searchRecipes } from "@/db/queries";
import { getExternalProviderStatus } from "@/lib/providers/external-apis";
import type { Difficulty, MealCategory, PregnancySafetyStatus, RecipeSortOption } from "@/types/recipe";

export async function GET(request: NextRequest) {
  try {
    ensureSeeded();
    const { searchParams } = new URL(request.url);
    const ingredientsRaw = searchParams.get("ingredients");
    const dietaryRaw = searchParams.get("dietary");

    const data = searchRecipes({
      q: searchParams.get("q") ?? undefined,
      category: (searchParams.get("category") as MealCategory | "") ?? undefined,
      subcategory: searchParams.get("subcategory") ?? undefined,
      ingredients: ingredientsRaw
        ? ingredientsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      maxTime: searchParams.get("maxTime") ? Number(searchParams.get("maxTime")) : undefined,
      minProtein: searchParams.get("minProtein") ? Number(searchParams.get("minProtein")) : undefined,
      maxCarbs: searchParams.get("maxCarbs") ? Number(searchParams.get("maxCarbs")) : undefined,
      minFiber: searchParams.get("minFiber") ? Number(searchParams.get("minFiber")) : undefined,
      maxCalories: searchParams.get("maxCalories") ? Number(searchParams.get("maxCalories")) : undefined,
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
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 24,
    });

    return NextResponse.json({
      ...data,
      providers: getExternalProviderStatus(),
    });
  } catch (error) {
    console.error("Error searching recipes:", error);
    return NextResponse.json(
      { error: "Failed to search recipes." },
      { status: 500 }
    );
  }
}

