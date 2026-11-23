import { getDb } from "@/db/schema";
import type {
  DayOfWeek,
  FridgeMatchMode,
  FridgeMatchResult,
  HealthAssessment,
  HealthClassification,
  MealCategory,
  MealPlanEntry,
  PregnancySafetyStatus,
  RecipeCardItem,
  RecipeDetail,
  RecipeFilterParams,
  RecipeIngredientItem,
  RecipeStep,
  ShoppingListItem,
} from "@/types/recipe";

interface RecipeRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  meal_category: MealCategory;
  primary_subcategory: string;
  image_url: string;
  cuisine: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  prep_time_min: number;
  cook_time_min: number;
  total_time_min: number;
  servings: number;
  instructions_json: string;
  instructions_license_mode: "original_editorial" | "licensed_display" | "link_only";
  health_assessment_json: string;
  nutrition_calories: number;
  nutrition_carbs_g: number;
  nutrition_protein_g: number;
  nutrition_fat_g: number;
  nutrition_fiber_g: number;
  nutrition_sugar_g: number;
  nutrition_added_sugar_g: number | null;
  nutrition_sodium_mg: number;
  nutrition_calcium_mg: number;
  nutrition_iron_mg: number;
  nutrition_folate_mcg: number;
  nutrition_is_estimated: number;
  nutrition_source: string;
  pregnancy_safety_status: PregnancySafetyStatus;
  pregnancy_safety_notes: string;
  cooking_temp_guidance: string | null;
  source_name: string;
  source_attribution: string;
  source_url: string | null;
  license_type: string;
  is_featured: number;
  popularity_score: number;
  created_at: string;
}

function hydrateCardItems(rows: RecipeRow[]): RecipeCardItem[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  const subRows = db
    .prepare(`SELECT recipe_id, subcategory FROM recipe_subcategories WHERE recipe_id IN (${placeholders})`)
    .all(...ids) as Array<{ recipe_id: string; subcategory: string }>;

  const clsRows = db
    .prepare(`SELECT recipe_id, classification FROM recipe_classifications WHERE recipe_id IN (${placeholders})`)
    .all(...ids) as Array<{ recipe_id: string; classification: HealthClassification }>;

  const subMap = new Map<string, string[]>();
  for (const s of subRows) {
    const arr = subMap.get(s.recipe_id) ?? [];
    arr.push(s.subcategory);
    subMap.set(s.recipe_id, arr);
  }

  const clsMap = new Map<string, HealthClassification[]>();
  for (const c of clsRows) {
    const arr = clsMap.get(c.recipe_id) ?? [];
    arr.push(c.classification);
    clsMap.set(c.recipe_id, arr);
  }

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    meal_category: row.meal_category,
    primary_subcategory: row.primary_subcategory,
    subcategories: subMap.get(row.id) ?? [row.primary_subcategory],
    image_url: row.image_url,
    cuisine: row.cuisine,
    difficulty: row.difficulty,
    prep_time_min: row.prep_time_min,
    cook_time_min: row.cook_time_min,
    total_time_min: row.total_time_min,
    servings: row.servings,
    nutrition: {
      calories: row.nutrition_calories,
      carbs_g: row.nutrition_carbs_g,
      protein_g: row.nutrition_protein_g,
      fat_g: row.nutrition_fat_g,
      fiber_g: row.nutrition_fiber_g,
      sugar_g: row.nutrition_sugar_g,
      added_sugar_g: row.nutrition_added_sugar_g,
      sodium_mg: row.nutrition_sodium_mg,
      calcium_mg: row.nutrition_calcium_mg,
      iron_mg: row.nutrition_iron_mg,
      folate_mcg: row.nutrition_folate_mcg,
      is_estimated: row.nutrition_is_estimated === 1,
      source: row.nutrition_source,
    },
    classifications: clsMap.get(row.id) ?? [],
    pregnancy_safety_status: row.pregnancy_safety_status,
    is_featured: row.is_featured === 1,
    popularity_score: row.popularity_score,
    created_at: row.created_at,
  }));
}

export function getDatabaseStats(): {
  total: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
} {
  const db = getDb();
  const rows = db
    .prepare(`SELECT meal_category, COUNT(*) as count FROM recipes GROUP BY meal_category`)
    .all() as Array<{ meal_category: MealCategory; count: number }>;

  const stats = { total: 0, breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  for (const r of rows) {
    stats[r.meal_category] = r.count;
    stats.total += r.count;
  }
  return stats;
}

export function getSubcategoryCounts(category: MealCategory): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT rs.subcategory, COUNT(DISTINCT rs.recipe_id) as count
       FROM recipe_subcategories rs
       JOIN recipes r ON r.id = rs.recipe_id
       WHERE r.meal_category = ?
       GROUP BY rs.subcategory`
    )
    .all(category) as Array<{ subcategory: string; count: number }>;

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.subcategory] = r.count;
  }
  return result;
}

function americanPrioritySql(alias = ""): string {
  const col = alias ? `${alias}.cuisine` : "cuisine";
  return `CASE
    WHEN ${col} = 'American' THEN 0
    WHEN ${col} IN ('Canadian', 'British', 'Australian', 'Irish') THEN 1
    WHEN ${col} = 'International' THEN 2
    ELSE 3
  END ASC`;
}

function getCuisineRank(cuisine: string): number {
  const low = cuisine.trim().toLowerCase();
  if (low === "american" || low === "united states") return 0;
  if (["canadian", "british", "australian", "irish"].includes(low)) return 1;
  if (low === "international") return 2;
  return 3;
}

export function getAvailableCuisines(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT cuisine FROM recipes
       ORDER BY CASE WHEN cuisine = 'American' THEN 0 WHEN cuisine = 'International' THEN 2 ELSE 1 END ASC, cuisine ASC`
    )
    .all() as Array<{ cuisine: string }>;
  return rows.map((r) => r.cuisine);
}

export function searchRecipes(params: RecipeFilterParams): {
  items: RecipeCardItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const db = getDb();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 24));
  const offset = (page - 1) * pageSize;

  const whereClauses: string[] = [];
  const sqlParams: Array<string | number> = [];

  if (params.q && params.q.trim()) {
    const cleanTokens = params.q
      .trim()
      .replace(/['"*()]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `${t}*`)
      .join(" ");
    if (cleanTokens) {
      whereClauses.push(
        `r.id IN (SELECT recipe_id FROM recipes_fts WHERE recipes_fts MATCH ?)`
      );
      sqlParams.push(cleanTokens);
    }
  }

  if (params.category) {
    whereClauses.push(`r.meal_category = ?`);
    sqlParams.push(params.category);
  }

  if (params.subcategory) {
    whereClauses.push(
      `EXISTS (SELECT 1 FROM recipe_subcategories rs WHERE rs.recipe_id = r.id AND rs.subcategory = ?)`
    );
    sqlParams.push(params.subcategory);
  }

  if (params.maxTime && params.maxTime > 0) {
    whereClauses.push(`r.total_time_min <= ?`);
    sqlParams.push(params.maxTime);
  }

  if (params.minProtein && params.minProtein > 0) {
    whereClauses.push(`r.nutrition_protein_g >= ?`);
    sqlParams.push(params.minProtein);
  }

  if (params.maxCarbs && params.maxCarbs > 0) {
    whereClauses.push(`r.nutrition_carbs_g <= ?`);
    sqlParams.push(params.maxCarbs);
  }

  if (params.minFiber && params.minFiber > 0) {
    whereClauses.push(`r.nutrition_fiber_g >= ?`);
    sqlParams.push(params.minFiber);
  }

  if (params.maxCalories && params.maxCalories > 0) {
    whereClauses.push(`r.nutrition_calories <= ?`);
    sqlParams.push(params.maxCalories);
  }

  if (params.safetyStatus) {
    whereClauses.push(`r.pregnancy_safety_status = ?`);
    sqlParams.push(params.safetyStatus);
  }

  if (params.difficulty) {
    whereClauses.push(`r.difficulty = ?`);
    sqlParams.push(params.difficulty);
  }

  if (params.cuisine) {
    whereClauses.push(`r.cuisine = ?`);
    sqlParams.push(params.cuisine);
  }

  if (params.classification) {
    whereClauses.push(
      `EXISTS (SELECT 1 FROM recipe_classifications rc WHERE rc.recipe_id = r.id AND rc.classification = ?)`
    );
    sqlParams.push(params.classification);
  }

  if (params.dietary && params.dietary.length > 0) {
    for (const diet of params.dietary) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM recipe_classifications rc WHERE rc.recipe_id = r.id AND rc.classification = ?)`
      );
      sqlParams.push(diet);
    }
  }

  if (params.ingredients && params.ingredients.length > 0) {
    for (const ing of params.ingredients) {
      const term = `%${ing.trim().toLowerCase()}%`;
      whereClauses.push(
        `EXISTS (
          SELECT 1 FROM recipe_ingredients ri
          JOIN ingredients_catalog ic ON ic.id = ri.ingredient_id
          WHERE ri.recipe_id = r.id
            AND (LOWER(ri.display_name) LIKE ? OR LOWER(ic.canonical_name) LIKE ? OR LOWER(ic.synonyms_json) LIKE ?)
        )`
      );
      sqlParams.push(term, term, term);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const americanOrder = americanPrioritySql("r");
  const titleMatchExpr = params.q?.trim()
    ? `CASE WHEN LOWER(r.name) LIKE ? THEN 0 ELSE 1 END ASC`
    : null;
  const titleOrderPrefix = titleMatchExpr ? `${titleMatchExpr}, ` : "";

  let orderBy = `${americanOrder}, ${titleOrderPrefix}r.is_featured DESC, r.popularity_score DESC, r.name ASC`;
  switch (params.sort) {
    case "protein_desc":
      orderBy = `r.nutrition_protein_g DESC, ${americanOrder}, r.popularity_score DESC`;
      break;
    case "fiber_desc":
      orderBy = `r.nutrition_fiber_g DESC, ${americanOrder}, r.popularity_score DESC`;
      break;
    case "added_sugar_asc":
      orderBy = `COALESCE(r.nutrition_added_sugar_g, 0) ASC, r.nutrition_sugar_g ASC, ${americanOrder}`;
      break;
    case "time_asc":
      orderBy = `r.total_time_min ASC, ${americanOrder}, r.popularity_score DESC`;
      break;
    case "recent":
      orderBy = `${americanOrder}, r.created_at DESC, r.id DESC`;
      break;
    case "relevant":
    default:
      orderBy = `${americanOrder}, ${titleOrderPrefix}r.is_featured DESC, r.popularity_score DESC, r.id ASC`;
      break;
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM recipes r ${whereSql}`)
    .get(...sqlParams) as { total: number };

  const orderParams = titleMatchExpr && (!params.sort || params.sort === "relevant")
    ? [`%${params.q!.trim().toLowerCase()}%`]
    : [];

  const rows = db
    .prepare(`SELECT r.* FROM recipes r ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...sqlParams, ...orderParams, pageSize, offset) as RecipeRow[];

  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: hydrateCardItems(rows),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function getHomepageSections(): {
  featured: RecipeCardItem[];
  popularBreakfast: RecipeCardItem[];
  quickLunches: RecipeCardItem[];
  healthyDinners: RecipeCardItem[];
  pregnancyFriendly: RecipeCardItem[];
  highProtein: RecipeCardItem[];
  readyIn30: RecipeCardItem[];
  recentlyAdded: RecipeCardItem[];
} {
  const db = getDb();

  const queryRows = (sql: string) => db.prepare(sql).all() as RecipeRow[];
  const amOrder = americanPrioritySql();

  return {
    featured: hydrateCardItems(
      queryRows(`SELECT * FROM recipes ORDER BY ${amOrder}, is_featured DESC, popularity_score DESC LIMIT 8`)
    ),
    popularBreakfast: hydrateCardItems(
      queryRows(`SELECT * FROM recipes WHERE meal_category = 'breakfast' ORDER BY ${amOrder}, is_featured DESC, popularity_score DESC LIMIT 8`)
    ),
    quickLunches: hydrateCardItems(
      queryRows(`SELECT * FROM recipes WHERE meal_category = 'lunch' AND total_time_min <= 20 ORDER BY ${amOrder}, popularity_score DESC LIMIT 8`)
    ),
    healthyDinners: hydrateCardItems(
      queryRows(`SELECT * FROM recipes WHERE meal_category = 'dinner' ORDER BY ${amOrder}, is_featured DESC, popularity_score DESC LIMIT 8`)
    ),
    pregnancyFriendly: hydrateCardItems(
      queryRows(`SELECT * FROM recipes WHERE pregnancy_safety_status = 'reviewed_safe' ORDER BY ${amOrder}, nutrition_folate_mcg DESC, popularity_score DESC LIMIT 8`)
    ),
    highProtein: hydrateCardItems(
      queryRows(`SELECT * FROM recipes WHERE nutrition_protein_g >= 24 ORDER BY ${amOrder}, nutrition_protein_g DESC, popularity_score DESC LIMIT 8`)
    ),
    readyIn30: hydrateCardItems(
      queryRows(`SELECT * FROM recipes WHERE total_time_min <= 30 AND meal_category IN ('lunch', 'dinner') ORDER BY ${amOrder}, popularity_score DESC LIMIT 8`)
    ),
    recentlyAdded: hydrateCardItems(
      queryRows(`SELECT * FROM recipes ORDER BY ${amOrder}, created_at DESC, id DESC LIMIT 8`)
    ),
  };
}

export function getRecipeByIdOrSlug(idOrSlug: string): RecipeDetail | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM recipes WHERE id = ? OR slug = ? LIMIT 1`)
    .get(idOrSlug, idOrSlug) as RecipeRow | undefined;

  if (!row) return null;

  const [card] = hydrateCardItems([row]);

  const ingredients = db
    .prepare(
      `SELECT ri.id, ri.ingredient_id, ic.canonical_name, ri.display_name, ri.quantity, ri.unit,
              ri.gram_weight, ri.preparation_note, ri.is_optional, ic.category
       FROM recipe_ingredients ri
       JOIN ingredients_catalog ic ON ic.id = ri.ingredient_id
       WHERE ri.recipe_id = ?
       ORDER BY ri.sort_order ASC, ri.id ASC`
    )
    .all(row.id) as Array<{
    id: number;
    ingredient_id: string;
    canonical_name: string;
    display_name: string;
    quantity: number;
    unit: string;
    gram_weight: number;
    preparation_note: string | null;
    is_optional: number;
    category: string;
  }>;

  const favRow = db
    .prepare(`SELECT 1 as found FROM favorites WHERE recipe_id = ?`)
    .get(row.id) as { found: number } | undefined;

  const parsedIngredients: RecipeIngredientItem[] = ingredients.map((ing) => ({
    id: ing.id,
    ingredient_id: ing.ingredient_id,
    canonical_name: ing.canonical_name,
    display_name: ing.display_name,
    quantity: ing.quantity,
    unit: ing.unit,
    gram_weight: ing.gram_weight,
    preparation_note: ing.preparation_note,
    is_optional: ing.is_optional === 1,
    category: ing.category,
  }));

  return {
    ...card,
    ingredients: parsedIngredients,
    instructions: JSON.parse(row.instructions_json) as RecipeStep[],
    instructions_license_mode: row.instructions_license_mode,
    health_assessment: JSON.parse(row.health_assessment_json) as HealthAssessment,
    pregnancy_safety_notes: row.pregnancy_safety_notes,
    cooking_temp_guidance: row.cooking_temp_guidance,
    source_name: row.source_name,
    source_attribution: row.source_attribution,
    source_url: row.source_url,
    license_type: row.license_type,
    is_favorited: Boolean(favRow?.found),
  };
}

export function getIngredientSuggestions(prefix?: string): Array<{
  id: string;
  canonical_name: string;
  synonyms: string[];
  category: string;
}> {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, canonical_name, synonyms_json, category FROM ingredients_catalog ORDER BY canonical_name ASC`)
    .all() as Array<{ id: string; canonical_name: string; synonyms_json: string; category: string }>;

  const q = prefix?.trim().toLowerCase() ?? "";

  const mapped = rows.map((r) => ({
    id: r.id,
    canonical_name: r.canonical_name,
    synonyms: JSON.parse(r.synonyms_json) as string[],
    category: r.category,
  }));

  if (!q) return mapped;

  return mapped.filter(
    (item) =>
      item.canonical_name.toLowerCase().includes(q) ||
      item.synonyms.some((s) => s.toLowerCase().includes(q))
  );
}

/**
 * Matches user-entered ingredients (case-insensitive + synonym-aware) against the entire recipe database.
 */
export function matchRecipesByFridgeIngredients(params: {
  ingredients: string[];
  mode: FridgeMatchMode;
  requireAll: boolean;
  category?: MealCategory | "";
  limit?: number;
}): {
  resolvedTerms: Array<{ query: string; matchedIds: string[]; label: string }>;
  results: FridgeMatchResult[];
} {
  const db = getDb();
  const rawTerms = params.ingredients
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (rawTerms.length === 0) {
    return { resolvedTerms: [], results: [] };
  }

  const catalog = db
    .prepare(`SELECT id, canonical_name, synonyms_json FROM ingredients_catalog`)
    .all() as Array<{ id: string; canonical_name: string; synonyms_json: string }>;

  const parsedCatalog = catalog.map((c) => ({
    id: c.id,
    canonicalName: c.canonical_name.toLowerCase(),
    synonyms: (JSON.parse(c.synonyms_json) as string[]).map((s) => s.toLowerCase()),
  }));

  const resolvedTerms: Array<{ query: string; matchedIds: string[]; label: string }> = [];

  for (const term of rawTerms) {
    const exactIds = new Set<string>();
    const partialIds = new Set<string>();

    for (const item of parsedCatalog) {
      if (item.canonicalName === term || item.synonyms.includes(term)) {
        exactIds.add(item.id);
      } else if (
        item.canonicalName.includes(term) ||
        term.includes(item.canonicalName) ||
        item.synonyms.some((syn) => syn.includes(term) || term.includes(syn))
      ) {
        partialIds.add(item.id);
      }
    }

    const matchedIds = exactIds.size > 0 ? Array.from(exactIds) : Array.from(partialIds);
    resolvedTerms.push({
      query: term,
      matchedIds,
      label: term,
    });
  }

  // Pull all recipe-ingredient mappings cleanly in one indexed query
  const categoryFilter = params.category ? `WHERE r.meal_category = ?` : "";
  const categoryArgs = params.category ? [params.category] : [];

  const allRecipeIngs = db
    .prepare(
      `SELECT ri.recipe_id, ri.ingredient_id, ri.display_name, ic.canonical_name, r.cuisine
       FROM recipe_ingredients ri
       JOIN recipes r ON r.id = ri.recipe_id
       JOIN ingredients_catalog ic ON ic.id = ri.ingredient_id
       ${categoryFilter}`
    )
    .all(...categoryArgs) as Array<{
    recipe_id: string;
    ingredient_id: string;
    display_name: string;
    canonical_name: string;
    cuisine: string;
  }>;

  const recipeMap = new Map<
    string,
    Array<{ ingredientId: string; displayName: string; canonicalName: string }>
  >();
  const cuisineMap = new Map<string, string>();

  for (const row of allRecipeIngs) {
    cuisineMap.set(row.recipe_id, row.cuisine);
    const list = recipeMap.get(row.recipe_id) ?? [];
    list.push({
      ingredientId: row.ingredient_id,
      displayName: row.display_name,
      canonicalName: row.canonical_name,
    });
    recipeMap.set(row.recipe_id, list);
  }

  interface CandidateScore {
    recipeId: string;
    matchedTerms: string[];
    missingIngredients: string[];
    matchedCount: number;
    totalIngredientsCount: number;
    matchPercentage: number;
    allSelectedMatched: boolean;
    cuisineRank: number;
  }

  const candidates: CandidateScore[] = [];

  for (const [recipeId, recipeIngs] of recipeMap.entries()) {
    const recipeIngIds = new Set(recipeIngs.map((i) => i.ingredientId));
    const matchedTerms: string[] = [];
    const matchedIngIds = new Set<string>();

    for (const term of resolvedTerms) {
      const hitId = term.matchedIds.find((id) => recipeIngIds.has(id));
      if (hitId) {
        matchedTerms.push(term.label);
        matchedIngIds.add(hitId);
      } else {
        // Fallback substring check on recipe display_name
        const fallbackHit = recipeIngs.find((ri) =>
          ri.displayName.toLowerCase().includes(term.query)
        );
        if (fallbackHit) {
          matchedTerms.push(term.label);
          matchedIngIds.add(fallbackHit.ingredientId);
        }
      }
    }

    if (matchedTerms.length === 0) continue;

    const allSelectedMatched = matchedTerms.length === resolvedTerms.length;
    if (params.requireAll && !allSelectedMatched) continue;

    const missingIngredients = recipeIngs
      .filter((ri) => !matchedIngIds.has(ri.ingredientId))
      .map((ri) => ri.canonicalName);

    // Avoid counting pantry staples like cinnamon/salt against "Almost There" unless small set
    const missingCount = missingIngredients.length;
    if (params.mode === "almost_there" && (missingCount < 1 || missingCount > 2)) {
      continue;
    }

    if (params.mode === "use_what_i_have" && !allSelectedMatched && params.requireAll) {
      continue;
    }

    const totalCount = Math.max(1, recipeIngs.length);
    // Match % reflects both coverage of user's selected ingredients and recipe completion
    const selectedCoverage = matchedTerms.length / resolvedTerms.length;
    const recipeCoverage = matchedIngIds.size / totalCount;
    const matchPercentage = Math.round((selectedCoverage * 0.65 + recipeCoverage * 0.35) * 100);

    candidates.push({
      recipeId,
      matchedTerms,
      missingIngredients,
      matchedCount: matchedTerms.length,
      totalIngredientsCount: totalCount,
      matchPercentage,
      allSelectedMatched,
      cuisineRank: getCuisineRank(cuisineMap.get(recipeId) ?? "International"),
    });
  }

  candidates.sort((a, b) => {
    if (params.mode === "use_what_i_have") {
      if (a.allSelectedMatched !== b.allSelectedMatched) {
        return a.allSelectedMatched ? -1 : 1;
      }
    }
    if (params.mode === "best_match" && a.matchedCount !== b.matchedCount) {
      return b.matchedCount - a.matchedCount;
    }
    if (params.mode === "almost_there" && a.missingIngredients.length !== b.missingIngredients.length) {
      return a.missingIngredients.length - b.missingIngredients.length;
    }
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    if (a.cuisineRank !== b.cuisineRank) {
      return a.cuisineRank - b.cuisineRank;
    }
    return b.matchedCount - a.matchedCount;
  });

  const limit = params.limit ?? 36;
  const topCandidates = candidates.slice(0, limit);
  if (topCandidates.length === 0) {
    return { resolvedTerms, results: [] };
  }

  const ids = topCandidates.map((c) => c.recipeId);
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM recipes WHERE id IN (${placeholders})`)
    .all(...ids) as RecipeRow[];

  const cardById = new Map(hydrateCardItems(rows).map((card) => [card.id, card]));

  const results: FridgeMatchResult[] = [];
  for (const c of topCandidates) {
    const card = cardById.get(c.recipeId);
    if (!card) continue;
    results.push({
      ...card,
      matched_ingredients: c.matchedTerms,
      missing_ingredients: c.missingIngredients,
      matched_count: c.matchedCount,
      total_ingredients_count: c.totalIngredientsCount,
      match_percentage: c.matchPercentage,
    });
  }

  return { resolvedTerms, results };
}

export function getFavorites(): RecipeCardItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.* FROM recipes r
       JOIN favorites f ON f.recipe_id = r.id
       ORDER BY f.saved_at DESC`
    )
    .all() as RecipeRow[];
  return hydrateCardItems(rows);
}

export function getFavoriteIds(): string[] {
  const db = getDb();
  const rows = db.prepare(`SELECT recipe_id FROM favorites`).all() as Array<{ recipe_id: string }>;
  return rows.map((r) => r.recipe_id);
}

export function toggleFavorite(recipeId: string): { isFavorited: boolean } {
  const db = getDb();
  const existing = db
    .prepare(`SELECT recipe_id FROM favorites WHERE recipe_id = ?`)
    .get(recipeId) as { recipe_id: string } | undefined;

  if (existing) {
    db.prepare(`DELETE FROM favorites WHERE recipe_id = ?`).run(recipeId);
    return { isFavorited: false };
  }

  db.prepare(`INSERT INTO favorites (recipe_id, saved_at) VALUES (?, ?)`).run(
    recipeId,
    new Date().toISOString()
  );
  return { isFavorited: true };
}

export function upsertExternalRecipeRecord(recipe: RecipeDetail): void {
  const db = getDb();
  const exists = db.prepare(`SELECT id FROM recipes WHERE id = ?`).get(recipe.id);
  if (exists) return;

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (
      id, slug, name, description, meal_category, primary_subcategory, image_url, cuisine, difficulty,
      prep_time_min, cook_time_min, total_time_min, servings, instructions_json, instructions_license_mode,
      health_assessment_json, nutrition_calories, nutrition_carbs_g, nutrition_protein_g, nutrition_fat_g,
      nutrition_fiber_g, nutrition_sugar_g, nutrition_added_sugar_g, nutrition_sodium_mg,
      nutrition_calcium_mg, nutrition_iron_mg, nutrition_folate_mcg, nutrition_is_estimated, nutrition_source,
      pregnancy_safety_status, pregnancy_safety_notes, cooking_temp_guidance,
      source_name, source_attribution, source_url, license_type, is_featured, popularity_score, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertIngCatalog = db.prepare(`
    INSERT OR IGNORE INTO ingredients_catalog (id, canonical_name, synonyms_json, category, usda_fdc_id)
    VALUES (?, ?, '[]', 'pantry', NULL)
  `);

  const insertRecipeIng = db.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, display_name, quantity, unit, gram_weight, preparation_note, is_optional, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)
  `);

  const tx = db.transaction(() => {
    insertRecipe.run(
      recipe.id,
      recipe.slug,
      recipe.name,
      recipe.description,
      recipe.meal_category,
      recipe.primary_subcategory,
      recipe.image_url,
      recipe.cuisine,
      recipe.difficulty,
      recipe.prep_time_min,
      recipe.cook_time_min,
      recipe.total_time_min,
      recipe.servings,
      JSON.stringify(recipe.instructions),
      recipe.instructions_license_mode,
      JSON.stringify(recipe.health_assessment),
      recipe.nutrition.calories,
      recipe.nutrition.carbs_g,
      recipe.nutrition.protein_g,
      recipe.nutrition.fat_g,
      recipe.nutrition.fiber_g,
      recipe.nutrition.sugar_g,
      recipe.nutrition.added_sugar_g,
      recipe.nutrition.sodium_mg,
      recipe.nutrition.calcium_mg,
      recipe.nutrition.iron_mg,
      recipe.nutrition.folate_mcg,
      recipe.nutrition.is_estimated ? 1 : 0,
      recipe.nutrition.source,
      recipe.pregnancy_safety_status,
      recipe.pregnancy_safety_notes,
      recipe.cooking_temp_guidance,
      recipe.source_name,
      recipe.source_attribution,
      recipe.source_url,
      recipe.license_type,
      0,
      recipe.popularity_score,
      recipe.created_at
    );

    recipe.ingredients.forEach((ing, idx) => {
      const catId = `ext-${ing.canonical_name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48)}`;
      insertIngCatalog.run(catId, ing.canonical_name.slice(0, 120));
      insertRecipeIng.run(
        recipe.id,
        catId,
        ing.display_name,
        ing.quantity || 1,
        ing.unit || "",
        ing.gram_weight || 50,
        idx
      );
    });
  });

  tx();
}

export function getMealPlanEntries(): MealPlanEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.id as mp_id, m.day_of_week, m.meal_slot, m.recipe_id, m.servings_multiplier, m.added_at, r.*
       FROM meal_plan_entries m
       JOIN recipes r ON r.id = m.recipe_id
       ORDER BY m.added_at ASC`
    )
    .all() as Array<
    RecipeRow & {
      mp_id: number;
      day_of_week: DayOfWeek;
      meal_slot: MealCategory;
      recipe_id: string;
      servings_multiplier: number;
      added_at: string;
    }
  >;

  const cards = hydrateCardItems(rows);
  return rows.map((r, idx) => ({
    id: r.mp_id,
    day_of_week: r.day_of_week,
    meal_slot: r.meal_slot,
    recipe_id: r.recipe_id,
    servings_multiplier: r.servings_multiplier,
    added_at: r.added_at,
    recipe: cards[idx],
  }));
}

export function addMealPlanEntry(params: {
  dayOfWeek: DayOfWeek;
  mealSlot: MealCategory;
  recipeId: string;
  servingsMultiplier?: number;
}): { id: number } {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO meal_plan_entries (day_of_week, meal_slot, recipe_id, servings_multiplier, added_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      params.dayOfWeek,
      params.mealSlot,
      params.recipeId,
      params.servingsMultiplier ?? 1.0,
      new Date().toISOString()
    );
  return { id: Number(info.lastInsertRowid) };
}

export function removeMealPlanEntry(entryId: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM meal_plan_entries WHERE id = ?`).run(entryId);
}

export function clearMealPlan(): void {
  const db = getDb();
  db.prepare(`DELETE FROM meal_plan_entries`).run();
}

export function getConsolidatedShoppingList(): ShoppingListItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.servings_multiplier, r.name as recipe_name, ri.ingredient_id, ri.quantity, ri.unit,
              ic.canonical_name, ic.category
       FROM meal_plan_entries m
       JOIN recipes r ON r.id = m.recipe_id
       JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       JOIN ingredients_catalog ic ON ic.id = ri.ingredient_id`
    )
    .all() as Array<{
    servings_multiplier: number;
    recipe_name: string;
    ingredient_id: string;
    quantity: number;
    unit: string;
    canonical_name: string;
    category: string;
  }>;

  const checksRows = db
    .prepare(`SELECT item_key, checked FROM shopping_list_checks`)
    .all() as Array<{ item_key: string; checked: number }>;

  const checkMap = new Map(checksRows.map((c) => [c.item_key, c.checked === 1]));

  const aggregated = new Map<
    string,
    {
      item_key: string;
      ingredient_id: string;
      display_name: string;
      category: string;
      quantity: number;
      unit: string;
      recipes: Set<string>;
    }
  >();

  for (const row of rows) {
    const normalizedUnit = row.unit.toLowerCase().trim();
    const key = `${row.ingredient_id}::${normalizedUnit}`;
    const existing = aggregated.get(key);
    const scaledQty = row.quantity * (row.servings_multiplier || 1);

    if (existing) {
      existing.quantity += scaledQty;
      existing.recipes.add(row.recipe_name);
    } else {
      aggregated.set(key, {
        item_key: key,
        ingredient_id: row.ingredient_id,
        display_name: row.canonical_name,
        category: row.category,
        quantity: scaledQty,
        unit: row.unit,
        recipes: new Set([row.recipe_name]),
      });
    }
  }

  return Array.from(aggregated.values())
    .map((item) => ({
      item_key: item.item_key,
      ingredient_id: item.ingredient_id,
      display_name: item.display_name,
      category: item.category,
      quantity: Math.round(item.quantity * 100) / 100,
      unit: item.unit,
      recipes: Array.from(item.recipes),
      checked: checkMap.get(item.item_key) ?? false,
    }))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.display_name.localeCompare(b.display_name);
    });
}

export function setShoppingListCheck(itemKey: string, checked: boolean): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO shopping_list_checks (item_key, checked, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(item_key) DO UPDATE SET checked = excluded.checked, updated_at = excluded.updated_at`
  ).run(itemKey, checked ? 1 : 0, new Date().toISOString());
}

