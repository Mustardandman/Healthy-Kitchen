import fs from "node:fs";
import path from "node:path";
import { buildBreakfastRecipes, buildSnackRecipes } from "../src/data/recipe-corpus-breakfast-snack";
import { buildDinnerRecipes, buildLunchRecipes } from "../src/data/recipe-corpus-lunch-dinner";

const all = [
  ...buildBreakfastRecipes(),
  ...buildLunchRecipes(),
  ...buildDinnerRecipes(),
  ...buildSnackRecipes(),
  {
    id: "ln-caution-caesar",
    name: "Classic Chicken Caesar Salad (Pasteurized Dressing Note)",
    mealCategory: "lunch",
    primarySubcategory: "Salads",
    ingredients: [{ ingredientId: "chicken_breast" }, { ingredientId: "romaine_lettuce" }],
  },
  {
    id: "bf-caution-lox",
    name: "Dill & Caper Salmon Whole-Grain Toast (Smoked Salmon Safety Swap)",
    mealCategory: "breakfast",
    primarySubcategory: "Whole-Grain Toast",
    ingredients: [{ ingredientId: "whole_wheat_bread" }, { ingredientId: "salmon_fillet" }],
  },
];

const meta = all.map((r) => ({
  id: r.id,
  name: r.name,
  mealCategory: r.mealCategory,
  primarySubcategory: r.primarySubcategory,
  ingredients: r.ingredients.map((i) => i.ingredientId),
}));

const outDir = path.join(process.cwd(), "scripts");
fs.writeFileSync(path.join(outDir, "recipe-meta.json"), JSON.stringify(meta, null, 2));
console.log("Exported", meta.length, "recipes to scripts/recipe-meta.json");

