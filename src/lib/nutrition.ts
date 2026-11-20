import { USDA_INGREDIENTS, computeGramWeight } from "@/data/usda-ingredients";
import type {
  Difficulty,
  HealthAssessment,
  HealthClassification,
  MealCategory,
  NutritionInfo,
  PregnancySafetyStatus,
} from "@/types/recipe";

export interface RawIngredientInput {
  ingredientId: string;
  displayName?: string;
  quantity: number;
  unit: string;
  preparationNote?: string;
  isOptional?: boolean;
}

export function calculateRecipeNutrition(
  ingredients: RawIngredientInput[],
  servings: number
): NutritionInfo {
  const safeServings = Math.max(1, servings);
  let calories = 0;
  let carbs_g = 0;
  let protein_g = 0;
  let fat_g = 0;
  let fiber_g = 0;
  let sugar_g = 0;
  let added_sugar_g = 0;
  let sodium_mg = 0;
  let calcium_mg = 0;
  let iron_mg = 0;
  let folate_mcg = 0;

  for (const item of ingredients) {
    const ref = USDA_INGREDIENTS[item.ingredientId];
    if (!ref) continue;
    const grams = computeGramWeight(item.ingredientId, item.quantity, item.unit);
    const factor = grams / 100;
    calories += ref.per100g.calories * factor;
    carbs_g += ref.per100g.carbs_g * factor;
    protein_g += ref.per100g.protein_g * factor;
    fat_g += ref.per100g.fat_g * factor;
    fiber_g += ref.per100g.fiber_g * factor;
    sugar_g += ref.per100g.sugar_g * factor;
    added_sugar_g += ref.per100g.added_sugar_g * factor;
    sodium_mg += ref.per100g.sodium_mg * factor;
    calcium_mg += ref.per100g.calcium_mg * factor;
    iron_mg += ref.per100g.iron_mg * factor;
    folate_mcg += ref.per100g.folate_mcg * factor;
  }

  const r1 = (n: number) => Math.round((n / safeServings) * 10) / 10;
  const r0 = (n: number) => Math.round(n / safeServings);

  return {
    calories: r0(calories),
    carbs_g: r1(carbs_g),
    protein_g: r1(protein_g),
    fat_g: r1(fat_g),
    fiber_g: r1(fiber_g),
    sugar_g: r1(sugar_g),
    added_sugar_g: r1(added_sugar_g),
    sodium_mg: r0(sodium_mg),
    calcium_mg: r0(calcium_mg),
    iron_mg: r1(iron_mg),
    folate_mcg: r0(folate_mcg),
    is_estimated: true,
    source: "Calculated from USDA FoodData Central ingredient reference data",
  };
}

export function deriveHealthClassifications(params: {
  mealCategory: MealCategory;
  ingredients: RawIngredientInput[];
  nutrition: NutritionInfo;
  totalTimeMin: number;
  difficulty: Difficulty;
  pregnancyStatus: PregnancySafetyStatus;
}): HealthClassification[] {
  const { mealCategory, ingredients, nutrition, totalTimeMin, difficulty, pregnancyStatus } = params;
  const isSnack = mealCategory === "snack";
  const tags = new Set<string>();

  for (const item of ingredients) {
    const ref = USDA_INGREDIENTS[item.ingredientId];
    if (ref) {
      for (const t of ref.tags) tags.add(t);
    }
  }

  const classes: HealthClassification[] = [];

  const highProteinThreshold = isSnack ? 9 : 20;
  const highFiberThreshold = isSnack ? 3 : 6;
  const bscProteinThreshold = isSnack ? 7 : 15;
  const bscFiberThreshold = isSnack ? 2.5 : 4;
  const addedSugar = nutrition.added_sugar_g ?? 0;

  // Blood-Sugar-Conscious: balanced protein + fiber pairing with minimal added sugar
  if (
    nutrition.protein_g >= bscProteinThreshold &&
    nutrition.fiber_g >= bscFiberThreshold &&
    addedSugar <= 5
  ) {
    classes.push("Blood-Sugar-Conscious");
  }

  if (nutrition.protein_g >= highProteinThreshold) {
    classes.push("High Protein");
  }

  if (nutrition.fiber_g >= highFiberThreshold) {
    classes.push("High Fiber");
  }

  if (
    nutrition.protein_g >= (isSnack ? 6 : 14) &&
    nutrition.fiber_g >= (isSnack ? 2 : 4) &&
    nutrition.fat_g >= (isSnack ? 3 : 6)
  ) {
    classes.push("Balanced Nutrition");
  }

  if (tags.has("whole_grain")) {
    classes.push("Whole Grain");
  }

  if (addedSugar <= 3) {
    classes.push("Low Added Sugar");
  }

  if (pregnancyStatus === "reviewed_safe") {
    classes.push("Pregnancy Food-Safety Reviewed");
  }

  if (!tags.has("meat") && !tags.has("poultry") && !tags.has("seafood")) {
    classes.push("Vegetarian");
  }

  if (totalTimeMin <= 30 && difficulty === "Easy") {
    classes.push("Quick and Easy");
  }

  if (!tags.has("dairy")) {
    classes.push("Dairy-Free");
  }

  if (!tags.has("gluten")) {
    classes.push("Gluten-Free");
  }

  return classes;
}

export function generateHealthAssessment(params: {
  ingredients: RawIngredientInput[];
  nutrition: NutritionInfo;
  mealCategory: MealCategory;
}): HealthAssessment {
  const { ingredients, nutrition, mealCategory } = params;
  const tags = new Set<string>();
  const ids = new Set<string>();

  for (const item of ingredients) {
    ids.add(item.ingredientId);
    const ref = USDA_INGREDIENTS[item.ingredientId];
    if (ref) {
      for (const t of ref.tags) tags.add(t);
    }
  }

  const nutritiousHighlights: string[] = [];
  const potentialDrawbacks: string[] = [];
  const substitutions: string[] = [];

  if (nutrition.protein_g >= (mealCategory === "snack" ? 8 : 18)) {
    nutritiousHighlights.push(
      `Provides ${nutrition.protein_g}g protein per serving to support satiety, maternal tissue needs, and steadier carbohydrate absorption.`
    );
  }
  if (nutrition.fiber_g >= (mealCategory === "snack" ? 3 : 5)) {
    nutritiousHighlights.push(
      `Delivers ${nutrition.fiber_g}g dietary fiber from whole-food ingredients to slow post-meal glucose rises.`
    );
  }
  if (tags.has("whole_grain")) {
    nutritiousHighlights.push(
      "Uses intact or 100% whole grains that retain bran and germ micronutrients."
    );
  }
  if (tags.has("healthy_fat") || tags.has("omega3")) {
    nutritiousHighlights.push(
      tags.has("omega3")
        ? "Supplies omega-3 fatty acids (from fish, walnuts, chia, or hemp) that support fetal brain and eye development."
        : "Includes unsaturated fats (olive oil, avocado, nuts, or seeds) that promote fullness and fat-soluble vitamin uptake."
    );
  }
  if (nutrition.calcium_mg >= 150) {
    nutritiousHighlights.push(
      `Contributes ~${nutrition.calcium_mg}mg calcium per serving toward daily pregnancy bone and muscle needs.`
    );
  }
  if (nutrition.folate_mcg >= 60) {
    nutritiousHighlights.push(
      `Rich in natural food folate (~${nutrition.folate_mcg}mcg per serving) from leafy greens, legumes, or eggs.`
    );
  }
  if (nutrition.iron_mg >= 2.5) {
    nutritiousHighlights.push(
      `Provides ~${nutrition.iron_mg}mg iron per serving to help support increased blood volume during pregnancy.`
    );
  }
  if (nutritiousHighlights.length === 0) {
    nutritiousHighlights.push(
      "Combines minimally processed whole-food ingredients for balanced everyday family nourishment."
    );
  }

  // Honest potential drawbacks
  if (nutrition.sodium_mg >= 650) {
    potentialDrawbacks.push(
      `Moderate-to-higher sodium (~${nutrition.sodium_mg}mg/serving) largely from cheese, broth, or sauces; monitor if watching blood pressure.`
    );
  }
  if (nutrition.carbs_g >= 48) {
    potentialDrawbacks.push(
      `Contains ${nutrition.carbs_g}g total carbohydrates per serving; pairing with extra non-starchy vegetables or adjusting grain portion may suit tighter glucose targets.`
    );
  }
  if (nutrition.fiber_g < 3 && mealCategory !== "snack") {
    potentialDrawbacks.push(
      `Lower fiber (${nutrition.fiber_g}g/serving) on its own; adding a side of leafy greens, berries, or chia seeds helps round out the meal.`
    );
  }
  if ((nutrition.added_sugar_g ?? 0) > 4) {
    potentialDrawbacks.push(
      `Includes ~${nutrition.added_sugar_g}g added sugar per serving from optional sweetener; omit or halve if minimizing added sugars.`
    );
  }
  if (potentialDrawbacks.length === 0) {
    potentialDrawbacks.push(
      "Individual glycemic responses vary throughout pregnancy; pair with your care team's guidance and adjust portion sizes to appetite."
    );
  }

  // Helpful substitutions
  if (ids.has("whole_wheat_pasta_cooked")) {
    substitutions.push("Swap whole-wheat pasta for chickpea or red lentil pasta to increase protein and fiber further.");
  }
  if (ids.has("brown_rice_cooked")) {
    substitutions.push("Try half brown rice and half riced cauliflower for a lighter carbohydrate load with added volume.");
  }
  if (ids.has("greek_yogurt_plain") || ids.has("cottage_cheese")) {
    substitutions.push("For dairy-free needs, substitute unsweetened soy or almond-protein yogurt fortified with calcium.");
  }
  if (ids.has("whole_wheat_bread") || ids.has("whole_wheat_tortilla")) {
    substitutions.push("Use sprouted-grain bread or a high-fiber gluten-free tortilla if avoiding gluten.");
  }
  if (ids.has("maple_syrup")) {
    substitutions.push("Omit maple syrup and add extra cinnamon, vanilla, or mashed berries for natural sweetness.");
  }
  if (ids.has("almonds") || ids.has("walnuts") || ids.has("almond_butter") || ids.has("peanut_butter")) {
    substitutions.push("Replace nuts or nut butter with roasted pumpkin seeds or sunflower seed butter for a nut-free kitchen.");
  }
  if (substitutions.length === 0) {
    substitutions.push("Easily swap in seasonal non-starchy vegetables like zucchini, broccoli, or baby spinach based on what you have on hand.");
  }

  return {
    nutritiousHighlights,
    potentialDrawbacks,
    substitutions,
  };
}

