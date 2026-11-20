import type { RawIngredientInput } from "@/lib/nutrition";
import type { Difficulty, MealCategory, RecipeStep } from "@/types/recipe";

export interface RecipeSeedBlueprint {
  id: string;
  slug: string;
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
  isFeatured: boolean;
  popularityScore: number;
  createdAt: string;
  customSafetyNote?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isoDaysAgo(daysAgo: number): string {
  const base = new Date("2026-11-18T12:00:00Z").getTime();
  return new Date(base - daysAgo * 86400 * 1000).toISOString();
}

function makeBreakfastEggRecipes(): RecipeSeedBlueprint[] {
  const veggies = [
    { id: "spinach", label: "Spinach", qty: 1.5, unit: "cup" },
    { id: "broccoli", label: "Broccoli", qty: 1, unit: "cup" },
    { id: "bell_pepper", label: "Bell Pepper", qty: 1, unit: "piece" },
    { id: "mushrooms", label: "Mushroom", qty: 1, unit: "cup" },
    { id: "zucchini", label: "Zucchini", qty: 1, unit: "cup" },
    { id: "tomatoes", label: "Cherry Tomato", qty: 1, unit: "cup" },
    { id: "asparagus", label: "Asparagus", qty: 1, unit: "cup" },
    { id: "kale", label: "Kale", qty: 1.5, unit: "cup" },
  ];
  const cheeses = [
    { id: "feta_pasteurized", label: "Pasteurized Feta", qty: 0.25, unit: "cup" },
    { id: "cheddar_pasteurized", label: "Sharp Cheddar", qty: 0.25, unit: "cup" },
    { id: "mozzarella_pasteurized", label: "Mozzarella", qty: 0.25, unit: "cup" },
    { id: "cottage_cheese", label: "Whipped Cottage Cheese", qty: 0.5, unit: "cup" },
  ];
  const styles = [
    { suffix: "Skillet Omelet", prep: 7, cook: 8, diff: "Easy" as Difficulty },
    { suffix: "Baked Frittata", prep: 10, cook: 18, diff: "Easy" as Difficulty },
    { suffix: "Veggie Scramble", prep: 5, cook: 7, diff: "Easy" as Difficulty },
  ];

  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;
  for (let v = 0; v < veggies.length; v++) {
    for (let c = 0; c < cheeses.length; c++) {
      if (recipes.length >= 24) break;
      const veg = veggies[v];
      const ch = cheeses[c];
      const style = styles[(v + c) % styles.length];
      const name = `${veg.label} & ${ch.label} ${style.suffix}`;
      const total = style.prep + style.cook;
      const subs = ["Eggs and Omelets", "High-Protein Breakfasts"];
      if (total <= 15) subs.push("Quick Breakfasts");

      recipes.push({
        id: `bf-egg-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Fluffy, thoroughly cooked eggs folded with tender ${veg.label.toLowerCase()}, ${ch.label.toLowerCase()}, and fresh herbs for a choline- and protein-rich morning meal.`,
        mealCategory: "breakfast",
        primarySubcategory: "Eggs and Omelets",
        subcategories: subs,
        imageUrl: "/images/food/eggs-omelet.jpg",
        cuisine: c === 0 ? "Mediterranean" : "American",
        difficulty: style.diff,
        prepTimeMin: style.prep,
        cookTimeMin: style.cook,
        servings: 2,
        ingredients: [
          { ingredientId: "egg_whole", displayName: "large whole eggs", quantity: 4, unit: "egg" },
          { ingredientId: "egg_whites", displayName: "pasteurized liquid egg whites", quantity: 0.5, unit: "cup" },
          { ingredientId: veg.id, displayName: veg.label.toLowerCase(), quantity: veg.qty, unit: veg.unit, preparationNote: "chopped" },
          { ingredientId: ch.id, displayName: ch.label.toLowerCase(), quantity: ch.qty, unit: ch.unit },
          { ingredientId: "olive_oil", displayName: "extra-virgin olive oil", quantity: 1, unit: "tbsp" },
          { ingredientId: "onion", displayName: "diced onion", quantity: 0.25, unit: "cup" },
          { ingredientId: "fresh_herbs", displayName: "chopped parsley or chives", quantity: 2, unit: "tbsp" },
          { ingredientId: "whole_wheat_bread", displayName: "100% whole-grain toast (on the side)", quantity: 2, unit: "slice" },
        ],
        instructions: [
          { step: 1, instruction: `Heat olive oil in a nonstick skillet over medium heat. Sauté diced onion and ${veg.label.toLowerCase()} for 4–5 minutes until tender.` },
          { step: 2, instruction: "Whisk whole eggs and pasteurized egg whites with chopped herbs and a pinch of black pepper." },
          {
            step: 3,
            instruction: `Pour eggs over the vegetables and fold in ${ch.label.toLowerCase()}. Cook gently until completely set with no runny liquid remaining.`,
            temperature_note: "Pregnancy safety: cook egg dishes until both whites and yolks are firm (160°F / 71°C).",
          },
          { step: 4, instruction: "Serve warm alongside toasted 100% whole-grain bread for steady fiber and morning energy." },
        ],
        isFeatured: idx <= 2,
        popularityScore: 95 - idx,
        createdAt: isoDaysAgo(idx),
      });
      idx++;
    }
  }
  return recipes;
}

function makeBreakfastOatsRecipes(): RecipeSeedBlueprint[] {
  const fruits = [
    { id: "blueberries", label: "Blueberry" },
    { id: "raspberries", label: "Raspberry" },
    { id: "strawberries", label: "Strawberry" },
    { id: "apple", label: "Spiced Apple" },
    { id: "pear", label: "Cinnamon Pear" },
    { id: "banana", label: "Half-Banana" },
  ];
  const nuts = [
    { id: "walnuts", label: "Walnut" },
    { id: "almonds", label: "Almond" },
    { id: "almond_butter", label: "Almond Butter" },
    { id: "pumpkin_seeds", label: "Pepita" },
  ];

  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;
  for (let f = 0; f < fruits.length; f++) {
    for (let n = 0; n < nuts.length; n++) {
      if (recipes.length >= 22) break;
      const fr = fruits[f];
      const nt = nuts[n];
      const isWarm = (f + n) % 2 === 0;
      const method = isWarm ? "Warm Protein Oatmeal" : "Chia Overnight Oats";
      const name = `${fr.label} & ${nt.label} ${method}`;
      const prep = isWarm ? 5 : 6;
      const cook = isWarm ? 8 : 0;
      const subs = ["Oatmeal and Overnight Oats", "High-Protein Breakfasts"];
      if (prep + cook <= 15) subs.push("Quick Breakfasts");

      recipes.push({
        id: `bf-oat-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Fiber-rich rolled oats balanced with Greek yogurt, chia seeds, ${fr.label.toLowerCase()}, and ${nt.label.toLowerCase()} to keep morning blood sugar steady.`,
        mealCategory: "breakfast",
        primarySubcategory: "Oatmeal and Overnight Oats",
        subcategories: subs,
        imageUrl: "/images/food/oats-berries.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: prep,
        cookTimeMin: cook,
        servings: 2,
        ingredients: [
          { ingredientId: "rolled_oats", displayName: "old-fashioned rolled oats", quantity: 1, unit: "cup" },
          { ingredientId: "greek_yogurt_plain", displayName: "pasteurized plain Greek yogurt", quantity: 0.75, unit: "cup" },
          { ingredientId: "unsweetened_almond_milk", displayName: "fortified unsweetened almond milk", quantity: 1.5, unit: "cup" },
          { ingredientId: "chia_seeds", displayName: "chia seeds", quantity: 2, unit: "tbsp" },
          { ingredientId: fr.id, displayName: fr.label.toLowerCase(), quantity: fr.id === "apple" || fr.id === "pear" || fr.id === "banana" ? 1 : 1, unit: fr.id === "apple" || fr.id === "pear" || fr.id === "banana" ? "piece" : "cup", preparationNote: "chopped or whole" },
          { ingredientId: nt.id, displayName: nt.label.toLowerCase(), quantity: 2, unit: "tbsp" },
          { ingredientId: "cinnamon_spices", displayName: "ground cinnamon", quantity: 1, unit: "tsp" },
          { ingredientId: "vanilla_extract", displayName: "pure vanilla extract", quantity: 0.5, unit: "tsp" },
        ],
        instructions: isWarm
          ? [
            { step: 1, instruction: "Simmer rolled oats, fortified almond milk, cinnamon, and vanilla in a small saucepan over medium heat for 6–8 minutes until creamy." },
            { step: 2, instruction: "Remove from heat and stir in Greek yogurt and chia seeds until velvety." },
            { step: 3, instruction: `Top with ${fr.label.toLowerCase()} and ${nt.label.toLowerCase()} and serve warm.` },
          ]
          : [
            { step: 1, instruction: "Whisk together rolled oats, Greek yogurt, almond milk, chia seeds, cinnamon, and vanilla in two glass jars." },
            { step: 2, instruction: `Fold in ${fr.label.toLowerCase()}, cover, and refrigerate at least 4 hours or overnight.` },
            { step: 3, instruction: `Top with ${nt.label.toLowerCase()} right before serving for crunch and healthy fats.` },
          ],
        isFeatured: idx === 1,
        popularityScore: 92 - idx,
        createdAt: isoDaysAgo(idx + 5),
      });
      idx++;
    }
  }
  return recipes;
}

function makeBreakfastYogurtRecipes(): RecipeSeedBlueprint[] {
  const berries = [
    { id: "blueberries", label: "Blueberry" },
    { id: "strawberries", label: "Strawberry" },
    { id: "raspberries", label: "Raspberry" },
    { id: "pear", label: "Diced Pear" },
    { id: "apple", label: "Cinnamon Apple" },
  ];
  const boosters = [
    { id: "hemp_hearts", label: "Hemp Heart" },
    { id: "chia_seeds", label: "Chia Crunch" },
    { id: "walnuts", label: "Toasted Walnut" },
    { id: "pumpkin_seeds", label: "Pumpkin Seed" },
    { id: "almonds", label: "Slivered Almond" },
  ];

  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;
  for (let b = 0; b < berries.length; b++) {
    for (let k = 0; k < boosters.length; k++) {
      if (recipes.length >= 21) break;
      const fr = berries[b];
      const bst = boosters[k];
      const name = `${fr.label} & ${bst.label} Greek Yogurt Parfait`;
      recipes.push({
        id: `bf-yog-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Probiotic-rich pasteurized Greek yogurt layered with ${fr.label.toLowerCase()}, ${bst.label.toLowerCase()}, and rolled oats for high calcium and protein.`,
        mealCategory: "breakfast",
        primarySubcategory: "Greek Yogurt",
        subcategories: ["Greek Yogurt", "Quick Breakfasts", "High-Protein Breakfasts"],
        imageUrl: "/images/food/greek-yogurt.jpg",
        cuisine: "Mediterranean",
        difficulty: "Easy",
        prepTimeMin: 5,
        cookTimeMin: 0,
        servings: 2,
        ingredients: [
          { ingredientId: "greek_yogurt_plain", displayName: "pasteurized plain Greek yogurt", quantity: 1.5, unit: "cup" },
          { ingredientId: fr.id, displayName: fr.label.toLowerCase(), quantity: 1, unit: fr.id === "apple" || fr.id === "pear" ? "piece" : "cup" },
          { ingredientId: bst.id, displayName: bst.label.toLowerCase(), quantity: 3, unit: "tbsp" },
          { ingredientId: "rolled_oats", displayName: "toasted rolled oats", quantity: 0.33, unit: "cup" },
          { ingredientId: "cinnamon_spices", displayName: "ground cinnamon", quantity: 0.5, unit: "tsp" },
          { ingredientId: "maple_syrup", displayName: "pure maple syrup (optional drizzle)", quantity: 1, unit: "tsp", isOptional: true },
        ],
        instructions: [
          { step: 1, instruction: "Spoon pasteurized plain Greek yogurt into two bowls and stir in cinnamon." },
          { step: 2, instruction: `Layer with ${fr.label.toLowerCase()} and toasted rolled oats.` },
          { step: 3, instruction: `Finish with ${bst.label.toLowerCase()} and an optional light drizzle of maple syrup.` },
        ],
        isFeatured: idx === 1,
        popularityScore: 90 - idx,
        createdAt: isoDaysAgo(idx + 10),
      });
      idx++;
    }
  }
  return recipes;
}

function makeBreakfastSmoothies(): RecipeSeedBlueprint[] {
  const greens = [
    { id: "spinach", label: "Spinach" },
    { id: "kale", label: "Baby Kale" },
    { id: "avocado", label: "Creamy Avocado" },
    { id: "cauliflower", label: "Frozen Cauliflower" },
  ];
  const fruits = [
    { id: "blueberries", label: "Wild Blueberry" },
    { id: "strawberries", label: "Strawberry" },
    { id: "raspberries", label: "Raspberry" },
    { id: "banana", label: "Banana" },
    { id: "pear", label: "Pear" },
  ];
  const proteins = [
    { id: "greek_yogurt_plain", label: "Greek Yogurt", qty: 0.75, unit: "cup" },
    { id: "cottage_cheese", label: "Cottage Cheese", qty: 0.75, unit: "cup" },
    { id: "protein_powder_unflavored", label: "Protein", qty: 1.5, unit: "scoop" },
  ];

  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;
  for (let g = 0; g < greens.length; g++) {
    for (let f = 0; f < fruits.length; f++) {
      if (recipes.length >= 20) break;
      const gr = greens[g];
      const fr = fruits[f];
      const pr = proteins[(g + f) % proteins.length];
      const name = `${fr.label} ${gr.label} ${pr.label} Smoothie`;
      recipes.push({
        id: `bf-smt-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `A balanced green-and-fruit smoothie anchored with ${pr.label.toLowerCase()}, chia seeds, and almond butter to avoid rapid glucose swings.`,
        mealCategory: "breakfast",
        primarySubcategory: "Smoothies",
        subcategories: ["Smoothies", "Quick Breakfasts", "High-Protein Breakfasts"],
        imageUrl: "/images/food/smoothie.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 5,
        cookTimeMin: 0,
        servings: 2,
        ingredients: [
          { ingredientId: pr.id, displayName: pr.label.toLowerCase(), quantity: pr.qty, unit: pr.unit },
          { ingredientId: gr.id, displayName: gr.label.toLowerCase(), quantity: gr.id === "avocado" ? 0.5 : 1.5, unit: gr.id === "avocado" ? "piece" : "cup" },
          { ingredientId: fr.id, displayName: fr.label.toLowerCase(), quantity: fr.id === "banana" || fr.id === "pear" ? 1 : 1, unit: fr.id === "banana" || fr.id === "pear" ? "piece" : "cup" },
          { ingredientId: "unsweetened_almond_milk", displayName: "unsweetened almond milk", quantity: 1.5, unit: "cup" },
          { ingredientId: "chia_seeds", displayName: "chia seeds", quantity: 2, unit: "tbsp" },
          { ingredientId: "almond_butter", displayName: "almond butter", quantity: 1, unit: "tbsp" },
        ],
        instructions: [
          { step: 1, instruction: "Wash fresh greens thoroughly under cold running water before blending." },
          { step: 2, instruction: `Combine ${pr.label.toLowerCase()}, ${gr.label.toLowerCase()}, ${fr.label.toLowerCase()}, almond milk, chia seeds, and almond butter in a blender.` },
          { step: 3, instruction: "Blend 45–60 seconds until smooth, adding a splash more almond milk if needed, and serve immediately." },
        ],
        isFeatured: idx === 1,
        popularityScore: 88 - idx,
        createdAt: isoDaysAgo(idx + 12),
      });
      idx++;
    }
  }
  return recipes;
}

function makeBreakfastBowls(): RecipeSeedBlueprint[] {
  const grains = [
    { id: "quinoa_cooked", label: "Quinoa" },
    { id: "farro_cooked", label: "Farro" },
    { id: "brown_rice_cooked", label: "Brown Rice" },
    { id: "sweet_potato", label: "Roasted Sweet Potato" },
  ];
  const proteins = [
    { id: "egg_whole", label: "Scrambled Egg", qty: 4, unit: "egg" },
    { id: "black_beans", label: "Black Bean", qty: 1, unit: "cup" },
    { id: "firm_tofu", label: "Herb Tofu", qty: 8, unit: "oz" },
    { id: "chicken_breast", label: "Savory Chicken", qty: 6, unit: "oz" },
    { id: "ground_turkey", label: "Turkey Sausage-Spiced", qty: 6, unit: "oz" },
  ];

  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;
  for (let g = 0; g < grains.length; g++) {
    for (let p = 0; p < proteins.length; p++) {
      const gr = grains[g];
      const pr = proteins[p];
      const name = `Savory ${pr.label} & ${gr.label} Breakfast Bowl`;
      recipes.push({
        id: `bf-bwl-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Warm morning bowl combining ${gr.label.toLowerCase()}, ${pr.label.toLowerCase()}, sautéed spinach, and sliced avocado for lasting fullness.`,
        mealCategory: "breakfast",
        primarySubcategory: "Breakfast Bowls",
        subcategories: ["Breakfast Bowls", "High-Protein Breakfasts"],
        imageUrl: "/images/food/grain-bowl.jpg",
        cuisine: p === 1 ? "Mexican" : "American",
        difficulty: "Easy",
        prepTimeMin: 8,
        cookTimeMin: 12,
        servings: 2,
        ingredients: [
          { ingredientId: gr.id, displayName: gr.label.toLowerCase(), quantity: 1.5, unit: "cup" },
          { ingredientId: pr.id, displayName: pr.label.toLowerCase(), quantity: pr.qty, unit: pr.unit },
          { ingredientId: "spinach", displayName: "baby spinach", quantity: 2, unit: "cup" },
          { ingredientId: "avocado", displayName: "sliced avocado", quantity: 1, unit: "piece" },
          { ingredientId: "tomatoes", displayName: "diced cherry tomatoes", quantity: 0.75, unit: "cup" },
          { ingredientId: "olive_oil", displayName: "olive oil", quantity: 1, unit: "tbsp" },
          { ingredientId: "cinnamon_spices", displayName: "cumin, garlic powder & black pepper", quantity: 1, unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: `Warm olive oil in a skillet and cook ${pr.label.toLowerCase()} with spices until thoroughly heated and cooked through.` },
          { step: 2, instruction: "Wilt baby spinach in the skillet for 1–2 minutes." },
          { step: 3, instruction: `Divide ${gr.label.toLowerCase()} into two bowls and top with cooked ${pr.label.toLowerCase()}, spinach, tomatoes, and avocado.` },
        ],
        isFeatured: idx === 1,
        popularityScore: 86 - idx,
        createdAt: isoDaysAgo(idx + 15),
      });
      idx++;
    }
  }
  return recipes;
}

function makeBreakfastToasts(): RecipeSeedBlueprint[] {
  const bases = [
    { id: "avocado", label: "Smashed Avocado", qty: 1, unit: "piece" },
    { id: "cottage_cheese", label: "Whipped Cottage Cheese", qty: 0.75, unit: "cup" },
    { id: "ricotta_pasteurized", label: "Lemon Ricotta", qty: 0.75, unit: "cup" },
    { id: "almond_butter", label: "Almond Butter", qty: 3, unit: "tbsp" },
    { id: "hummus", label: "Garlic Hummus", qty: 0.5, unit: "cup" },
  ];
  const toppings = [
    { id: "egg_whole", label: "Hard-Cooked Egg", qty: 2, unit: "egg" },
    { id: "tomatoes", label: "Heirloom Tomato & Hemp", qty: 1, unit: "cup" },
    { id: "raspberries", label: "Crushed Raspberry & Chia", qty: 0.75, unit: "cup" },
    { id: "spinach", label: "Garlicky Spinach", qty: 1.5, unit: "cup" },
  ];

  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;
  for (let b = 0; b < bases.length; b++) {
    for (let t = 0; t < toppings.length; t++) {
      const bs = bases[b];
      const tp = toppings[t];
      const name = `Whole-Grain ${bs.label} & ${tp.label} Toast`;
      recipes.push({
        id: `bf-tst-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `100% whole-grain toast layered with ${bs.label.toLowerCase()} and ${tp.label.toLowerCase()} for balanced morning carbohydrates, fiber, and protein.`,
        mealCategory: "breakfast",
        primarySubcategory: "Whole-Grain Toast",
        subcategories: ["Whole-Grain Toast", "Quick Breakfasts"],
        imageUrl: "/images/food/avocado-toast.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 6,
        cookTimeMin: 4,
        servings: 2,
        ingredients: [
          { ingredientId: "whole_wheat_bread", displayName: "100% whole-grain bread", quantity: 4, unit: "slice" },
          { ingredientId: bs.id, displayName: bs.label.toLowerCase(), quantity: bs.qty, unit: bs.unit },
          { ingredientId: tp.id, displayName: tp.label.toLowerCase(), quantity: tp.qty, unit: tp.unit },
          { ingredientId: "hemp_hearts", displayName: "hemp hearts", quantity: 2, unit: "tbsp" },
          { ingredientId: "lemon_juice", displayName: "fresh lemon juice", quantity: 1, unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: "Toast 100% whole-grain bread slices until golden and crisp." },
          { step: 2, instruction: `Spread ${bs.label.toLowerCase()} evenly across the warm toast.` },
          { step: 3, instruction: `Top with ${tp.label.toLowerCase()} (fully cooked if using eggs) and sprinkle with hemp hearts.` },
        ],
        isFeatured: idx === 1,
        popularityScore: 87 - idx,
        createdAt: isoDaysAgo(idx + 18),
      });
      idx++;
    }
  }
  return recipes;
}

function makeBreakfastPancakesAndWraps(): RecipeSeedBlueprint[] {
  const recipes: RecipeSeedBlueprint[] = [];
  const pancakeFlavors = [
    { id: "blueberries", label: "Blueberry" },
    { id: "raspberries", label: "Raspberry" },
    { id: "strawberries", label: "Strawberry" },
    { id: "banana", label: "Banana Walnut" },
    { id: "apple", label: "Cinnamon Apple" },
    { id: "cocoa_powder", label: "Dark Cocoa" },
    { id: "pumpkin_seeds", label: "Vanilla Pumpkin Seed" },
  ];
  const batters = [
    { id: "cottage_cheese", label: "Cottage Cheese Oat" },
    { id: "greek_yogurt_plain", label: "Greek Yogurt Oat" },
    { id: "almond_flour", label: "Almond Flour Protein" },
  ];

  let pIdx = 1;
  for (const fl of pancakeFlavors) {
    for (const bt of batters) {
      const isWaffle = pIdx % 3 === 0;
      const dish = isWaffle ? "Waffles" : "Pancakes";
      const name = `${fl.label} ${bt.label} ${dish}`;
      recipes.push({
        id: `bf-pan-${pIdx}`,
        slug: slugify(`${name}-${pIdx}`),
        name,
        description: `Tender whole-grain ${dish.toLowerCase()} made with ${bt.label.toLowerCase()} and eggs—naturally higher in protein with minimal added sugar.`,
        mealCategory: "breakfast",
        primarySubcategory: "Pancakes and Waffles",
        subcategories: ["Pancakes and Waffles", "High-Protein Breakfasts"],
        imageUrl: "/images/food/pancakes.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 8,
        cookTimeMin: 12,
        servings: 2,
        ingredients: [
          { ingredientId: "rolled_oats", displayName: "rolled oats (blended into flour)", quantity: 1, unit: "cup" },
          { ingredientId: bt.id, displayName: bt.label.toLowerCase(), quantity: 0.75, unit: "cup" },
          { ingredientId: "egg_whole", displayName: "large eggs", quantity: 3, unit: "egg" },
          { ingredientId: fl.id, displayName: fl.label.toLowerCase(), quantity: fl.id === "cocoa_powder" || fl.id === "pumpkin_seeds" ? 2 : 0.75, unit: fl.id === "cocoa_powder" || fl.id === "pumpkin_seeds" ? "tbsp" : fl.id === "banana" || fl.id === "apple" ? "piece" : "cup" },
          { ingredientId: "milk_lowfat", displayName: "pasteurized milk", quantity: 0.25, unit: "cup" },
          { ingredientId: "cinnamon_spices", displayName: "cinnamon & baking powder", quantity: 1, unit: "tsp" },
          { ingredientId: "olive_oil", displayName: "olive oil for griddle", quantity: 1, unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: "Blend rolled oats into a fine flour, then whisk with eggs, dairy/almond base, milk, and cinnamon until smooth." },
          { step: 2, instruction: `Fold in ${fl.label.toLowerCase()}.` },
          { step: 3, instruction: `Cook on a lightly oiled ${isWaffle ? "waffle iron" : "griddle over medium heat"} until golden and cooked through in the center.` },
        ],
        isFeatured: pIdx === 1,
        popularityScore: 85 - pIdx,
        createdAt: isoDaysAgo(pIdx + 22),
      });
      pIdx++;
    }
  }

  // Breakfast Wraps (21 recipes)
  const wrapProteins = [
    { id: "egg_whole", label: "Scrambled Egg", qty: 4, unit: "egg" },
    { id: "egg_whites", label: "Egg White", qty: 1, unit: "cup" },
    { id: "ground_turkey", label: "Savory Turkey", qty: 6, unit: "oz" },
  ];
  const wrapVeggies = [
    { id: "spinach", label: "Spinach" },
    { id: "bell_pepper", label: "Bell Pepper" },
    { id: "black_beans", label: "Black Bean" },
    { id: "mushrooms", label: "Mushroom" },
    { id: "tomatoes", label: "Tomato" },
    { id: "zucchini", label: "Zucchini" },
    { id: "broccoli", label: "Broccoli" },
  ];

  let wIdx = 1;
  for (const wp of wrapProteins) {
    for (const wv of wrapVeggies) {
      const name = `${wp.label}, ${wv.label} & Avocado Breakfast Wrap`;
      recipes.push({
        id: `bf-wrp-${wIdx}`,
        slug: slugify(`${name}-${wIdx}`),
        name,
        description: `Portable high-fiber whole-wheat breakfast burrito filled with thoroughly cooked ${wp.label.toLowerCase()}, ${wv.label.toLowerCase()}, and creamy avocado.`,
        mealCategory: "breakfast",
        primarySubcategory: "Breakfast Wraps",
        subcategories: ["Breakfast Wraps", "Quick Breakfasts", "High-Protein Breakfasts"],
        imageUrl: "/images/food/wrap-sandwich.jpg",
        cuisine: "Mexican",
        difficulty: "Easy",
        prepTimeMin: 6,
        cookTimeMin: 8,
        servings: 2,
        ingredients: [
          { ingredientId: "whole_wheat_tortilla", displayName: "high-fiber whole-wheat tortillas", quantity: 2, unit: "wrap" },
          { ingredientId: wp.id, displayName: wp.label.toLowerCase(), quantity: wp.qty, unit: wp.unit },
          { ingredientId: wv.id, displayName: wv.label.toLowerCase(), quantity: 1, unit: "cup" },
          { ingredientId: "cheddar_pasteurized", displayName: "pasteurized shredded cheddar", quantity: 0.25, unit: "cup" },
          { ingredientId: "avocado", displayName: "sliced avocado", quantity: 0.5, unit: "piece" },
          { ingredientId: "salsa", displayName: "tomato salsa", quantity: 3, unit: "tbsp" },
          { ingredientId: "olive_oil", displayName: "olive oil", quantity: 1, unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: `Sauté ${wv.label.toLowerCase()} in olive oil for 3–4 minutes.` },
          {
            step: 2,
            instruction: `Add ${wp.label.toLowerCase()} and cook until completely set and hot throughout.`,
            temperature_note: "Cook eggs to 160°F (71°C) and ground turkey to 165°F (74°C).",
          },
          { step: 3, instruction: "Fill warmed whole-wheat tortillas with the mixture, cheddar, avocado, and salsa; roll tightly and slice." },
        ],
        isFeatured: wIdx === 1,
        popularityScore: 84 - wIdx,
        createdAt: isoDaysAgo(wIdx + 25),
      });
      wIdx++;
    }
  }

  // Dedicated High-Protein Breakfasts & Quick Breakfasts (40 more to reach 210+ total)
  const hpBases = [
    { id: "cottage_cheese", label: "Cottage Cheese", qty: 1.5, unit: "cup", img: "/images/food/greek-yogurt.jpg" },
    { id: "greek_yogurt_plain", label: "High-Protein Greek Yogurt", qty: 1.5, unit: "cup", img: "/images/food/greek-yogurt.jpg" },
    { id: "egg_whole", label: "Egg & Turkey", qty: 4, unit: "egg", img: "/images/food/eggs-omelet.jpg" },
    { id: "firm_tofu", label: "Tofu Breakfast Scramble", qty: 10, unit: "oz", img: "/images/food/grain-bowl.jpg" },
  ];
  const hpToppings = [
    { id: "hemp_hearts", label: "Hemp Seed" },
    { id: "pumpkin_seeds", label: "Pepita" },
    { id: "walnuts", label: "Walnut" },
    { id: "almonds", label: "Toasted Almond" },
    { id: "chia_seeds", label: "Chia Berry" },
  ];
  const hpFruits = [
    { id: "blueberries", label: "Blueberry" },
    { id: "raspberries", label: "Raspberry" },
  ];

  let hpIdx = 1;
  for (const b of hpBases) {
    for (const t of hpToppings) {
      for (const f of hpFruits) {
        const isQuick = hpIdx % 2 === 0;
        const primary = isQuick ? "Quick Breakfasts" : "High-Protein Breakfasts";
        const name = `${b.label} ${f.label} & ${t.label} Morning Plate`;
        recipes.push({
          id: `bf-hp-${hpIdx}`,
          slug: slugify(`${name}-${hpIdx}`),
          name,
          description: `Nutrient-dense breakfast built around ${b.label.toLowerCase()}, ${f.label.toLowerCase()}, and ${t.label.toLowerCase()} delivering 22g+ protein to support steady morning glucose.`,
          mealCategory: "breakfast",
          primarySubcategory: primary,
          subcategories: ["High-Protein Breakfasts", "Quick Breakfasts"],
          imageUrl: b.img,
          cuisine: "American",
          difficulty: "Easy",
          prepTimeMin: 5,
          cookTimeMin: b.id === "egg_whole" || b.id === "firm_tofu" ? 7 : 0,
          servings: 2,
          ingredients: [
            { ingredientId: b.id, displayName: b.label.toLowerCase(), quantity: b.qty, unit: b.unit },
            { ingredientId: f.id, displayName: f.label.toLowerCase(), quantity: 1, unit: "cup" },
            { ingredientId: t.id, displayName: t.label.toLowerCase(), quantity: 3, unit: "tbsp" },
            { ingredientId: "rolled_oats", displayName: "rolled oats or sprouted toast", quantity: 0.5, unit: "cup" },
            ...(b.id === "egg_whole"
              ? [{ ingredientId: "turkey_breast", displayName: "diced roasted turkey breast", quantity: 3, unit: "oz" }]
              : []),
          ],
          instructions: [
            { step: 1, instruction: b.id === "egg_whole" || b.id === "firm_tofu" ? `Cook ${b.label.toLowerCase()} in a lightly oiled skillet until hot and completely cooked through.` : `Portion ${b.label.toLowerCase()} into two serving bowls.` },
            { step: 2, instruction: `Serve with ${f.label.toLowerCase()}, ${t.label.toLowerCase()}, and whole-grain oats or toast.` },
          ],
          isFeatured: false,
          popularityScore: 80 - hpIdx,
          createdAt: isoDaysAgo(hpIdx + 30),
        });
        hpIdx++;
      }
    }
  }

  return recipes;
}

export function buildBreakfastRecipes(): RecipeSeedBlueprint[] {
  return [
    ...makeBreakfastEggRecipes(),
    ...makeBreakfastOatsRecipes(),
    ...makeBreakfastYogurtRecipes(),
    ...makeBreakfastSmoothies(),
    ...makeBreakfastBowls(),
    ...makeBreakfastToasts(),
    ...makeBreakfastPancakesAndWraps(),
  ];
}

export function buildSnackRecipes(): RecipeSeedBlueprint[] {
  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;

  // 1. Greek Yogurt Snacks (14)
  const yogMixes = [
    { id: "blueberries", label: "Blueberry Lemon" },
    { id: "strawberries", label: "Strawberry Vanilla" },
    { id: "raspberries", label: "Raspberry Cocoa" },
    { id: "cucumber", label: "Cucumber Dill Tzatziki" },
    { id: "cinnamon_spices", label: "Cinnamon Walnut" },
    { id: "pumpkin_seeds", label: "Pumpkin Seed Berry" },
    { id: "chia_seeds", label: "Chia Almond" },
  ];
  const yogAddOns = ["walnuts", "almonds"];
  for (const m of yogMixes) {
    for (const a of yogAddOns) {
      const savory = m.id === "cucumber";
      const name = savory ? `Greek Yogurt ${m.label} Dip (${a === "walnuts" ? "with Carrots" : "with Peppers"})` : `${m.label} Greek Yogurt ${a === "walnuts" ? "Crunch" : "Bark"}`;
      recipes.push({
        id: `sn-yog-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Creamy pasteurized Greek yogurt snack rich in calcium and protein for steady afternoon energy.`,
        mealCategory: "snack",
        primarySubcategory: "Greek Yogurt Snacks",
        subcategories: ["Greek Yogurt Snacks", "Quick Snacks"],
        imageUrl: savory ? "/images/food/veggies-hummus.jpg" : "/images/food/greek-yogurt.jpg",
        cuisine: savory ? "Mediterranean" : "American",
        difficulty: "Easy",
        prepTimeMin: 5,
        cookTimeMin: 0,
        servings: 2,
        ingredients: [
          { ingredientId: "greek_yogurt_plain", displayName: "pasteurized plain Greek yogurt", quantity: 1, unit: "cup" },
          { ingredientId: m.id, displayName: m.label.toLowerCase(), quantity: m.id === "cinnamon_spices" ? 1 : 0.75, unit: m.id === "cinnamon_spices" ? "tsp" : "cup" },
          { ingredientId: savory ? (a === "walnuts" ? "carrots" : "bell_pepper") : a, displayName: savory ? "fresh dipping veggies" : a, quantity: savory ? 1.5 : 2, unit: savory ? "cup" : "tbsp" },
        ],
        instructions: [
          { step: 1, instruction: "Whisk pasteurized plain Greek yogurt with seasonings or berries." },
          { step: 2, instruction: savory ? "Serve chilled alongside crisp sliced vegetables." : "Top with nuts or freeze on parchment into yogurt bark squares." },
        ],
        isFeatured: idx === 1,
        popularityScore: 86 - idx,
        createdAt: isoDaysAgo(idx),
      });
      idx++;
    }
  }

  // 2. Fruit and Protein (14)
  const fruits = [
    { id: "apple", label: "Crisp Apple" },
    { id: "pear", label: "Sliced Pear" },
    { id: "strawberries", label: "Strawberry" },
    { id: "blueberries", label: "Blueberry" },
    { id: "banana", label: "Banana" },
    { id: "raspberries", label: "Raspberry" },
    { id: "apple", label: "Granny Smith Apple" },
  ];
  const fProteins = [
    { id: "almond_butter", label: "Almond Butter" },
    { id: "peanut_butter", label: "Peanut Butter" },
  ];
  for (const fr of fruits) {
    for (const fp of fProteins) {
      const name = `${fr.label} Slices with ${fp.label} & Hemp Seeds`;
      recipes.push({
        id: `sn-frp-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Whole fruit paired with ${fp.label.toLowerCase()} and hemp seeds to balance natural fruit sugars with protein and healthy fats.`,
        mealCategory: "snack",
        primarySubcategory: "Fruit and Protein",
        subcategories: ["Fruit and Protein", "Quick Snacks", "Evening Snacks"],
        imageUrl: "/images/food/oats-berries.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 4,
        cookTimeMin: 0,
        servings: 2,
        ingredients: [
          { ingredientId: fr.id, displayName: fr.label.toLowerCase(), quantity: fr.id === "apple" || fr.id === "pear" || fr.id === "banana" ? 2 : 1.5, unit: fr.id === "apple" || fr.id === "pear" || fr.id === "banana" ? "piece" : "cup" },
          { ingredientId: fp.id, displayName: fp.label.toLowerCase(), quantity: 3, unit: "tbsp" },
          { ingredientId: "hemp_hearts", displayName: "hemp hearts", quantity: 1, unit: "tbsp" },
          { ingredientId: "cinnamon_spices", displayName: "pinch of cinnamon", quantity: 0.25, unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: `Wash and slice ${fr.label.toLowerCase()} into bite-size wedges.` },
          { step: 2, instruction: `Serve with ${fp.label.toLowerCase()} for dipping, dusted with hemp hearts and cinnamon.` },
        ],
        isFeatured: idx === 15,
        popularityScore: 84 - (idx % 20),
        createdAt: isoDaysAgo(idx + 3),
      });
      idx++;
    }
  }

  // 3. Nuts and Seeds (14)
  const nutBases = [
    { id: "almonds", label: "Roasted Almond" },
    { id: "walnuts", label: "Maple-Spiced Walnut" },
    { id: "pumpkin_seeds", label: "Garlic Pepita" },
    { id: "almonds", label: "Rosemary Almond" },
    { id: "walnuts", label: "Cinnamon Walnut" },
    { id: "pumpkin_seeds", label: "Turmeric Pumpkin Seed" },
    { id: "edamame", label: "Crispy Edamame" },
  ];
  const seedPairings = [
    { id: "chia_seeds", label: "Chia" },
    { id: "hemp_hearts", label: "Hemp Heart" },
  ];
  for (const nb of nutBases) {
    for (const sp of seedPairings) {
      const name = `${nb.label} & ${sp.label} Energy Trail Mix`;
      recipes.push({
        id: `sn-nut-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Magnesium-, iron-, and omega-3-rich nuts and seeds lightly seasoned for a satisfying low-sugar crunch.`,
        mealCategory: "snack",
        primarySubcategory: "Nuts and Seeds",
        subcategories: ["Nuts and Seeds", "Quick Snacks"],
        imageUrl: "/images/food/oats-berries.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 4,
        cookTimeMin: 8,
        servings: 4,
        ingredients: [
          { ingredientId: nb.id, displayName: nb.label.toLowerCase(), quantity: 1, unit: "cup" },
          { ingredientId: "pumpkin_seeds", displayName: "roasted pumpkin seeds", quantity: 0.5, unit: "cup" },
          { ingredientId: sp.id, displayName: sp.label.toLowerCase(), quantity: 2, unit: "tbsp" },
          { ingredientId: "olive_oil", displayName: "olive oil", quantity: 1, unit: "tsp" },
          { ingredientId: "cinnamon_spices", displayName: "warm spices or sea salt", quantity: 0.5, unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: "Toss nuts and seeds lightly with olive oil and spices." },
          { step: 2, instruction: "Toast in a dry skillet or 325°F oven for 6–8 minutes until fragrant, cool, and portion." },
        ],
        isFeatured: false,
        popularityScore: 79 - (idx % 15),
        createdAt: isoDaysAgo(idx + 5),
      });
      idx++;
    }
  }

  // 4. Cottage Cheese Snacks (14)
  const ccToppings = [
    { id: "tomatoes", label: "Cherry Tomato & Basil" },
    { id: "cucumber", label: "Cucumber & Dill" },
    { id: "blueberries", label: "Blueberry & Walnut" },
    { id: "strawberries", label: "Strawberry & Chia" },
    { id: "bell_pepper", label: "Everything-Spiced Bell Pepper" },
    { id: "pear", label: "Cinnamon Pear" },
    { id: "avocado", label: "Avocado & Pepita" },
  ];
  for (let pass = 0; pass < 2; pass++) {
    for (const ct of ccToppings) {
      const onToast = pass === 1;
      const name = onToast ? `${ct.label} Cottage Cheese Whole-Grain Crisps` : `${ct.label} Cottage Cheese Bowl`;
      recipes.push({
        id: `sn-cc-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Slow-digesting casein protein from pasteurized cottage cheese paired with ${ct.label.toLowerCase()}—ideal between meals or before bed.`,
        mealCategory: "snack",
        primarySubcategory: "Cottage Cheese",
        subcategories: ["Cottage Cheese", "Evening Snacks", "Quick Snacks"],
        imageUrl: "/images/food/greek-yogurt.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 5,
        cookTimeMin: 0,
        servings: 2,
        ingredients: [
          { ingredientId: "cottage_cheese", displayName: "pasteurized low-fat cottage cheese", quantity: 1, unit: "cup" },
          { ingredientId: ct.id, displayName: ct.label.toLowerCase(), quantity: 0.75, unit: ct.id === "pear" || ct.id === "avocado" ? "piece" : "cup" },
          { ingredientId: "pumpkin_seeds", displayName: "pumpkin seeds", quantity: 2, unit: "tbsp" },
          ...(onToast ? [{ ingredientId: "whole_wheat_bread", displayName: "whole-grain toast triangles", quantity: 2, unit: "slice" }] : []),
        ],
        instructions: [
          { step: 1, instruction: onToast ? "Toast whole-grain bread and slice into crisps." : "Spoon pasteurized cottage cheese into two small bowls." },
          { step: 2, instruction: `Top with ${ct.label.toLowerCase()} and pumpkin seeds.` },
        ],
        isFeatured: false,
        popularityScore: 81 - (idx % 14),
        createdAt: isoDaysAgo(idx + 7),
      });
      idx++;
    }
  }

  // 5. Vegetables and Dips (14)
  const dips = [
    { id: "hummus", label: "Classic Hummus" },
    { id: "avocado", label: "Lime Guacamole" },
    { id: "cannellini_beans", label: "Whipped White Bean Dip" },
    { id: "chickpeas", label: "Roasted Red Pepper Hummus" },
    { id: "black_beans", label: "Warm Spiced Black Bean Dip" },
    { id: "greek_yogurt_plain", label: "Herb Ranch Yogurt Dip" },
    { id: "tahini", label: "Lemon Tahini Dip" },
  ];
  const dipVeg = [
    { id: "carrots", label: "Carrot & Celery Sticks" },
    { id: "bell_pepper", label: "Bell Pepper & Cucumber Boats" },
  ];
  for (const dp of dips) {
    for (const dv of dipVeg) {
      const name = `${dv.label} with ${dp.label}`;
      recipes.push({
        id: `sn-veg-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Crunchy high-fiber vegetables paired with ${dp.label.toLowerCase()} for folate, plant protein, and steady energy.`,
        mealCategory: "snack",
        primarySubcategory: "Vegetables and Dips",
        subcategories: ["Vegetables and Dips", "Quick Snacks"],
        imageUrl: "/images/food/veggies-hummus.jpg",
        cuisine: "Mediterranean",
        difficulty: "Easy",
        prepTimeMin: 6,
        cookTimeMin: 0,
        servings: 2,
        ingredients: [
          { ingredientId: dp.id, displayName: dp.label.toLowerCase(), quantity: dp.id === "tahini" ? 3 : 0.75, unit: dp.id === "tahini" ? "tbsp" : dp.id === "avocado" ? "piece" : "cup" },
          { ingredientId: dv.id, displayName: dv.label.toLowerCase(), quantity: 2, unit: "cup" },
          { ingredientId: "cucumber", displayName: "sliced cucumber", quantity: 1, unit: "cup" },
          { ingredientId: "olive_oil", displayName: "olive oil drizzle", quantity: 1, unit: "tsp" },
          { ingredientId: "lemon_juice", displayName: "fresh lemon juice", quantity: 1, unit: "tbsp" },
        ],
        instructions: [
          { step: 1, instruction: `Wash and slice crisp vegetables into dipping sticks.` },
          { step: 2, instruction: `Whisk or blend ${dp.label.toLowerCase()} with lemon juice and olive oil until smooth and serve chilled.` },
        ],
        isFeatured: idx === 57,
        popularityScore: 83 - (idx % 12),
        createdAt: isoDaysAgo(idx + 9),
      });
      idx++;
    }
  }

  // 6. Homemade Protein Snacks (14)
  const biteFlavors = [
    "Almond Butter Chia",
    "Peanut Butter Cocoa",
    "Cinnamon Oat Walnut",
    "Lemon Hemp Coconut",
    "Blueberry Oat Almond",
    "Pumpkin Seed Cinnamon",
    "Vanilla Almond Flax",
  ];
  for (let pass = 0; pass < 2; pass++) {
    for (const bf of biteFlavors) {
      const isMuffin = pass === 1;
      const name = isMuffin ? `Savory ${bf.split(" ")[0]} Veggie Egg Snack Muffins` : `${bf} No-Bake Oat Bites`;
      recipes.push({
        id: `sn-pro-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: isMuffin
          ? `Make-ahead baked egg and cheese snack cups with spinach for grab-and-go protein.`
          : `Whole-grain rolled oats bound with nut butter, chia seeds, and hemp hearts for sustained snack energy.`,
        mealCategory: "snack",
        primarySubcategory: "Homemade Protein Snacks",
        subcategories: ["Homemade Protein Snacks", "Evening Snacks"],
        imageUrl: isMuffin ? "/images/food/eggs-omelet.jpg" : "/images/food/oats-berries.jpg",
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 10,
        cookTimeMin: isMuffin ? 18 : 0,
        servings: 4,
        ingredients: isMuffin
          ? [
            { ingredientId: "egg_whole", displayName: "large eggs", quantity: 6, unit: "egg" },
            { ingredientId: "spinach", displayName: "chopped baby spinach", quantity: 1.5, unit: "cup" },
            { ingredientId: "cheddar_pasteurized", displayName: "pasteurized cheddar cheese", quantity: 0.5, unit: "cup" },
            { ingredientId: "bell_pepper", displayName: "diced bell pepper", quantity: 0.5, unit: "cup" },
          ]
          : [
            { ingredientId: "rolled_oats", displayName: "rolled oats", quantity: 1.5, unit: "cup" },
            { ingredientId: bf.includes("Peanut") ? "peanut_butter" : "almond_butter", displayName: "natural nut butter", quantity: 0.5, unit: "cup" },
            { ingredientId: "chia_seeds", displayName: "chia seeds", quantity: 2, unit: "tbsp" },
            { ingredientId: "hemp_hearts", displayName: "hemp hearts", quantity: 2, unit: "tbsp" },
            { ingredientId: "maple_syrup", displayName: "pure maple syrup", quantity: 2, unit: "tbsp" },
          ],
        instructions: isMuffin
          ? [
            { step: 1, instruction: "Whisk eggs with chopped spinach, bell pepper, and pasteurized cheddar." },
            {
              step: 2,
              instruction: "Bake in greased muffin cups at 350°F for 18 minutes until firm and puffed.",
              temperature_note: "Ensure egg muffins reach 160°F (71°C) in the center.",
            },
          ]
          : [
            { step: 1, instruction: "Stir rolled oats, nut butter, chia seeds, hemp hearts, and maple syrup until cohesive." },
            { step: 2, instruction: "Roll into 12 bite-sized portions and chill 30 minutes before storing." },
          ],
        isFeatured: false,
        popularityScore: 82 - (idx % 12),
        createdAt: isoDaysAgo(idx + 12),
      });
      idx++;
    }
  }

  // 7. Quick Snacks & Evening Snacks (26 more to hit 110 total)
  const quickEveningItems = [
    { name: "Warm Steamed Edamame with Sesame", sub: "Quick Snacks", ing: "edamame", qty: 1.5, unit: "cup", extra: "sesame_oil", img: "/images/food/veggies-hummus.jpg" },
    { name: "Hard-Boiled Eggs & Whole-Grain Toast Soldiers", sub: "Evening Snacks", ing: "egg_whole", qty: 2, unit: "egg", extra: "whole_wheat_bread", img: "/images/food/avocado-toast.jpg" },
    { name: "Roasted Turkey Roll-Ups with Cucumber & Hummus", sub: "Quick Snacks", ing: "turkey_breast", qty: 4, unit: "oz", extra: "hummus", img: "/images/food/wrap-sandwich.jpg" },
    { name: "Warm Almond Milk & Chia Evening Pudding", sub: "Evening Snacks", ing: "chia_seeds", qty: 3, unit: "tbsp", extra: "unsweetened_almond_milk", img: "/images/food/oats-berries.jpg" },
    { name: "Whole-Grain Toast with Peanut Butter & Chia", sub: "Evening Snacks", ing: "whole_wheat_bread", qty: 2, unit: "slice", extra: "peanut_butter", img: "/images/food/avocado-toast.jpg" },
    { name: "Crispy Roasted Chickpeas with Rosemary", sub: "Quick Snacks", ing: "chickpeas", qty: 1.5, unit: "cup", extra: "olive_oil", img: "/images/food/veggies-hummus.jpg" },
    { name: "Greek Yogurt & Almond Butter Bedtime Swirl", sub: "Evening Snacks", ing: "greek_yogurt_plain", qty: 1, unit: "cup", extra: "almond_butter", img: "/images/food/greek-yogurt.jpg" },
    { name: "Smashed Avocado & Feta Rice-Cake/Toast Bite", sub: "Quick Snacks", ing: "avocado", qty: 1, unit: "piece", extra: "feta_pasteurized", img: "/images/food/avocado-toast.jpg" },
    { name: "Cottage Cheese & Almond Evening Mini-Bowl", sub: "Evening Snacks", ing: "cottage_cheese", qty: 1, unit: "cup", extra: "almonds", img: "/images/food/greek-yogurt.jpg" },
    { name: "Sliced Bell Pepper & Pasteurized Cheddar Plate", sub: "Quick Snacks", ing: "bell_pepper", qty: 2, unit: "piece", extra: "cheddar_pasteurized", img: "/images/food/veggies-hummus.jpg" },
    { name: "Warm Cinnamon Oats & Walnut Bedtime Cup", sub: "Evening Snacks", ing: "rolled_oats", qty: 0.5, unit: "cup", extra: "walnuts", img: "/images/food/oats-berries.jpg" },
    { name: "Tuna & Avocado Cucumber Rounds", sub: "Quick Snacks", ing: "canned_light_tuna", qty: 1, unit: "can", extra: "cucumber", img: "/images/food/veggies-hummus.jpg" },
    { name: "Apple, Sharp Cheddar & Pumpkin Seed Plate", sub: "Evening Snacks", ing: "apple", qty: 1, unit: "piece", extra: "cheddar_pasteurized", img: "/images/food/oats-berries.jpg" },
  ];

  for (let v = 0; v < 2; v++) {
    for (const item of quickEveningItems) {
      const suffix = v === 0 ? "" : " (Family Portion)";
      recipes.push({
        id: `sn-qe-${idx}`,
        slug: slugify(`${item.name}${suffix}-${idx}`),
        name: `${item.name}${suffix}`,
        description: `Simple, balanced ${item.sub.toLowerCase()} pairing quality protein, fiber, and healthy fats in minutes.`,
        mealCategory: "snack",
        primarySubcategory: item.sub,
        subcategories: ["Quick Snacks", "Evening Snacks"],
        imageUrl: item.img,
        cuisine: "American",
        difficulty: "Easy",
        prepTimeMin: 5,
        cookTimeMin: item.ing === "edamame" || item.ing === "egg_whole" || item.ing === "chickpeas" ? 8 : 0,
        servings: v === 0 ? 2 : 4,
        ingredients: [
          { ingredientId: item.ing, displayName: item.ing.replace(/_/g, " "), quantity: item.qty * (v + 1), unit: item.unit },
          { ingredientId: item.extra, displayName: item.extra.replace(/_/g, " "), quantity: item.extra === "olive_oil" || item.extra === "sesame_oil" ? 1 : 2, unit: item.extra === "olive_oil" || item.extra === "sesame_oil" ? "tbsp" : item.extra === "whole_wheat_bread" ? "slice" : "tbsp" },
          { ingredientId: "cinnamon_spices", displayName: "seasoning", quantity: 0.5, unit: "tsp" },
        ],
        instructions: [
          { step: 1, instruction: "Prepare and portion ingredients cleanly onto a serving plate or bowl." },
          { step: 2, instruction: item.ing === "egg_whole" ? "Boil eggs 10–11 minutes until yolks are completely firm, peel, and serve." : "Combine ingredients and enjoy fresh." },
        ],
        isFeatured: false,
        popularityScore: 80 - (idx % 10),
        createdAt: isoDaysAgo(idx + 14),
      });
      idx++;
    }
  }

  return recipes;
}
