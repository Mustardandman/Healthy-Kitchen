import realRecipesData from "@/data/real-recipes.json";
import { computeGramWeight, USDA_INGREDIENTS } from "@/data/usda-ingredients";
import { closeDb, getDb } from "@/db/schema";
import {
  calculateRecipeNutrition,
  deriveHealthClassifications,
  generateHealthAssessment,
  type RawIngredientInput,
} from "@/lib/nutrition";
import { evaluatePregnancySafety } from "@/lib/pregnancy-safety";
import type { Difficulty, InstructionsLicenseMode, MealCategory, RecipeStep } from "@/types/recipe";

interface RealRecipeRecord {
  id: string;
  name: string;
  description: string;
  mealCategory: MealCategory;
  primarySubcategory: string;
  subcategories: string[];
  imageUrl: string;
  cuisine: string;
  difficulty: Difficulty;
  prepTimeMin: number;
  cookTimeMin: number;
  servings: number;
  ingredients: RawIngredientInput[];
  instructions: RecipeStep[];
  instructionsLicenseMode: InstructionsLicenseMode;
  sourceName: string;
  sourceAttribution: string;
  sourceUrl: string;
  licenseType: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function seedDatabase(reset = true): {
  total: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
} {
  const db = getDb();

  if (reset) {
    db.exec(`
      DELETE FROM meal_plan_entries;
      DELETE FROM favorites;
      DELETE FROM recipe_ingredients;
      DELETE FROM recipe_classifications;
      DELETE FROM recipe_subcategories;
      DELETE FROM recipes_fts;
      DELETE FROM recipes;
      DELETE FROM ingredients_catalog;
    `);
  } else {
    const existing = db.prepare(`SELECT COUNT(*) as c FROM recipes`).get() as { c: number };
    if (existing.c >= 700) {
      const counts = db
        .prepare(`SELECT meal_category, COUNT(*) as count FROM recipes GROUP BY meal_category`)
        .all() as Array<{ meal_category: string; count: number }>;
      const map: Record<string, number> = {};
      for (const row of counts) map[row.meal_category] = row.count;
      return {
        total: existing.c,
        breakfast: map.breakfast ?? 0,
        lunch: map.lunch ?? 0,
        dinner: map.dinner ?? 0,
        snack: map.snack ?? 0,
      };
    }
  }

  const allReal = realRecipesData as RealRecipeRecord[];

  const insertCatalog = db.prepare(`
    INSERT OR REPLACE INTO ingredients_catalog (id, canonical_name, synonyms_json, category, usda_fdc_id)
    VALUES (?, ?, ?, ?, ?)
  `);

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

  const insertSub = db.prepare(`INSERT OR IGNORE INTO recipe_subcategories (recipe_id, subcategory) VALUES (?, ?)`);
  const insertCls = db.prepare(`INSERT OR IGNORE INTO recipe_classifications (recipe_id, classification) VALUES (?, ?)`);
  const insertIng = db.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, display_name, quantity, unit, gram_weight, preparation_note, is_optional, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare(`
    INSERT INTO recipes_fts (recipe_id, name, description, primary_subcategory, cuisine, ingredients_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const baseDate = new Date("2026-11-18T12:00:00Z").getTime();
  const seenSlugs = new Set<string>();
  const featuredByCat: Record<string, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  };

  const runSeedTx = db.transaction(() => {
    for (const ref of Object.values(USDA_INGREDIENTS)) {
      insertCatalog.run(
        ref.id,
        ref.canonicalName,
        JSON.stringify(ref.synonyms),
        ref.category,
        ref.usdaFdcId
      );
    }

    allReal.forEach((bp, index) => {
      const totalTimeMin = bp.prepTimeMin + bp.cookTimeMin;
      const nutrition = calculateRecipeNutrition(bp.ingredients, bp.servings);
      const instructionsText = bp.instructions.map((s) => s.instruction).join(" ");
      const safety = evaluatePregnancySafety({
        ingredients: bp.ingredients,
        instructionsText: `${bp.name} ${instructionsText}`,
      });
      const classifications = deriveHealthClassifications({
        mealCategory: bp.mealCategory,
        ingredients: bp.ingredients,
        nutrition,
        totalTimeMin,
        difficulty: bp.difficulty,
        pregnancyStatus: safety.status,
      });
      const assessment = generateHealthAssessment({
        ingredients: bp.ingredients,
        nutrition,
        mealCategory: bp.mealCategory,
      });

      let slug = slugify(`${bp.name}-${bp.id}`);
      if (seenSlugs.has(slug)) {
        slug = `${slug}-${index}`;
      }
      seenSlugs.add(slug);

      const isAmerican = bp.cuisine === "American";
      const isEnglishFamiliar = ["Canadian", "British", "Australian", "Irish"].includes(bp.cuisine);
      let isFeatured = 0;
      if (isAmerican && safety.status === "reviewed_safe" && (featuredByCat[bp.mealCategory] ?? 0) < 4) {
        isFeatured = 1;
        featuredByCat[bp.mealCategory] = (featuredByCat[bp.mealCategory] ?? 0) + 1;
      }
      const popularity = isAmerican
        ? Math.max(85, 99 - (index % 15))
        : isEnglishFamiliar
          ? Math.max(75, 86 - (index % 12))
          : bp.cuisine === "International"
            ? Math.max(60, 74 - (index % 15))
            : Math.max(45, 64 - (index % 20));
      const createdAt = new Date(baseDate - index * 3600 * 1000).toISOString();

      insertRecipe.run(
        bp.id,
        slug,
        bp.name,
        bp.description,
        bp.mealCategory,
        bp.primarySubcategory,
        bp.imageUrl,
        bp.cuisine,
        bp.difficulty,
        bp.prepTimeMin,
        bp.cookTimeMin,
        totalTimeMin,
        bp.servings,
        JSON.stringify(bp.instructions),
        bp.instructionsLicenseMode,
        JSON.stringify(assessment),
        nutrition.calories,
        nutrition.carbs_g,
        nutrition.protein_g,
        nutrition.fat_g,
        nutrition.fiber_g,
        nutrition.sugar_g,
        nutrition.added_sugar_g,
        nutrition.sodium_mg,
        nutrition.calcium_mg,
        nutrition.iron_mg,
        nutrition.folate_mcg,
        1,
        nutrition.source,
        safety.status,
        safety.notes,
        safety.cookingTempGuidance,
        bp.sourceName,
        bp.sourceAttribution,
        bp.sourceUrl,
        bp.licenseType,
        isFeatured,
        popularity,
        createdAt
      );

      for (const sub of Array.from(new Set([bp.primarySubcategory, ...bp.subcategories]))) {
        insertSub.run(bp.id, sub);
      }

      for (const cls of classifications) {
        insertCls.run(bp.id, cls);
      }

      const ingTextParts: string[] = [];
      bp.ingredients.forEach((ing, orderIdx) => {
        const ref = USDA_INGREDIENTS[ing.ingredientId];
        if (!ref) return;
        const gramWeight = computeGramWeight(ing.ingredientId, ing.quantity, ing.unit);
        const displayName = ing.displayName ?? ref.canonicalName;

        insertIng.run(
          bp.id,
          ing.ingredientId,
          displayName,
          ing.quantity,
          ing.unit,
          gramWeight,
          ing.preparationNote ?? null,
          ing.isOptional ? 1 : 0,
          orderIdx
        );
        ingTextParts.push(displayName, ref.canonicalName, ...ref.synonyms);
      });

      insertFts.run(
        bp.id,
        bp.name,
        bp.description,
        bp.primarySubcategory,
        bp.cuisine,
        ingTextParts.join(" ")
      );
    });
  });

  runSeedTx();

  const counts = db
    .prepare(`SELECT meal_category, COUNT(*) as count FROM recipes GROUP BY meal_category`)
    .all() as Array<{ meal_category: string; count: number }>;

  const map: Record<string, number> = {};
  for (const row of counts) map[row.meal_category] = row.count;

  return {
    total: allReal.length,
    breakfast: map.breakfast ?? 0,
    lunch: map.lunch ?? 0,
    dinner: map.dinner ?? 0,
    snack: map.snack ?? 0,
  };
}

const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isMain) {
  const result = seedDatabase(true);
  console.log("Seeded Nourish SQLite database with REAL published recipes:", result);
  closeDb();
}
