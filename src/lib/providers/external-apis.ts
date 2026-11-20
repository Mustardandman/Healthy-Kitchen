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
  fatsecretConfigured: boolean;
  themealdbEnabled: boolean;
}

export function getExternalProviderStatus(): ProviderStatus {
  return {
    usdaConfigured: Boolean(process.env.USDA_FDC_API_KEY),
    edamamConfigured: Boolean(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY),
    spoonacularConfigured: Boolean(process.env.SPOONACULAR_API_KEY),
    fatsecretConfigured: Boolean(
      process.env.FATSECRET_CLIENT_ID && process.env.FATSECRET_CLIENT_SECRET
    ),
    themealdbEnabled: process.env.THEMEALDB_ENABLED !== "false",
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

const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

const spoonacularSearchCache = new Map<string, { expiresAt: number; data: RecipeCardItem[] }>();
const spoonacularDetailCache = new Map<string, { expiresAt: number; data: RecipeDetail }>();
const edamamSearchCache = new Map<string, { expiresAt: number; data: RecipeCardItem[] }>();
const edamamDetailCache = new Map<string, { expiresAt: number; data: RecipeDetail }>();
const fatsecretDetailCache = new Map<string, { expiresAt: number; data: RecipeDetail }>();

let fatsecretTokenCache: { token: string; expiresAt: number } | null = null;

function mapMealCategory(raw?: string): MealCategory {
  const low = (raw || "").toLowerCase();
  if (low.includes("breakfast") || low.includes("morning")) return "breakfast";
  if (low.includes("snack") || low.includes("appetizer") || low.includes("starter")) return "snack";
  if (low.includes("lunch") || low.includes("salad")) return "lunch";
  return "dinner";
}

/* ==========================================================================
   SPOONACULAR ADAPTER (Optional Paid/Trial Key; Strict 1-Hour Cache)
   ========================================================================== */

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
      health_assessment: generateHealthAssessment({
        ingredients: [],
        nutrition,
        mealCategory: mealCat,
      }),
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

/* ==========================================================================
   EDAMAM RECIPE SEARCH V2 ADAPTER ($0 Free Developer Plan)
   ========================================================================== */

interface EdamamRawRecipe {
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
}

function mapEdamamRawToDetail(
  r: EdamamRawRecipe,
  categoryOverride?: MealCategory | ""
): RecipeDetail {
  const servings = Math.max(1, r.yield || 2);
  const recipeHash = r.uri.includes("#recipe_")
    ? r.uri.split("#recipe_")[1]
    : Buffer.from(r.uri).toString("base64url");
  const slug = `edamam-${recipeHash}`;
  const totalTime = r.totalTime && r.totalTime > 0 ? Math.round(r.totalTime) : 30;
  const mealCat = categoryOverride || mapMealCategory(r.mealType?.[0]);

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
    description: `Published by ${r.source} (via Edamam). View full step-by-step instructions on the original website linked below.`,
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
    popularity_score: 92,
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

  return detail;
}

export async function searchEdamamRecipes(params: {
  query?: string;
  category?: MealCategory | "";
  limit?: number;
}): Promise<RecipeCardItem[]> {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) return [];

  const defaultQueryByCat: Record<MealCategory, string> = {
    breakfast: "healthy protein breakfast oats eggs yogurt",
    lunch: "healthy chicken salad quinoa bowl soup",
    dinner: "healthy salmon chicken vegetable dinner",
    snack: "healthy yogurt fruit nuts hummus snack",
  };

  const q =
    params.query?.trim() ||
    (params.category ? defaultQueryByCat[params.category] : "healthy balanced salmon chicken");
  const limit = params.limit ?? 8;
  const cacheKey = `${q}::${params.category || ""}::${limit}`;

  const cached = edamamSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const sp = new URLSearchParams({
    type: "public",
    q,
    app_id: appId,
    app_key: appKey,
    health: "alcohol-free",
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
      hits?: Array<{ recipe: EdamamRawRecipe }>;
    };

    const items: RecipeCardItem[] = (json.hits ?? []).slice(0, limit).map((hit) => {
      const detail = mapEdamamRawToDetail(hit.recipe, params.category);
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
        popularity_score: detail.popularity_score,
        created_at: detail.created_at,
      };
    });

    edamamSearchCache.set(cacheKey, {
      expiresAt: Date.now() + THIRTY_MIN_MS,
      data: items,
    });

    return items;
  } catch {
    return [];
  }
}

export async function findEdamamByIngredients(params: {
  ingredients: string[];
  category?: MealCategory | "";
  limit?: number;
}): Promise<FridgeMatchResult[]> {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey || params.ingredients.length === 0) return [];

  const q = params.ingredients.join(" ");
  const sp = new URLSearchParams({
    type: "public",
    q,
    app_id: appId,
    app_key: appKey,
    health: "alcohol-free",
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
      hits?: Array<{ recipe: EdamamRawRecipe }>;
    };

    const userTerms = params.ingredients.map((s) => s.trim().toLowerCase()).filter(Boolean);

    return (json.hits ?? []).slice(0, params.limit ?? 8).map((hit) => {
      const detail = mapEdamamRawToDetail(hit.recipe, params.category);
      const lines = (hit.recipe.ingredientLines ?? []).map((l) => l.toLowerCase());
      const matched = userTerms.filter((t) => lines.some((line) => line.includes(t)));
      const missing = (hit.recipe.ingredientLines ?? [])
        .filter((line) => !userTerms.some((t) => line.toLowerCase().includes(t)))
        .slice(0, 6);

      const total = Math.max(1, lines.length);
      const pct = Math.min(
        100,
        Math.round(((matched.length || 1) / Math.max(1, userTerms.length)) * 75 + 20)
      );

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
        popularity_score: detail.popularity_score,
        created_at: detail.created_at,
        matched_ingredients: matched.length > 0 ? matched : userTerms.slice(0, 1),
        missing_ingredients: missing,
        matched_count: matched.length || 1,
        total_ingredients_count: total,
        match_percentage: pct,
      };
    });
  } catch {
    return [];
  }
}

export async function getEdamamRecipeDetail(slug: string): Promise<RecipeDetail | null> {
  const cached = edamamDetailCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) return null;

  const recipeHash = slug.replace(/^edamam-/, "");
  try {
    const res = await fetch(
      `https://api.edamam.com/api/recipes/v2/${encodeURIComponent(
        recipeHash
      )}?type=public&app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { recipe?: EdamamRawRecipe };
    if (!json.recipe) return null;
    return mapEdamamRawToDetail(json.recipe);
  } catch {
    return null;
  }
}

/* ==========================================================================
   FATSECRET PLATFORM API ADAPTER ($0 Free Basic Edition, OAuth 2.0)
   ========================================================================== */

async function getFatSecretAccessToken(): Promise<string | null> {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (fatsecretTokenCache && fatsecretTokenCache.expiresAt > Date.now() + 60_000) {
    return fatsecretTokenCache.token;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "basic",
    });

    const res = await fetch("https://oauth.fatsecret.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;

    fatsecretTokenCache = {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return json.access_token;
  } catch {
    return null;
  }
}

export async function searchFatSecretRecipes(params: {
  query?: string;
  category?: MealCategory | "";
}): Promise<RecipeCardItem[]> {
  const token = await getFatSecretAccessToken();
  if (!token) return [];

  const q = params.query?.trim() || params.category || "healthy";
  const sp = new URLSearchParams({
    search_expression: q,
    max_results: "6",
    must_have_images: "true",
    format: "json",
  });

  try {
    const res = await fetch(
      `https://platform.fatsecret.com/rest/recipes/search/v3?${sp.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      error?: { code: number; message: string };
      recipes?: {
        recipe?: Array<{
          recipe_id: string;
          recipe_name: string;
          recipe_description?: string;
          recipe_image?: string;
          recipe_nutrition?: {
            calories?: string;
            carbohydrate?: string;
            protein?: string;
            fat?: string;
          };
          recipe_types?: { recipe_type?: string[] };
        }>;
      };
    };

    if (json.error) return [];

    const list = json.recipes?.recipe ?? [];
    const mealCat = params.category || "dinner";

    return list.map((r) => {
      const nutrition: NutritionInfo = {
        calories: Math.round(Number(r.recipe_nutrition?.calories ?? 0)),
        carbs_g: Math.round(Number(r.recipe_nutrition?.carbohydrate ?? 0) * 10) / 10,
        protein_g: Math.round(Number(r.recipe_nutrition?.protein ?? 0) * 10) / 10,
        fat_g: Math.round(Number(r.recipe_nutrition?.fat ?? 0) * 10) / 10,
        fiber_g: 0,
        sugar_g: 0,
        added_sugar_g: null,
        sodium_mg: 0,
        calcium_mg: 0,
        iron_mg: 0,
        folate_mcg: 0,
        is_estimated: true,
        source: "FatSecret Platform API",
      };

      const slug = `fatsecret-${r.recipe_id}`;
      return {
        id: slug,
        slug,
        name: r.recipe_name,
        description: r.recipe_description || "Recipe from FatSecret Platform API.",
        meal_category: mealCat,
        primary_subcategory: r.recipe_types?.recipe_type?.[0] || "FatSecret",
        subcategories: r.recipe_types?.recipe_type?.slice(0, 3) || ["FatSecret"],
        image_url: r.recipe_image || "/images/food/grain-bowl.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prep_time_min: 10,
        cook_time_min: 20,
        total_time_min: 30,
        servings: 2,
        nutrition,
        classifications: deriveHealthClassifications({
          mealCategory: mealCat,
          ingredients: [],
          nutrition,
          totalTimeMin: 30,
          difficulty: "Easy",
          pregnancyStatus: "needs_review",
        }),
        pregnancy_safety_status: "needs_review",
        is_featured: false,
        popularity_score: 86,
        created_at: new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

export async function getFatSecretRecipeDetail(
  slug: string
): Promise<RecipeDetail | null> {
  const recipeId = slug.replace(/^fatsecret-/, "");
  const cached = fatsecretDetailCache.get(recipeId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const token = await getFatSecretAccessToken();
  if (!token) return null;

  try {
    const sp = new URLSearchParams({
      recipe_id: recipeId,
      format: "json",
    });
    const res = await fetch(`https://platform.fatsecret.com/rest/recipe/v2?${sp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      recipe?: {
        recipe_id: string;
        recipe_name: string;
        recipe_description?: string;
        recipe_url?: string;
        recipe_images?: { recipe_image?: string[] | string };
        number_of_servings?: string;
        preparation_time_min?: string;
        cooking_time_min?: string;
        serving_sizes?: {
          serving?: Record<string, string> | Array<Record<string, string>>;
        };
        ingredients?: {
          ingredient?: Array<{
            food_id?: string;
            food_name?: string;
            ingredient_description?: string;
            number_of_units?: string;
            measurement_description?: string;
          }>;
        };
        directions?: {
          direction?: Array<{
            direction_number?: string;
            direction_description?: string;
          }>;
        };
      };
    };

    const r = json.recipe;
    if (!r) return null;

    const rawSrv = r.serving_sizes?.serving;
    const srv = Array.isArray(rawSrv) ? rawSrv[0] : rawSrv;
    const nutrition: NutritionInfo = {
      calories: Math.round(Number(srv?.calories ?? 0)),
      carbs_g: Math.round(Number(srv?.carbohydrate ?? 0) * 10) / 10,
      protein_g: Math.round(Number(srv?.protein ?? 0) * 10) / 10,
      fat_g: Math.round(Number(srv?.fat ?? 0) * 10) / 10,
      fiber_g: Math.round(Number(srv?.fiber ?? 0) * 10) / 10,
      sugar_g: Math.round(Number(srv?.sugar ?? 0) * 10) / 10,
      added_sugar_g: srv?.added_sugars !== undefined ? Number(srv.added_sugars) : null,
      sodium_mg: Math.round(Number(srv?.sodium ?? 0)),
      calcium_mg: Math.round(Number(srv?.calcium ?? 0)),
      iron_mg: Math.round(Number(srv?.iron ?? 0) * 10) / 10,
      folate_mcg: 0,
      is_estimated: true,
      source: "FatSecret Platform API",
    };

    const ingredients: RecipeIngredientItem[] = (r.ingredients?.ingredient ?? []).map((ing, i) => ({
      ingredient_id: ing.food_id || `fs-${i}`,
      canonical_name: ing.food_name || ing.ingredient_description || "ingredient",
      display_name: ing.ingredient_description || ing.food_name || "",
      quantity: Number(ing.number_of_units ?? 1) || 1,
      unit: ing.measurement_description || "",
      gram_weight: 50,
    }));

    const instructions: RecipeStep[] = (r.directions?.direction ?? []).map((d, i) => ({
      step: Number(d.direction_number ?? i + 1),
      instruction: d.direction_description || "",
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

    const prepMin = Number(r.preparation_time_min ?? 10) || 10;
    const cookMin = Number(r.cooking_time_min ?? 20) || 20;
    const totalTime = prepMin + cookMin;

    const rawImages = r.recipe_images?.recipe_image;
    const imgUrl = Array.isArray(rawImages)
      ? rawImages[0]
      : rawImages || "/images/food/grain-bowl.jpg";

    const detail: RecipeDetail = {
      id: `fatsecret-${r.recipe_id}`,
      slug: `fatsecret-${r.recipe_id}`,
      name: r.recipe_name,
      description: r.recipe_description || "Recipe from FatSecret Platform API.",
      meal_category: "dinner",
      primary_subcategory: "FatSecret",
      subcategories: ["FatSecret"],
      image_url: imgUrl,
      cuisine: "American",
      difficulty: totalTime <= 30 ? "Easy" : "Medium",
      prep_time_min: prepMin,
      cook_time_min: cookMin,
      total_time_min: totalTime,
      servings: Number(r.number_of_servings ?? 2) || 2,
      nutrition,
      classifications: deriveHealthClassifications({
        mealCategory: "dinner",
        ingredients: [],
        nutrition,
        totalTimeMin: totalTime,
        difficulty: totalTime <= 30 ? "Easy" : "Medium",
        pregnancyStatus: safety.status,
      }),
      pregnancy_safety_status: safety.status,
      is_featured: false,
      popularity_score: 86,
      created_at: new Date().toISOString(),
      ingredients,
      instructions,
      instructions_license_mode: "licensed_display",
      health_assessment: generateHealthAssessment({
        ingredients: [],
        nutrition,
        mealCategory: "dinner",
      }),
      pregnancy_safety_notes: safety.notes,
      cooking_temp_guidance: safety.cookingTempGuidance,
      source_name: "FatSecret",
      source_attribution: "Recipe & nutrition data powered by FatSecret Platform API",
      source_url: r.recipe_url || "https://www.fatsecret.com/",
      license_type: "FatSecret Platform API",
      is_favorited: false,
    };

    fatsecretDetailCache.set(recipeId, {
      expiresAt: Date.now() + ONE_HOUR_MS,
      data: detail,
    });

    return detail;
  } catch {
    return null;
  }
}

/* ==========================================================================
   THEMEALDB FREE PUBLIC API ADAPTER (Key "1", Zero-Signup)
   ========================================================================== */

interface TheMealDbRaw {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strSource?: string;
  [key: string]: string | undefined;
}

function parseTheMealDbIngredients(m: TheMealDbRaw): RecipeIngredientItem[] {
  const list: RecipeIngredientItem[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (m[`strIngredient${i}`] || "").trim();
    const meas = (m[`strMeasure${i}`] || "").trim();
    if (!ing) continue;
    list.push({
      ingredient_id: `tmdb-${ing.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      canonical_name: ing.toLowerCase(),
      display_name: meas ? `${meas} ${ing}` : ing,
      quantity: 1,
      unit: "",
      gram_weight: 50,
    });
  }
  return list;
}

export async function searchTheMealDbRecipes(params: {
  query?: string;
  category?: MealCategory | "";
  limit?: number;
}): Promise<RecipeCardItem[]> {
  if (process.env.THEMEALDB_ENABLED === "false") return [];
  const defaultQ: Record<MealCategory, string> = {
    breakfast: "egg",
    lunch: "salad",
    dinner: "salmon",
    snack: "yogurt",
  };
  const q = params.query?.trim() || (params.category ? defaultQ[params.category] : "chicken");
  const apiKey = process.env.THEMEALDB_API_KEY || "1";

  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/${encodeURIComponent(
        apiKey
      )}/search.php?s=${encodeURIComponent(q)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { meals?: TheMealDbRaw[] | null };
    const meals = (json.meals ?? []).slice(0, params.limit ?? 6);

    return meals.map((m) => {
      const mealCat = params.category || mapMealCategory(m.strCategory);
      const slug = `themealdb-${m.idMeal}`;
      return {
        id: slug,
        slug,
        name: m.strMeal,
        description: `${m.strArea || "International"} ${
          m.strCategory || "dish"
        } via TheMealDB. Open for ingredients, pregnancy safety review, and original source link.`,
        meal_category: mealCat,
        primary_subcategory: m.strCategory || "TheMealDB",
        subcategories: [m.strCategory || "TheMealDB"],
        image_url: m.strMealThumb || "/images/food/grain-bowl.jpg",
        cuisine: m.strArea || "International",
        difficulty: "Medium",
        prep_time_min: 15,
        cook_time_min: 25,
        total_time_min: 40,
        servings: 4,
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
          source: "TheMealDB (see original site for full nutrition)",
        },
        classifications: ["Balanced Nutrition"],
        pregnancy_safety_status: "needs_review",
        is_featured: false,
        popularity_score: 82,
        created_at: new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

export async function findTheMealDbByIngredients(
  ingredients: string[]
): Promise<FridgeMatchResult[]> {
  if (process.env.THEMEALDB_ENABLED === "false" || ingredients.length === 0) return [];
  const apiKey = process.env.THEMEALDB_API_KEY || "1";
  const mainIng = ingredients[0].trim();
  if (!mainIng) return [];

  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/${encodeURIComponent(
        apiKey
      )}/filter.php?i=${encodeURIComponent(mainIng)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      meals?: Array<{ idMeal: string; strMeal: string; strMealThumb?: string }> | null;
    };

    return (json.meals ?? []).slice(0, 6).map((m) => ({
      id: `themealdb-${m.idMeal}`,
      slug: `themealdb-${m.idMeal}`,
      name: m.strMeal,
      description: `Live match on "${mainIng}" from TheMealDB.`,
      meal_category: "dinner",
      primary_subcategory: "TheMealDB",
      subcategories: ["TheMealDB"],
      image_url: m.strMealThumb || "/images/food/grain-bowl.jpg",
      cuisine: "International",
      difficulty: "Medium",
      prep_time_min: 15,
      cook_time_min: 25,
      total_time_min: 40,
      servings: 4,
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
        source: "TheMealDB",
      },
      classifications: ["Balanced Nutrition"],
      pregnancy_safety_status: "needs_review",
      is_featured: false,
      popularity_score: 82,
      created_at: new Date().toISOString(),
      matched_ingredients: [mainIng],
      missing_ingredients: [],
      matched_count: 1,
      total_ingredients_count: 1,
      match_percentage: Math.round((1 / ingredients.length) * 100),
    }));
  } catch {
    return [];
  }
}

export async function getTheMealDbRecipeDetail(slug: string): Promise<RecipeDetail | null> {
  const idMeal = slug.replace(/^themealdb-/, "");
  const apiKey = process.env.THEMEALDB_API_KEY || "1";

  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/${encodeURIComponent(
        apiKey
      )}/lookup.php?i=${encodeURIComponent(idMeal)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { meals?: TheMealDbRaw[] | null };
    const m = json.meals?.[0];
    if (!m) return null;

    const ingredients = parseTheMealDbIngredients(m);
    const hasExternalSource = Boolean(m.strSource && m.strSource.startsWith("http"));
    const instructions: RecipeStep[] = hasExternalSource
      ? []
      : (m.strInstructions || "")
          .split(/\r?\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, i) => ({ step: i + 1, instruction: line }));

    const safety = evaluatePregnancySafety({
      ingredients: ingredients.map((i) => ({
        ingredientId: i.canonical_name,
        displayName: i.display_name,
        quantity: 1,
        unit: "",
      })),
      instructionsText: m.strInstructions || "",
    });

    const mealCat = mapMealCategory(m.strCategory);
    let sourceHost = "TheMealDB";
    if (hasExternalSource && m.strSource) {
      try {
        sourceHost = new URL(m.strSource).hostname.replace(/^www\./, "");
      } catch {
        sourceHost = "Original Recipe Site";
      }
    }

    return {
      id: `themealdb-${m.idMeal}`,
      slug: `themealdb-${m.idMeal}`,
      name: m.strMeal,
      description: `${m.strArea || "International"} ${
        m.strCategory || "recipe"
      } indexed via TheMealDB.`,
      meal_category: mealCat,
      primary_subcategory: m.strCategory || "TheMealDB",
      subcategories: [m.strCategory || "TheMealDB"],
      image_url: m.strMealThumb || "/images/food/grain-bowl.jpg",
      cuisine: m.strArea || "International",
      difficulty: "Medium",
      prep_time_min: 15,
      cook_time_min: 25,
      total_time_min: 40,
      servings: 4,
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
        source: "Nutrition unavailable directly from TheMealDB; verify on source website",
      },
      classifications: safety.status === "reviewed_safe" ? ["Pregnancy Food-Safety Reviewed"] : ["Balanced Nutrition"],
      pregnancy_safety_status: safety.status,
      is_featured: false,
      popularity_score: 82,
      created_at: new Date().toISOString(),
      ingredients,
      instructions,
      instructions_license_mode: hasExternalSource ? "link_only" : "licensed_display",
      health_assessment: {
        nutritiousHighlights: [
          "Prepared with whole-food culinary ingredients listed above.",
        ],
        potentialDrawbacks: [
          "TheMealDB does not supply standardized per-serving nutrition totals; view the original recipe source linked below for full nutrition facts if provided.",
        ],
        substitutions: [
          "Pair with extra non-starchy vegetables or whole grains to balance carbohydrate intake.",
        ],
      },
      pregnancy_safety_notes: safety.notes,
      cooking_temp_guidance: safety.cookingTempGuidance,
      source_name: sourceHost,
      source_attribution: `Indexed via TheMealDB • Original source: ${sourceHost}`,
      source_url: hasExternalSource ? m.strSource! : "https://www.themealdb.com/",
      license_type: "TheMealDB Public API + Original Source Attribution",
      is_favorited: false,
    };
  } catch {
    return null;
  }
}

export async function resolveAnyExternalRecipeDetail(
  idOrSlug: string
): Promise<RecipeDetail | null> {
  if (idOrSlug.startsWith("spoonacular-")) {
    return getSpoonacularRecipeDetail(idOrSlug);
  }
  if (idOrSlug.startsWith("edamam-")) {
    return getEdamamRecipeDetail(idOrSlug);
  }
  if (idOrSlug.startsWith("fatsecret-")) {
    return getFatSecretRecipeDetail(idOrSlug);
  }
  if (idOrSlug.startsWith("themealdb-")) {
    return getTheMealDbRecipeDetail(idOrSlug);
  }
  return null;
}
