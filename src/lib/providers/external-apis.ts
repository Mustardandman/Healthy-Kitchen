/**
 * Server-side external API adapters with strict licensing, attribution, and caching compliance.
 * Keys are read exclusively from process.env on the server and never exposed to client bundles.
 */

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
 * Falls back gracefully when offline or rate-limited.
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

export interface ExternalLinkRecipeHit {
  externalId: string;
  title: string;
  imageUrl: string;
  sourceName: string;
  sourceUrl: string;
  caloriesPerServing: number;
  carbsPerServing: number;
  proteinPerServing: number;
  fiberPerServing: number;
  provider: "edamam" | "spoonacular";
  attributionRequired: string;
  instructionsLicenseMode: "link_only";
}

// Strict 1-hour TTL cache in memory for Spoonacular per ToS (max 1 hour caching)
const spoonacularCache = new Map<string, { expiresAt: number; data: ExternalLinkRecipeHit[] }>();
const ONE_HOUR_MS = 60 * 60 * 1000;

export async function searchEdamamRecipes(query: string): Promise<ExternalLinkRecipeHit[]> {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) return [];

  const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(
    query
  )}&app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
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
          calories: number;
          totalNutrients?: {
            CHOCDF?: { quantity: number };
            PROCNT?: { quantity: number };
            FIBTG?: { quantity: number };
          };
        };
      }>;
    };

    return (json.hits ?? []).slice(0, 8).map((hit) => {
      const r = hit.recipe;
      const servings = Math.max(1, r.yield || 1);
      return {
        externalId: r.uri,
        title: r.label,
        imageUrl: r.image,
        sourceName: r.source,
        sourceUrl: r.url,
        caloriesPerServing: Math.round(r.calories / servings),
        carbsPerServing: Math.round(((r.totalNutrients?.CHOCDF?.quantity ?? 0) / servings) * 10) / 10,
        proteinPerServing: Math.round(((r.totalNutrients?.PROCNT?.quantity ?? 0) / servings) * 10) / 10,
        fiberPerServing: Math.round(((r.totalNutrients?.FIBTG?.quantity ?? 0) / servings) * 10) / 10,
        provider: "edamam",
        attributionRequired: "Powered by Edamam — View original instructions on source website",
        instructionsLicenseMode: "link_only",
      };
    });
  } catch {
    return [];
  }
}

export async function searchSpoonacularRecipes(query: string): Promise<ExternalLinkRecipeHit[]> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return [];

  const cacheKey = query.trim().toLowerCase();
  const cached = spoonacularCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${encodeURIComponent(
    apiKey
  )}&query=${encodeURIComponent(query)}&addRecipeNutrition=true&number=8`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: Array<{
        id: number;
        title: string;
        image: string;
        sourceName?: string;
        sourceUrl?: string;
        spoonacularSourceUrl?: string;
        nutrition?: {
          nutrients?: Array<{ name: string; amount: number }>;
        };
      }>;
    };

    const hits: ExternalLinkRecipeHit[] = (json.results ?? []).map((r) => {
      const findNutrient = (name: string) =>
        r.nutrition?.nutrients?.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount ?? 0;

      return {
        externalId: String(r.id),
        title: r.title,
        imageUrl: r.image,
        sourceName: r.sourceName || "Spoonacular",
        sourceUrl: r.sourceUrl || r.spoonacularSourceUrl || `https://spoonacular.com/recipes/${r.id}`,
        caloriesPerServing: Math.round(findNutrient("Calories")),
        carbsPerServing: Math.round(findNutrient("Carbohydrates") * 10) / 10,
        proteinPerServing: Math.round(findNutrient("Protein") * 10) / 10,
        fiberPerServing: Math.round(findNutrient("Fiber") * 10) / 10,
        provider: "spoonacular",
        attributionRequired: "Recipe data via Spoonacular API (temporary 1-hour cache)",
        instructionsLicenseMode: "link_only",
      };
    });

    spoonacularCache.set(cacheKey, {
      expiresAt: Date.now() + ONE_HOUR_MS,
      data: hits,
    });

    return hits;
  } catch {
    return [];
  }
}

