import { USDA_INGREDIENTS } from "@/data/usda-ingredients";
import recipeImageMap from "@/data/recipe-image-map.json";
import { buildBreakfastRecipes, buildSnackRecipes, type RecipeSeedBlueprint } from "@/data/recipe-corpus-breakfast-snack";
import { buildDinnerRecipes, buildLunchRecipes } from "@/data/recipe-corpus-lunch-dinner";
import { getDb, closeDb } from "@/db/schema";
import {
  calculateRecipeNutrition,
  deriveHealthClassifications,
  generateHealthAssessment,
} from "@/lib/nutrition";
import { evaluatePregnancySafety } from "@/lib/pregnancy-safety";

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

  const allBlueprints: RecipeSeedBlueprint[] = [
    ...buildBreakfastRecipes(),
    ...buildLunchRecipes(),
    ...buildDinnerRecipes(),
    ...buildSnackRecipes(),
  ];

  // Add 2 explicit pregnancy caution / review educational recipes so food-safety filtering & flags are thoroughly demonstrable
  allBlueprints.push(
    {
      id: "ln-caution-caesar",
      slug: "classic-chicken-caesar-salad-egg-safety-review",
      name: "Classic Chicken Caesar Salad (Pasteurized Dressing Note)",
      description:
        "Crisp romaine and grilled chicken breast tossed in a traditional Caesar-style dressing—flagged to verify pasteurized eggs are used instead of raw egg yolks.",
      mealCategory: "lunch",
      primarySubcategory: "Salads",
      subcategories: ["Salads", "Chicken"],
      imageUrl: "/images/food/chicken-salad-bowl.jpg",
      cuisine: "Italian",
      difficulty: "Easy",
      prepTimeMin: 12,
      cookTimeMin: 12,
      servings: 2,
      ingredients: [
        { ingredientId: "chicken_breast", displayName: "grilled chicken breast", quantity: 10, unit: "oz" },
        { ingredientId: "romaine_lettuce", displayName: "chopped romaine lettuce", quantity: 4, unit: "cup" },
        { ingredientId: "parmesan_pasteurized", displayName: "pasteurized grated Parmesan", quantity: 0.25, unit: "cup" },
        { ingredientId: "olive_oil", displayName: "extra-virgin olive oil", quantity: 1.5, unit: "tbsp" },
        { ingredientId: "lemon_juice", displayName: "fresh lemon juice", quantity: 1.5, unit: "tbsp" },
        { ingredientId: "whole_wheat_bread", displayName: "whole-grain croutons", quantity: 2, unit: "slice" },
      ],
      instructions: [
        {
          step: 1,
          instruction: "Grill chicken breast thoroughly to 165°F (74°C) and slice.",
          temperature_note: "Cook chicken to 165°F (74°C).",
        },
        {
          step: 2,
          instruction: "Classic restaurant Caesar dressing sometimes uses raw egg yolk; at home, whisk Greek yogurt or pasteurized mayonnaise with lemon juice, garlic, and Parmesan instead of raw egg.",
        },
      ],
      isFeatured: false,
      popularityScore: 76,
      createdAt: new Date("2026-11-10T12:00:00Z").toISOString(),
    },
    {
      id: "bf-caution-lox",
      slug: "baked-salmon-bagel-toast-smoked-seafood-note",
      name: "Dill & Caper Salmon Whole-Grain Toast (Smoked Salmon Safety Swap)",
      description:
        "Whole-grain toast topped with flaked wild salmon, pasteurized cream/ricotta spread, cucumber, and fresh dill—explaining how to swap refrigerated smoked salmon (lox) safely during pregnancy.",
      mealCategory: "breakfast",
      primarySubcategory: "Whole-Grain Toast",
      subcategories: ["Whole-Grain Toast", "Quick Breakfasts"],
      imageUrl: "/images/food/avocado-toast.jpg",
      cuisine: "American",
      difficulty: "Easy",
      prepTimeMin: 8,
      cookTimeMin: 10,
      servings: 2,
      ingredients: [
        { ingredientId: "whole_wheat_bread", displayName: "100% whole-grain toast", quantity: 4, unit: "slice" },
        { ingredientId: "salmon_fillet", displayName: "cooked wild salmon (or smoked salmon heated to 165°F)", quantity: 6, unit: "oz", preparationNote: "cook or heat to 165°F if using smoked salmon" },
        { ingredientId: "ricotta_pasteurized", displayName: "pasteurized whipped ricotta", quantity: 0.5, unit: "cup" },
        { ingredientId: "cucumber", displayName: "thinly sliced cucumber", quantity: 0.75, unit: "cup" },
        { ingredientId: "fresh_herbs", displayName: "fresh dill", quantity: 2, unit: "tbsp" },
      ],
      instructions: [
        { step: 1, instruction: "Bake or pan-sear fresh salmon to 145°F (63°C), or if substituting refrigerated smoked salmon/lox, heat in a skillet or oven until steaming hot (165°F / 74°C)." },
        { step: 2, instruction: "Spread pasteurized ricotta onto whole-grain toast and top with salmon, cucumber, and fresh dill." },
      ],
      isFeatured: false,
      popularityScore: 78,
      createdAt: new Date("2026-11-11T12:00:00Z").toISOString(),
    }
  );

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

    for (const bp of allBlueprints) {
      const totalTimeMin = bp.prepTimeMin + bp.cookTimeMin;
      const nutrition = calculateRecipeNutrition(bp.ingredients, bp.servings);
      const instructionsText = bp.instructions.map((s) => s.instruction).join(" ");
      const safety = evaluatePregnancySafety({
        ingredients: bp.ingredients,
        instructionsText,
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

      const resolvedImageUrl =
        (recipeImageMap as Record<string, string>)[bp.id] ?? bp.imageUrl;

      insertRecipe.run(
        bp.id,
        bp.slug,
        bp.name,
        bp.description,
        bp.mealCategory,
        bp.primarySubcategory,
        resolvedImageUrl,
        bp.cuisine,
        bp.difficulty,
        bp.prepTimeMin,
        bp.cookTimeMin,
        totalTimeMin,
        bp.servings,
        JSON.stringify(bp.instructions),
        "original_editorial",
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
        "Nourish Demonstration Kitchen",
        "Local demonstration recipe; nutrition estimated from USDA FoodData Central SR Legacy & Foundation Foods (CC0 1.0).",
        null,
        "Demonstration Data + USDA FDC CC0 1.0",
        bp.isFeatured ? 1 : 0,
        bp.popularityScore,
        bp.createdAt
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
        if (!ref) {
          throw new Error(`Unknown ingredientId "${ing.ingredientId}" in recipe "${bp.id}"`);
        }
        const unitNorm = ing.unit.toLowerCase().replace(/s$/, "");
        const gramFactor = ref.unitGrams[unitNorm] ?? ref.unitGrams[ing.unit.toLowerCase()] ?? 50;
        const gramWeight = Math.round(ing.quantity * gramFactor * 10) / 10;
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
    }
  });

  runSeedTx();

  const counts = db
    .prepare(`SELECT meal_category, COUNT(*) as count FROM recipes GROUP BY meal_category`)
    .all() as Array<{ meal_category: string; count: number }>;

  const map: Record<string, number> = {};
  for (const row of counts) map[row.meal_category] = row.count;

  return {
    total: allBlueprints.length,
    breakfast: map.breakfast ?? 0,
    lunch: map.lunch ?? 0,
    dinner: map.dinner ?? 0,
    snack: map.snack ?? 0,
  };
}

// Run when invoked directly via `npm run seed`
const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isMain) {
  const result = seedDatabase(true);
  console.log("Seeded Nourish SQLite database:", result);
  closeDb();
}

