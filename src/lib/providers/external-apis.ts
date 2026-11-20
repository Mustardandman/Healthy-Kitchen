/**
 * Server-side external API adapters with strict licensing, attribution, and caching compliance.
 * Keys are read exclusively from process.env on the server and never exposed to client bundles.
 */

import { deriveHealthClassifications, generateHealthAssessment } from "@/lib/nutrition";
import { evaluatePregnancySafety } from "@/lib/pregnancy-safety";
import type {
  FridgeMatchResult,
  MealCategory,
  NutritionInfo,
  RecipeCardItem,
  RecipeDetail,
  RecipeIngredientItem,
  RecipeStep,
} from "@/types/recipe";

export interface ProviderStatus {
  usdaConfigured: boolean;
  edamamConfigured: boolean;
  spoonacularConfigured: boolean;
}

export function getExternalProviderStatus(): ProviderStatus {
  return {
    usdaConfigured: Boolean(process.env.USDA_FDC_API_KEY),
    edamamConfigured: Boolean(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY),
    spoonacularConfigured: Boolean(process.env.SPOONACULAR_API_KEY),
  };
}

export interface UsdaFoodSearchHit {
  fdcId: number;
  description: string;
  dataType: string;
  nutrientsPer100g: Record<string, number>;
}

/**
 * Query USDA FoodData Central (CC0 1.0 Public Domain).
 */
export async function searchUsdaFoodDataCentral(
  query: string,
  pageSize = 5
): Promise<UsdaFoodSearchHit[]> {
  const apiKey = process.env.USDA_FDC_API_KEY || "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(
    apiKey
  )}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=${pageSize}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      foods?: Array<{
        fdcId: number;
        description: string;
        dataType: string;
        foodNutrients?: Array<{ nutrientName: string; value: number }>;
      }>;
    };

    return (json.foods ?? []).map((food) => {
      const nutrientsPer100g: Record<string, number> = {};
      for (const n of food.foodNutrients ?? []) {
        nutrientsPer100g[n.nutrientName] = n.value;
      }
      return {
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        nutrientsPer100g,
      };
    });
  } catch {
    return [];
  }
}

// Strict 1-hour TTL cache in memory for Spoonacular per ToS (max 1 hour caching)
const ONE_HOUR_MS = 60 * 60 * 1000;
const spoonacularSearchCache = new Map<string, { expiresAt: number; data: RecipeCardItem[] }>();
const spoonacularDetailCache = new Map<string, { expiresAt: number; data: RecipeDetail }>();
const edamamDetailCache = new Map<string, { expiresAt: number; data: RecipeDetail }>();

function mapMealCategory(raw?: string): MealCategory {
  const low = (raw || "").toLowerCase();
  if (low.includes("breakfast") || low.includes("morning")) return "breakfast";
  if (low.includes("snack") || low.includes("appetizer")) return "snack";
  if (low.includes("lunch")) return "lunch";
  return "dinner";
}

export async function searchSpoonacularRecipes(params: {
  query?: string;
  category?: MealCategory | "";
  maxTime?: number;
  minProtein?: number;
  maxCarbs?: number;
  minFiber?: number;
  maxCalories?: number;
  number?: number;
}): Promise<RecipeCardItem[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return [];

  const q = params.query?.trim() || params.category || "healthy balanced";
  const cacheKey = JSON.stringify({ ...params, q });
  const cached = spoonacularSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const sp = new URLSearchParams({
    apiKey,
    query: q,
    addRecipeNutrition: "true",
    addRecipeInformation: "true",
    number: String(params.number ?? 8),
  });
  if (params.category) {
    sp.set("type", params.category === "snack" ? "snack" : "main course");
  }
  if (params.maxTime) sp.set("maxReadyTime", String(params.maxTime));
  if (params.minProtein) sp.set("minProtein", String(params.minProtein));
  if (params.maxCarbs) sp.set("maxCarbs", String(params.maxCarbs));
  if (params.minFiber) sp.set("minFiber", String(params.minFiber));
  if (params.maxCalories) sp.set("maxCalories", String(params.maxCalories));

  try {
    const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${sp.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: Array<{
        id: number;
        title: string;
        image?: string;
        readyInMinutes?: number;
        servings?: number;
        cuisines?: string[];
        dishTypes?: string[];
        summary?: string;
        nutrition?: {
          nutrients?: Array<{ name: string; amount: number }>;
        };
      }>;
    };

    const items: RecipeCardItem[] = (json.results ?? []).map((r) => {
      const findNutrient = (name: string) =>
        Math.round(
          (r.nutrition?.nutrients?.find((n) => n.name.toLowerCase() === name.toLowerCase())
            ?.amount ?? 0) * 10
        ) / 10;

      const mealCat = params.category || mapMealCategory(r.dishTypes?.[0]);
      const nutrition: NutritionInfo = {
        calories: Math.round(findNutrient("Calories")),
        carbs_g: findNutrient("Carbohydrates"),
        protein_g: findNutrient("Protein"),
        fat_g: findNutrient("Fat"),
        fiber_g: findNutrient("Fiber"),
        sugar_g: findNutrient("Sugar"),
        added_sugar_g: null,
        sodium_mg: Math.round(findNutrient("Sodium")),
        calcium_mg: Math.round(findNutrient("Calcium")),
        iron_mg: findNutrient("Iron"),
        folate_mcg: Math.round(findNutrient("Folate")),
        is_estimated: true,
        source: "Spoonacular Recipe API",
      };

      const totalTime = r.readyInMinutes || 30;
      const classifications = deriveHealthClassifications({
        mealCategory: mealCat,
        ingredients: [],
        nutrition,
        totalTimeMin: totalTime,
        difficulty: totalTime <= 30 ? "Easy" : "Medium",
        pregnancyStatus: "needs_review",
      });

      const cleanDesc = (r.summary || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);

      return {
        id: `spoonacular-${r.id}`,
        slug: `spoonacular-${r.id}`,
        name: r.title,
        description: cleanDesc || "Live recipe retrieved from Spoonacular API.",
        meal_category: mealCat,
        primary_subcategory: r.dishTypes?.[0] || "Spoonacular",
        subcategories: r.dishTypes?.slice(0, 3) || ["Spoonacular"],
        image_url: r.image || "/images/food/grain-bowl.jpg",
        cuisine: r.cuisines?.[0] || "International",
        difficulty: totalTime <= 30 ? "Easy" : "Medium",
        prep_time_min: Math.round(totalTime * 0.35),
        cook_time_min: Math.round(totalTime * 0.65),
        total_time_min: totalTime,
        servings: r.servings || 2,
        nutrition,
        classifications: classifications.length > 0 ? classifications : ["Balanced Nutrition"],
        pregnancy_safety_status: "needs_review",
        is_featured: false,
        popularity_score: 90,
        created_at: new Date().toISOString(),
      };
    });

    spoonacularSearchCache.set(cacheKey, {
      expiresAt: Date.now() + ONE_HOUR_MS,
      data: items,
    });
    return items;
  } catch {
    return [];
  }
}

/**
 * Spoonacular /recipes/findByIngredients integration for "What's in Your Fridge?"
 */
export async function findSpoonacularByIngredients(
  ingredients: string[],
  number = 12
): Promise<FridgeMatchResult[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey || ingredients.length === 0) return [];

  const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${encodeURIComponent(
    apiKey
  )}&ingredients=${encodeURIComponent(ingredients.join(","))}&number=${number}&ranking=1&ignorePantry=true`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as Array<{
      id: number;
      title: string;
      image?: string;
      usedIngredientCount: number;
      missedIngredientCount: number;
      usedIngredients?: Array<{ name: string }>;
      missedIngredients?: Array<{ name: string }>;
    }>;

    return json.map((r) => {
      const used = (r.usedIngredients ?? []).map((u) => u.name);
      const missed = (r.missedIngredients ?? []).map((m) => m.name);
      const totalIngs = Math.max(1, r.usedIngredientCount + r.missedIngredientCount);
      const matchPercentage = Math.round((r.usedIngredientCount / totalIngs) * 100);

      return {
        id: `spoonacular-${r.id}`,
        slug: `spoonacular-${r.id}`,
        name: r.title,
        description: "Live ingredient match via Spoonacular findByIngredients API.",
        meal_category: "dinner",
        primary_subcategory: "Spoonacular Match",
        subcategories: ["Spoonacular Match"],
        image_url: r.image || "/images/food/grain-bowl.jpg",
        cuisine: "International",
        difficulty: "Easy",
        prep_time_min: 10,
        cook_time_min: 20,
        total_time_min: 30,
        servings: 2,
        nutrition: {
          calories: 0,
          carbs_g: 0,
          protein_g: 0,
          fat_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          added_sugar_g: null,
          sodium_mg: 0,
          calcium_mg: 0,
          iron_mg: 0,
          folate_mcg: 0,
          is_estimated: true,
          source: "Open recipe to load Spoonacular nutrition",
        },
        classifications: ["Balanced Nutrition"],
        pregnancy_safety_status: "needs_review",
        is_featured: false,
        popularity_score: 90,
        created_at: new Date().toISOString(),
        matched_ingredients: used,
        missing_ingredients: missed,
        matched_count: r.usedIngredientCount,
        total_ingredients_count: totalIngs,
        match_percentage: matchPercentage,
      };
    });
  } catch {
    return [];
  }
}

export async function getSpoonacularRecipeDetail(
  spoonacularId: string
): Promise<RecipeDetail | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const numericId = spoonacularId.replace(/^spoonacular-/, "");
  const cached = spoonacularDetailCache.get(numericId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `https://api.spoonacular.com/recipes/${encodeURIComponent(
    numericId
  )}/information?apiKey=${encodeURIComponent(apiKey)}&includeNutrition=true`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const r = (await res.json()) as {
      id: number;
      title: string;
      image?: string;
      readyInMinutes?: number;
      preparationMinutes?: number;
      cookingMinutes?: number;
      servings?: number;
      sourceName?: string;
      sourceUrl?: string;
      spoonacularSourceUrl?: string;
      cuisines?: string[];
      dishTypes?: string[];
      summary?: string;
      extendedIngredients?: Array<{
        id: number;
        name: string;
        original: string;
        amount: number;
        unit: string;
      }>;
      analyzedInstructions?: Array<{
        steps?: Array<{ number: number; step: string }>;
      }>;
      nutrition?: {
        nutrients?: Array<{ name: string; amount: number }>;
      };
    };

    const findNutrient = (name: string) =>
      Math.round(
        (r.nutrition?.nutrients?.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount ??
          0) * 10
      ) / 10;

    const nutrition: NutritionInfo = {
      calories: Math.round(findNutrient("Calories")),
      carbs_g: findNutrient("Carbohydrates"),
      protein_g: findNutrient("Protein"),
      fat_g: findNutrient("Fat"),
      fiber_g: findNutrient("Fiber"),
      sugar_g: findNutrient("Sugar"),
      added_sugar_g: null,
      sodium_mg: Math.round(findNutrient("Sodium")),
      calcium_mg: Math.round(findNutrient("Calcium")),
      iron_mg: findNutrient("Iron"),
      folate_mcg: Math.round(findNutrient("Folate")),
      is_estimated: true,
      source: "Spoonacular Recipe API (per serving)",
    };

    const instructions: RecipeStep[] = (r.analyzedInstructions?.[0]?.steps ?? []).map((s) => ({
      step: s.number,
      instruction: s.step,
    }));

    const ingredients: RecipeIngredientItem[] = (r.extendedIngredients ?? []).map((ing) => ({
      ingredient_id: String(ing.id || ing.name),
      canonical_name: ing.name,
      display_name: ing.original || ing.name,
      quantity: ing.amount || 1,
      unit: ing.unit || "",
      gram_weight: 50,
    }));

    const safety = evaluatePregnancySafety({
      ingredients: ingredients.map((i) => ({
        ingredientId: i.canonical_name,
        displayName: i.display_name,
        quantity: i.quantity,
        unit: i.unit,
      })),
      instructionsText: instructions.map((s) => s.instruction).join(" "),
    });

    const totalTime = r.readyInMinutes || 30;
    const mealCat = mapMealCategory(r.dishTypes?.[0]);
    const classifications = deriveHealthClassifications({
      mealCategory: mealCat,
      ingredients: [],
      nutrition,
      totalTimeMin: totalTime,
      difficulty: totalTime <= 30 ? "Easy" : "Medium",
      pregnancyStatus: safety.status,
    });

    const assessment = generateHealthAssessment({
      ingredients: [],
      nutrition,
      mealCategory: mealCat,
    });

    const detail: RecipeDetail = {
      id: `spoonacular-${r.id}`,
      slug: `spoonacular-${r.id}`,
      name: r.title,
      description: (r.summary || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 260),
      meal_category: mealCat,
      primary_subcategory: r.dishTypes?.[0] || "Spoonacular",
      subcategories: r.dishTypes?.slice(0, 3) || ["Spoonacular"],
      image_url: r.image || "/images/food/grain-bowl.jpg",
      cuisine: r.cuisines?.[0] || "International",
      difficulty: totalTime <= 30 ? "Easy" : "Medium",
      prep_time_min: r.preparationMinutes || Math.round(totalTime * 0.35),
      cook_time_min: r.cookingMinutes || Math.round(totalTime * 0.65),
      total_time_min: totalTime,
      servings: r.servings || 2,
      nutrition,
      classifications: classifications.length > 0 ? classifications : ["Balanced Nutrition"],
      pregnancy_safety_status: safety.status,
      is_featured: false,
      popularity_score: 90,
      created_at: new Date().toISOString(),
      ingredients,
      instructions,
      instructions_license_mode: instructions.length > 0 ? "licensed_display" : "link_only",
      health_assessment: assessment,
      pregnancy_safety_notes: safety.notes,
      cooking_temp_guidance: safety.cookingTempGuidance,
      source_name: r.sourceName || "Original Recipe Publisher (via Spoonacular)",
      source_attribution: `Recipe data via Spoonacular API • Original source: ${
        r.sourceName || "Publisher Website"
      }`,
      source_url: r.sourceUrl || r.spoonacularSourceUrl || null,
      license_type: "Spoonacular API (1-hour temporary cache)",
      is_favorited: false,
    };

    spoonacularDetailCache.set(numericId, {
      expiresAt: Date.now() + ONE_HOUR_MS,
      data: detail,
    });

    return detail;
  } catch {
    return null;
  }
}

export async function searchEdamamRecipes(params: {
  query?: string;
  category?: MealCategory | "";
}): Promise<RecipeCardItem[]> {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) return [];

  const q = params.query?.trim() || params.category || "balanced healthy";
  const sp = new URLSearchParams({
    type: "public",
    q,
    app_id: appId,
    app_key: appKey,
  });
  if (params.category) {
    sp.set("mealType", params.category === "snack" ? "Snack" : params.category);
  }

  try {
    const res = await fetch(`https://api.edamam.com/api/recipes/v2?${sp.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      hits?: Array<{
        recipe: {
          uri: string;
          label: string;
          image: string;
          source: string;
          url: string;
          yield: number;
          totalTime?: number;
          calories: number;
          cuisineType?: string[];
          mealType?: string[];
          ingredientLines?: string[];
          totalNutrients?: {
            CHOCDF?: { quantity: number };
            PROCNT?: { quantity: number };
            FAT?: { quantity: number };
            FIBTG?: { quantity: number };
            SUGAR?: { quantity: number };
            NA?: { quantity: number };
            CA?: { quantity: number };
            FE?: { quantity: number };
            FOLDFE?: { quantity: number };
          };
        };
      }>;
    };

    return (json.hits ?? []).slice(0, 8).map((hit) => {
      const r = hit.recipe;
      const servings = Math.max(1, r.yield || 2);
      const idHash = Buffer.from(r.uri).toString("base64url").slice(0, 24);
      const slug = `edamam-${idHash}`;
      const totalTime = r.totalTime && r.totalTime > 0 ? r.totalTime : 30;
      const mealCat = params.category || mapMealCategory(r.mealType?.[0]);

      const nutrition: NutritionInfo = {
        calories: Math.round(r.calories / servings),
        carbs_g: Math.round(((r.totalNutrients?.CHOCDF?.quantity ?? 0) / servings) * 10) / 10,
        protein_g: Math.round(((r.totalNutrients?.PROCNT?.quantity ?? 0) / servings) * 10) / 10,
        fat_g: Math.round(((r.totalNutrients?.FAT?.quantity ?? 0) / servings) * 10) / 10,
        fiber_g: Math.round(((r.totalNutrients?.FIBTG?.quantity ?? 0) / servings) * 10) / 10,
        sugar_g: Math.round(((r.totalNutrients?.SUGAR?.quantity ?? 0) / servings) * 10) / 10,
        added_sugar_g: null,
        sodium_mg: Math.round((r.totalNutrients?.NA?.quantity ?? 0) / servings),
        calcium_mg: Math.round((r.totalNutrients?.CA?.quantity ?? 0) / servings),
        iron_mg: Math.round(((r.totalNutrients?.FE?.quantity ?? 0) / servings) * 10) / 10,
        folate_mcg: Math.round((r.totalNutrients?.FOLDFE?.quantity ?? 0) / servings),
        is_estimated: true,
        source: "Powered by Edamam Recipe Search API",
      };

      const ingredients: RecipeIngredientItem[] = (r.ingredientLines ?? []).map((line, i) => ({
        ingredient_id: `edamam-ing-${i}`,
        canonical_name: line,
        display_name: line,
        quantity: 1,
        unit: "",
        gram_weight: 50,
      }));

      const safety = evaluatePregnancySafety({
        ingredients: ingredients.map((i) => ({
          ingredientId: i.canonical_name,
          displayName: i.display_name,
          quantity: 1,
          unit: "",
        })),
        instructionsText: "",
      });

      const classifications = deriveHealthClassifications({
        mealCategory: mealCat,
        ingredients: [],
        nutrition,
        totalTimeMin: totalTime,
        difficulty: totalTime <= 30 ? "Easy" : "Medium",
        pregnancyStatus: safety.status,
      });

      const detail: RecipeDetail = {
        id: slug,
        slug,
        name: r.label,
        description: `Indexed from ${r.source} via Edamam. View the full cooking instructions on the original website linked below.`,
        meal_category: mealCat,
        primary_subcategory: r.source,
        subcategories: [r.source],
        image_url: r.image || "/images/food/grain-bowl.jpg",
        cuisine: r.cuisineType?.[0] || "International",
        difficulty: totalTime <= 30 ? "Easy" : "Medium",
        prep_time_min: Math.round(totalTime * 0.35),
        cook_time_min: Math.round(totalTime * 0.65),
        total_time_min: totalTime,
        servings,
        nutrition,
        classifications: classifications.length > 0 ? classifications : ["Balanced Nutrition"],
        pregnancy_safety_status: safety.status,
        is_featured: false,
        popularity_score: 88,
        created_at: new Date().toISOString(),
        ingredients,
        instructions: [],
        instructions_license_mode: "link_only",
        health_assessment: generateHealthAssessment({
          ingredients: [],
          nutrition,
          mealCategory: mealCat,
        }),
        pregnancy_safety_notes: safety.notes,
        cooking_temp_guidance: safety.cookingTempGuidance,
        source_name: r.source,
        source_attribution: `Powered by Edamam • Original recipe published by ${r.source}`,
        source_url: r.url,
        license_type: "Edamam Recipe Search API (link-only instructions)",
        is_favorited: false,
      };

      edamamDetailCache.set(slug, {
        expiresAt: Date.now() + ONE_HOUR_MS,
        data: detail,
      });

      return {
        id: detail.id,
        slug: detail.slug,
        name: detail.name,
        description: detail.description,
        meal_category: detail.meal_category,
        primary_subcategory: detail.primary_subcategory,
        subcategories: detail.subcategories,
        image_url: detail.image_url,
        cuisine: detail.cuisine,
        difficulty: detail.difficulty,
        prep_time_min: detail.prep_time_min,
        cook_time_min: detail.cook_time_min,
        total_time_min: detail.total_time_min,
        servings: detail.servings,
        nutrition: detail.nutrition,
        classifications: detail.classifications,
        pregnancy_safety_status: detail.pregnancy_safety_status,
        is_featured: false,
        popularity_score: 88,
        created_at: detail.created_at,
      };
    });
  } catch {
    return [];
  }
}

export function getCachedEdamamRecipeDetail(slug: string): RecipeDetail | null {
  const cached = edamamDetailCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  return null;
}
