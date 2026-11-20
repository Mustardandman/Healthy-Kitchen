import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import {
  addMealPlanEntry,
  clearMealPlan,
  getConsolidatedShoppingList,
  getMealPlanEntries,
  getRecipeByIdOrSlug,
  removeMealPlanEntry,
  setShoppingListCheck,
  upsertExternalRecipeRecord,
} from "@/db/queries";
import { resolveAnyExternalRecipeDetail } from "@/lib/providers/external-apis";
import type { DayOfWeek, MealCategory } from "@/types/recipe";

export async function GET() {
  try {
    ensureSeeded();
    return NextResponse.json({
      entries: getMealPlanEntries(),
      shoppingList: getConsolidatedShoppingList(),
    });
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    return NextResponse.json({ error: "Failed to load meal planner" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureSeeded();
    const body = (await request.json()) as {
      dayOfWeek?: DayOfWeek;
      mealSlot?: MealCategory;
      recipeId?: string;
      servingsMultiplier?: number;
    };

    if (!body.dayOfWeek || !body.mealSlot || !body.recipeId) {
      return NextResponse.json(
        { error: "dayOfWeek, mealSlot, and recipeId are required" },
        { status: 400 }
      );
    }

    const existing = getRecipeByIdOrSlug(body.recipeId);
    if (!existing) {
      const external = await resolveAnyExternalRecipeDetail(body.recipeId);
      if (external) {
        upsertExternalRecipeRecord(external);
      }
    }

    const created = addMealPlanEntry({
      dayOfWeek: body.dayOfWeek,
      mealSlot: body.mealSlot,
      recipeId: body.recipeId,
      servingsMultiplier: body.servingsMultiplier ?? 1,
    });

    return NextResponse.json({
      ...created,
      entries: getMealPlanEntries(),
      shoppingList: getConsolidatedShoppingList(),
    });
  } catch (error) {
    console.error("Error adding meal plan entry:", error);
    return NextResponse.json({ error: "Failed to add to meal plan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    ensureSeeded();
    const body = (await request.json()) as { itemKey?: string; checked?: boolean };
    if (!body.itemKey || typeof body.checked !== "boolean") {
      return NextResponse.json({ error: "itemKey and checked are required" }, { status: 400 });
    }
    setShoppingListCheck(body.itemKey, body.checked);
    return NextResponse.json({ shoppingList: getConsolidatedShoppingList() });
  } catch (error) {
    console.error("Error updating shopping list check:", error);
    return NextResponse.json({ error: "Failed to update shopping list" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    ensureSeeded();
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    if (clearAll) {
      clearMealPlan();
    } else if (idParam) {
      removeMealPlanEntry(Number(idParam));
    } else {
      return NextResponse.json({ error: "id or clearAll is required" }, { status: 400 });
    }

    return NextResponse.json({
      entries: getMealPlanEntries(),
      shoppingList: getConsolidatedShoppingList(),
    });
  } catch (error) {
    console.error("Error removing meal plan entry:", error);
    return NextResponse.json({ error: "Failed to update meal plan" }, { status: 500 });
  }
}
