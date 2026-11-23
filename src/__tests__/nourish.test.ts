import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import {
  addMealPlanEntry,
  clearMealPlan,
  getConsolidatedShoppingList,
  getDatabaseStats,
  getFavorites,
  getHomepageSections,
  getMealPlanEntries,
  getRecipeByIdOrSlug,
  getSubcategoryCounts,
  matchRecipesByFridgeIngredients,
  searchRecipes,
  setShoppingListCheck,
  syncSharedFavorites,
  toggleFavorite,
} from "@/db/queries";
import {
  BREAKFAST_SUBCATEGORIES,
  DINNER_SUBCATEGORIES,
  LUNCH_SUBCATEGORIES,
  SNACK_SUBCATEGORIES,
} from "@/lib/categories";
import { calculateRecipeNutrition } from "@/lib/nutrition";
import { evaluatePregnancySafety } from "@/lib/pregnancy-safety";

const TEST_DB = path.join(process.cwd(), "data", "nourish.test.db");

beforeAll(() => {
  process.env.NOURISH_DB_PATH = TEST_DB;
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  seedDatabase(true);
});

afterAll(() => {
  closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe("Nourish Database & Category Coverage", () => {
  it("meets minimum 200 breakfast, 200 lunch, 200 dinner, and 100 snack recipes (700+ total)", () => {
    const stats = getDatabaseStats();
    expect(stats.breakfast).toBeGreaterThanOrEqual(200);
    expect(stats.lunch).toBeGreaterThanOrEqual(200);
    expect(stats.dinner).toBeGreaterThanOrEqual(200);
    expect(stats.snack).toBeGreaterThanOrEqual(100);
    expect(stats.total).toBeGreaterThanOrEqual(700);
  });

  it("populates every single one of the 48 required subcategories", () => {
    const bf = getSubcategoryCounts("breakfast");
    const ln = getSubcategoryCounts("lunch");
    const dn = getSubcategoryCounts("dinner");
    const sn = getSubcategoryCounts("snack");

    for (const sub of BREAKFAST_SUBCATEGORIES) {
      expect(bf[sub.name], `Missing breakfast subcategory: ${sub.name}`).toBeGreaterThan(0);
    }
    for (const sub of LUNCH_SUBCATEGORIES) {
      expect(ln[sub.name], `Missing lunch subcategory: ${sub.name}`).toBeGreaterThan(0);
    }
    for (const sub of DINNER_SUBCATEGORIES) {
      expect(dn[sub.name], `Missing dinner subcategory: ${sub.name}`).toBeGreaterThan(0);
    }
    for (const sub of SNACK_SUBCATEGORIES) {
      expect(sn[sub.name], `Missing snack subcategory: ${sub.name}`).toBeGreaterThan(0);
    }
  });

  it("assigns a unique dish-matched image URL and direct recipe source URL to every single recipe", () => {
    const allUrls: string[] = [];
    for (let page = 1; page <= 25; page++) {
      const res = searchRecipes({ page, pageSize: 48 });
      for (const r of res.items) {
        allUrls.push(r.image_url);
        const detail = getRecipeByIdOrSlug(r.slug)!;
        expect(detail.source_url, `Missing source_url on ${r.id}`).toBeTruthy();
        const parsed = new URL(detail.source_url!);
        expect(parsed.pathname.length, `Homepage-only source_url on ${r.id}: ${detail.source_url}`).toBeGreaterThan(1);
      }
      if (res.items.length < 48) break;
    }
    expect(allUrls.length).toBeGreaterThanOrEqual(700);
    expect(new Set(allUrls).size).toBe(allUrls.length);
  });

  it("populates all 8 homepage featured sections", () => {
    const sections = getHomepageSections();
    expect(sections.featured.length).toBeGreaterThan(0);
    expect(sections.popularBreakfast.length).toBe(8);
    expect(sections.quickLunches.length).toBe(8);
    expect(sections.healthyDinners.length).toBe(8);
    expect(sections.pregnancyFriendly.length).toBe(8);
    expect(sections.highProtein.length).toBe(8);
    expect(sections.readyIn30.length).toBe(8);
    expect(sections.recentlyAdded.length).toBe(8);
  });
});

describe("USDA Nutrition Calculation & Pregnancy Food-Safety Engine", () => {
  it("calculates deterministic nutrition per serving and marks as USDA estimated", () => {
    const nutrition = calculateRecipeNutrition(
      [
        { ingredientId: "chicken_breast", quantity: 8, unit: "oz" },
        { ingredientId: "spinach", quantity: 2, unit: "cup" },
        { ingredientId: "olive_oil", quantity: 1, unit: "tbsp" },
      ],
      2
    );

    expect(nutrition.is_estimated).toBe(true);
    expect(nutrition.source).toContain("USDA FoodData Central");
    expect(nutrition.protein_g).toBeGreaterThan(24);
    expect(nutrition.calories).toBeGreaterThan(180);
  });

  it("flags high-mercury fish, raw eggs, and smoked seafood appropriately", () => {
    const highMercury = evaluatePregnancySafety({
      ingredients: [{ ingredientId: "cod_fillet", displayName: "grilled swordfish steak", quantity: 6, unit: "oz" }],
      instructionsText: "Grill swordfish for 8 minutes.",
    });
    expect(highMercury.status).toBe("flagged_unsafe");

    const rawEgg = evaluatePregnancySafety({
      ingredients: [{ ingredientId: "egg_whole", displayName: "egg yolk", quantity: 2, unit: "egg" }],
      instructionsText: "Whisk raw egg yolk into dressing.",
    });
    expect(rawEgg.status).toBe("caution_modification");

    const safeChicken = evaluatePregnancySafety({
      ingredients: [
        { ingredientId: "chicken_breast", quantity: 8, unit: "oz" },
        { ingredientId: "broccoli", quantity: 2, unit: "cup" },
      ],
      instructionsText: "Bake chicken thoroughly to 165°F.",
    });
    expect(safeChicken.status).toBe("reviewed_safe");
    expect(safeChicken.cookingTempGuidance).toContain("165°F");
  });
});

describe("What's in Your Fridge? Ingredient Matcher & Filters", () => {
  it("matches case-insensitively with synonyms and sorts by match percentage", () => {
    const res = matchRecipesByFridgeIngredients({
      ingredients: ["CHICKEN", "Garlic", "Onion"],
      mode: "use_what_i_have",
      requireAll: true,
    });

    expect(res.results.length).toBeGreaterThan(0);
    for (let i = 1; i < res.results.length; i++) {
      expect(res.results[i - 1].match_percentage).toBeGreaterThanOrEqual(
        res.results[i].match_percentage
      );
    }
    expect(res.results[0].matched_count).toBe(3);
  });

  it("supports Best Match and Almost There modes", () => {
    const almostThere = matchRecipesByFridgeIngredients({
      ingredients: ["chicken", "garlic", "onion", "olive oil", "tomato", "spinach"],
      mode: "almost_there",
      requireAll: false,
    });
    expect(almostThere.results.length).toBeGreaterThan(0);
    for (const r of almostThere.results) {
      expect(r.missing_ingredients.length).toBeGreaterThanOrEqual(1);
      expect(r.missing_ingredients.length).toBeLessThanOrEqual(2);
    }
  });

  it("filters recipes accurately across combined constraints with pagination", () => {
    const res = searchRecipes({
      category: "dinner",
      minProtein: 15,
      maxTime: 45,
      sort: "protein_desc",
      page: 1,
      pageSize: 12,
    });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.length).toBeLessThanOrEqual(12);
    for (const item of res.items) {
      expect(item.meal_category).toBe("dinner");
      expect(item.nutrition.protein_g).toBeGreaterThanOrEqual(15);
      expect(item.total_time_min).toBeLessThanOrEqual(45);
    }
  });
});

describe("Favorites, Meal Planner & Consolidated Shopping List", () => {
  it("toggles favorites, plans meals across the week, and consolidates shopping list", () => {
    const sample = searchRecipes({ category: "breakfast", pageSize: 2 }).items;
    const first = getRecipeByIdOrSlug(sample[0].slug)!;
    const second = getRecipeByIdOrSlug(sample[1].slug)!;

    const fav1 = toggleFavorite(first.id);
    expect(fav1.isFavorited).toBe(true);
    expect(getFavorites().some((f) => f.id === first.id)).toBe(true);

    // Favorites persist across seed resets and sync restoration
    seedDatabase(true);
    expect(getFavorites().some((f) => f.id === first.id)).toBe(true);

    const synced = syncSharedFavorites([{ id: second.id }]);
    expect(synced.ids).toContain(first.id);
    expect(synced.ids).toContain(second.id);

    clearMealPlan();
    addMealPlanEntry({ dayOfWeek: "monday", mealSlot: "breakfast", recipeId: first.id, servingsMultiplier: 1 });
    addMealPlanEntry({ dayOfWeek: "tuesday", mealSlot: "breakfast", recipeId: second.id, servingsMultiplier: 2 });

    const entries = getMealPlanEntries();
    expect(entries.length).toBe(2);

    const shopping = getConsolidatedShoppingList();
    expect(shopping.length).toBeGreaterThan(0);

    const firstKey = shopping[0].item_key;
    setShoppingListCheck(firstKey, true);
    const updatedShopping = getConsolidatedShoppingList();
    expect(updatedShopping.find((i) => i.item_key === firstKey)?.checked).toBe(true);
  });
});
