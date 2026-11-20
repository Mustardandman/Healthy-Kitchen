import type { RecipeSeedBlueprint } from "@/data/recipe-corpus-breakfast-snack";
import type { Difficulty } from "@/types/recipe";

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

export function buildLunchRecipes(): RecipeSeedBlueprint[] {
  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;

  // 1. Protein + Format Matrix for Chicken, Turkey, Beef, Seafood across Salads, Wraps, Sandwiches, Grain Bowls, Meal Prep, Quick Lunches
  const proteins = [
    { id: "chicken_breast", label: "Herb Chicken", sub: "Chicken", qty: 10, unit: "oz", temp: "165°F (74°C)", img: "/images/food/chicken-salad-bowl.jpg" },
    { id: "turkey_breast", label: "Roasted Turkey", sub: "Turkey", qty: 10, unit: "oz", temp: "165°F (74°C)", img: "/images/food/wrap-sandwich.jpg" },
    { id: "beef_sirloin", label: "Seared Sirloin", sub: "Beef", qty: 10, unit: "oz", temp: "145°F (63°C)", img: "/images/food/asian-stirfry.jpg" },
    { id: "salmon_fillet", label: "Flaked Wild Salmon", sub: "Seafood", qty: 10, unit: "oz", temp: "145°F (63°C)", img: "/images/food/salmon-dinner.jpg" },
    { id: "canned_light_tuna", label: "Light Skipjack Tuna", sub: "Seafood", qty: 2, unit: "can", temp: "chilled or heated", img: "/images/food/chicken-salad-bowl.jpg" },
    { id: "ground_turkey", label: "Spiced Ground Turkey", sub: "Turkey", qty: 10, unit: "oz", temp: "165°F (74°C)", img: "/images/food/grain-bowl.jpg" },
  ];

  const formats = [
    {
      format: "Salads",
      nameSuffix: "Power Salad",
      baseId: "romaine_lettuce",
      baseQty: 4,
      baseUnit: "cup",
      grainId: "chickpeas",
      grainQty: 0.75,
      grainUnit: "cup",
      prep: 10,
      cook: 10,
      imgOverride: "/images/food/chicken-salad-bowl.jpg",
    },
    {
      format: "Wraps",
      nameSuffix: "Hummus Wrap",
      baseId: "whole_wheat_tortilla",
      baseQty: 2,
      baseUnit: "wrap",
      grainId: "hummus",
      grainQty: 0.25,
      grainUnit: "cup",
      prep: 8,
      cook: 8,
      imgOverride: "/images/food/wrap-sandwich.jpg",
    },
    {
      format: "Sandwiches",
      nameSuffix: "Whole-Grain Sandwich",
      baseId: "whole_wheat_bread",
      baseQty: 4,
      baseUnit: "slice",
      grainId: "avocado",
      grainQty: 1,
      grainUnit: "piece",
      prep: 8,
      cook: 6,
      imgOverride: "/images/food/wrap-sandwich.jpg",
    },
    {
      format: "Grain Bowls",
      nameSuffix: "Quinoa & Veggie Bowl",
      baseId: "quinoa_cooked",
      baseQty: 1.5,
      baseUnit: "cup",
      grainId: "black_beans",
      grainQty: 0.75,
      grainUnit: "cup",
      prep: 10,
      cook: 12,
      imgOverride: "/images/food/grain-bowl.jpg",
    },
    {
      format: "Meal Prep",
      nameSuffix: "Farro Meal-Prep Box",
      baseId: "farro_cooked",
      baseQty: 1.5,
      baseUnit: "cup",
      grainId: "edamame",
      grainQty: 0.75,
      grainUnit: "cup",
      prep: 12,
      cook: 14,
      imgOverride: "/images/food/grain-bowl.jpg",
    },
    {
      format: "Quick Lunches",
      nameSuffix: "15-Minute Bistro Plate",
      baseId: "spinach",
      baseQty: 3,
      baseUnit: "cup",
      grainId: "cannellini_beans",
      grainQty: 0.75,
      grainUnit: "cup",
      prep: 7,
      cook: 8,
      imgOverride: "/images/food/chicken-salad-bowl.jpg",
    },
  ];

  const veggies = [
    { id: "cucumber", label: "Cucumber" },
    { id: "bell_pepper", label: "Bell Pepper" },
    { id: "tomatoes", label: "Tomato" },
    { id: "broccoli", label: "Roasted Broccoli" },
    { id: "avocado", label: "Avocado" },
  ];

  for (let p = 0; p < proteins.length; p++) {
    for (let f = 0; f < formats.length; f++) {
      for (let v = 0; v < veggies.length; v++) {
        if (recipes.length >= 165) break;
        const pr = proteins[p];
        const fm = formats[f];
        const vg = veggies[v];
        if (fm.grainId === vg.id) continue;

        const name = `${pr.label} & ${vg.label} ${fm.nameSuffix}`;
        const total = fm.prep + fm.cook;
        const subs = [pr.sub, fm.format];
        if (total <= 20 && !subs.includes("Quick Lunches")) subs.push("Quick Lunches");
        if (fm.format === "Meal Prep" || f === 3) {
          if (!subs.includes("Meal Prep")) subs.push("Meal Prep");
        }

        const primary = (idx % 3 === 0) ? fm.format : pr.sub;

        recipes.push({
          id: `ln-main-${idx}`,
          slug: slugify(`${name}-${idx}`),
          name,
          description: `Balanced midday ${fm.format.toLowerCase()} pairing ${pr.label.toLowerCase()} with ${vg.label.toLowerCase()}, fiber-rich legumes or whole grains, and bright lemon-olive dressing.`,
          mealCategory: "lunch",
          primarySubcategory: primary,
          subcategories: subs,
          imageUrl: fm.imgOverride || pr.img,
          cuisine: p === 5 ? "Mexican" : p === 2 ? "Asian" : "Mediterranean",
          difficulty: "Easy",
          prepTimeMin: fm.prep,
          cookTimeMin: fm.cook,
          servings: 2,
          ingredients: [
            { ingredientId: pr.id, displayName: pr.label.toLowerCase(), quantity: pr.qty, unit: pr.unit },
            { ingredientId: fm.baseId, displayName: fm.baseId.replace(/_/g, " "), quantity: fm.baseQty, unit: fm.baseUnit },
            { ingredientId: fm.grainId, displayName: fm.grainId.replace(/_/g, " "), quantity: fm.grainQty, unit: fm.grainUnit },
            { ingredientId: vg.id, displayName: vg.label.toLowerCase(), quantity: vg.id === "avocado" ? 1 : 1, unit: vg.id === "avocado" ? "piece" : "cup" },
            { ingredientId: "olive_oil", displayName: "extra-virgin olive oil", quantity: 1, unit: "tbsp" },
            { ingredientId: "lemon_juice", displayName: "fresh lemon juice", quantity: 1, unit: "tbsp" },
            { ingredientId: "fresh_herbs", displayName: "chopped fresh herbs", quantity: 2, unit: "tbsp" },
          ],
          instructions: [
            {
              step: 1,
              instruction: pr.id === "canned_light_tuna"
                ? "Drain canned light skipjack tuna and flake with lemon juice, olive oil, and herbs."
                : `Season and cook ${pr.label.toLowerCase()} thoroughly in olive oil until safe internal temperature is reached.`,
              temperature_note: pr.id === "canned_light_tuna"
                ? "Uses FDA Best Choices low-mercury light tuna."
                : `Cook thoroughly to ${pr.temp}.`,
            },
            { step: 2, instruction: `Wash and chop ${vg.label.toLowerCase()} and prepare the ${fm.baseId.replace(/_/g, " ")}.` },
            { step: 3, instruction: `Assemble with ${fm.grainId.replace(/_/g, " ")}, drizzle with lemon-olive oil, and serve fresh (or chill in airtight containers for up to 3 days).` },
          ],
          isFeatured: idx <= 3,
          popularityScore: 93 - (idx % 35),
          createdAt: isoDaysAgo(idx),
        });
        idx++;
      }
    }
  }

  // 2. Soups (24 recipes) + Vegetarian Lunches (24 recipes)
  const soupBases = [
    { id: "lentils_cooked", label: "Green Lentil & Spinach", prot: "lentils_cooked", qty: 2, unit: "cup", veg: true },
    { id: "chicken_breast", label: "Chicken, White Bean & Kale", prot: "cannellini_beans", qty: 1, unit: "cup", veg: false },
    { id: "ground_turkey", label: "Turkey & Black Bean Vegetable", prot: "black_beans", qty: 1, unit: "cup", veg: false },
    { id: "chickpeas", label: "Tuscan Chickpea & Farro", prot: "farro_cooked", qty: 1, unit: "cup", veg: true },
    { id: "lean_ground_beef", label: "Lean Beef, Barley & Carrot", prot: "farro_cooked", qty: 1, unit: "cup", veg: false },
    { id: "cod_fillet", label: "Mediterranean Cod & Tomato", prot: "cannellini_beans", qty: 1, unit: "cup", veg: false },
  ];
  const soupVeggies = ["carrots", "zucchini", "butternut_squash", "broccoli"];

  for (const sb of soupBases) {
    for (const sv of soupVeggies) {
      const name = `${sb.label} ${sv.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())} Soup`;
      const subs = ["Soups", "Meal Prep"];
      if (sb.veg) subs.push("Vegetarian");
      if (sb.id === "chicken_breast") subs.push("Chicken");
      if (sb.id === "ground_turkey") subs.push("Turkey");
      if (sb.id === "lean_ground_beef") subs.push("Beef");
      if (sb.id === "cod_fillet") subs.push("Seafood");

      recipes.push({
        id: `ln-soup-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Simmered, comforting ${name.toLowerCase()} packed with plant fiber, broth hydration, and steady protein.`,
        mealCategory: "lunch",
        primarySubcategory: "Soups",
        subcategories: subs,
        imageUrl: "/images/food/soup-bowl.jpg",
        cuisine: "Mediterranean",
        difficulty: "Easy",
        prepTimeMin: 10,
        cookTimeMin: 25,
        servings: 4,
        ingredients: [
          { ingredientId: sb.id, displayName: sb.id.replace(/_/g, " "), quantity: sb.id.includes("cooked") || sb.id === "chickpeas" ? 2 : 12, unit: sb.id.includes("cooked") || sb.id === "chickpeas" ? "cup" : "oz" },
          { ingredientId: sb.prot, displayName: sb.prot.replace(/_/g, " "), quantity: sb.qty, unit: sb.unit },
          { ingredientId: sv, displayName: sv.replace(/_/g, " "), quantity: 1.5, unit: "cup" },
          { ingredientId: "chicken_broth", displayName: "low-sodium broth", quantity: 4, unit: "cup" },
          { ingredientId: "onion", displayName: "diced onion", quantity: 1, unit: "piece" },
          { ingredientId: "garlic", displayName: "minced garlic", quantity: 3, unit: "clove" },
          { ingredientId: "spinach", displayName: "baby spinach", quantity: 2, unit: "cup" },
          { ingredientId: "olive_oil", displayName: "olive oil", quantity: 1, unit: "tbsp" },
        ],
        instructions: [
          { step: 1, instruction: "Sauté onion, garlic, and diced vegetables in olive oil for 5 minutes." },
          { step: 2, instruction: "Add protein, legumes/grains, and low-sodium broth; bring to a boil then simmer 18–20 minutes until tender." },
          {
            step: 3,
            instruction: "Stir in baby spinach until wilted and serve piping hot.",
            temperature_note: "Reheat leftover soups to a rolling simmer (165°F / 74°C) before eating during pregnancy.",
          },
        ],
        isFeatured: idx === 166,
        popularityScore: 88 - (idx % 20),
        createdAt: isoDaysAgo(idx),
      });
      idx++;
    }
  }

  // Dedicated Vegetarian Lunches (24 more -> total ~210+ Lunch recipes)
  const vegProteins = [
    { id: "firm_tofu", label: "Crispy Sesame Tofu", qty: 10, unit: "oz" },
    { id: "chickpeas", label: "Spiced Roasted Chickpea", qty: 1.5, unit: "cup" },
    { id: "black_beans", label: "Chipotle Black Bean", qty: 1.5, unit: "cup" },
    { id: "edamame", label: "Ginger Edamame", qty: 1.5, unit: "cup" },
    { id: "lentils_cooked", label: "Herbed Lentil", qty: 1.5, unit: "cup" },
    { id: "egg_whole", label: "Hard-Cooked Egg & Feta", qty: 4, unit: "egg" },
  ];
  const vegStyles = [
    { name: "Mediterranean Grain Bowl", base: "quinoa_cooked", sub: "Grain Bowls", img: "/images/food/grain-bowl.jpg" },
    { name: "Harvest Salad", base: "kale", sub: "Salads", img: "/images/food/chicken-salad-bowl.jpg" },
    { name: "Warm Whole-Wheat Wrap", base: "whole_wheat_tortilla", sub: "Wraps", img: "/images/food/wrap-sandwich.jpg" },
    { name: "Tahini Lunch Box", base: "brown_rice_cooked", sub: "Meal Prep", img: "/images/food/grain-bowl.jpg" },
  ];

  for (const vp of vegProteins) {
    for (const vs of vegStyles) {
      const name = `${vp.label} ${vs.name}`;
      recipes.push({
        id: `ln-veg-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Plant-powered lunch featuring ${vp.label.toLowerCase()}, leafy greens, and whole-food complex carbs rich in folate and iron.`,
        mealCategory: "lunch",
        primarySubcategory: "Vegetarian",
        subcategories: ["Vegetarian", vs.sub, "Quick Lunches"],
        imageUrl: vs.img,
        cuisine: vp.id === "firm_tofu" || vp.id === "edamame" ? "Asian" : "Mediterranean",
        difficulty: "Easy",
        prepTimeMin: 10,
        cookTimeMin: 10,
        servings: 2,
        ingredients: [
          { ingredientId: vp.id, displayName: vp.label.toLowerCase(), quantity: vp.qty, unit: vp.unit },
          { ingredientId: vs.base, displayName: vs.base.replace(/_/g, " "), quantity: vs.base === "whole_wheat_tortilla" ? 2 : 1.5, unit: vs.base === "whole_wheat_tortilla" ? "wrap" : "cup" },
          { ingredientId: "bell_pepper", displayName: "sliced bell pepper", quantity: 1, unit: "piece" },
          { ingredientId: "tahini", displayName: "sesame tahini dressing", quantity: 2, unit: "tbsp" },
          { ingredientId: "lemon_juice", displayName: "lemon juice", quantity: 1, unit: "tbsp" },
          { ingredientId: "spinach", displayName: "baby spinach", quantity: 2, unit: "cup" },
        ],
        instructions: [
          { step: 1, instruction: `Prepare ${vp.label.toLowerCase()} cleanly (cook tofu/eggs thoroughly if using).` },
          { step: 2, instruction: "Whisk tahini with lemon juice and 1–2 tbsp warm water into a silky dressing." },
          { step: 3, instruction: `Combine ${vs.base.replace(/_/g, " ")}, spinach, bell pepper, and ${vp.label.toLowerCase()}, then drizzle with tahini dressing.` },
        ],
        isFeatured: false,
        popularityScore: 84 - (idx % 18),
        createdAt: isoDaysAgo(idx),
      });
      idx++;
    }
  }

  return recipes;
}

export function buildDinnerRecipes(): RecipeSeedBlueprint[] {
  const recipes: RecipeSeedBlueprint[] = [];
  let idx = 1;

  // Cover all 18 Dinner Subcategories richly with multi-category tagging!
  const dinnerProteins = [
    { id: "chicken_breast", label: "Herb Chicken Breast", sub: "Chicken", qty: 14, unit: "oz", temp: "165°F (74°C)", img: "/images/food/chicken-salad-bowl.jpg" },
    { id: "chicken_thigh", label: "Garlic Chicken Thigh", sub: "Chicken", qty: 14, unit: "oz", temp: "165°F (74°C)", img: "/images/food/chicken-salad-bowl.jpg" },
    { id: "beef_sirloin", label: "Seared Beef Sirloin", sub: "Beef", qty: 14, unit: "oz", temp: "145°F (63°C)", img: "/images/food/asian-stirfry.jpg" },
    { id: "lean_ground_beef", label: "Lean Beef", sub: "Beef", qty: 14, unit: "oz", temp: "160°F (71°C)", img: "/images/food/soup-bowl.jpg" },
    { id: "ground_turkey", label: "Savory Ground Turkey", sub: "Turkey", qty: 14, unit: "oz", temp: "165°F (74°C)", img: "/images/food/grain-bowl.jpg" },
    { id: "pork_tenderloin", label: "Herb Pork Tenderloin", sub: "Pork", qty: 14, unit: "oz", temp: "145°F (63°C)", img: "/images/food/salmon-dinner.jpg" },
    { id: "salmon_fillet", label: "Wild Salmon", sub: "Seafood", qty: 14, unit: "oz", temp: "145°F (63°C)", img: "/images/food/salmon-dinner.jpg" },
    { id: "cod_fillet", label: "Flaky Cod", sub: "Seafood", qty: 14, unit: "oz", temp: "145°F (63°C)", img: "/images/food/salmon-dinner.jpg" },
    { id: "shrimp", label: "Garlic Shrimp", sub: "Seafood", qty: 14, unit: "oz", temp: "opaque and pearly", img: "/images/food/pasta-bowl.jpg" },
    { id: "firm_tofu", label: "Crispy Tofu", sub: "Vegetarian", qty: 14, unit: "oz", temp: "hot throughout", img: "/images/food/asian-stirfry.jpg" },
    { id: "lentils_cooked", label: "Hearty Lentil", sub: "Vegetarian", qty: 2.5, unit: "cup", temp: "simmered hot", img: "/images/food/soup-bowl.jpg" },
  ];

  const methodsAndCuisines: Array<{
    styleName: string;
    primarySub: string;
    extraSubs: string[];
    cuisine: string;
    grainId: string;
    grainQty: number;
    grainUnit: string;
    prep: number;
    cook: number;
    diff: Difficulty;
    imgOverride?: string;
  }> = [
    { styleName: "Sheet Pan Roast", primarySub: "Sheet Pan Meals", extraSubs: ["Vegetables", "Quick 30-Minute Meals"], cuisine: "American", grainId: "sweet_potato", grainQty: 2, grainUnit: "cup", prep: 10, cook: 20, diff: "Easy", imgOverride: "/images/food/chicken-salad-bowl.jpg" },
    { styleName: "Air Fryer Crisp", primarySub: "Air Fryer", extraSubs: ["Quick 30-Minute Meals"], cuisine: "American", grainId: "quinoa_cooked", grainQty: 2, grainUnit: "cup", prep: 8, cook: 14, diff: "Easy" },
    { styleName: "One-Pot Skillet", primarySub: "One-Pot Meals", extraSubs: ["Quick 30-Minute Meals", "Vegetables"], cuisine: "Mediterranean", grainId: "farro_cooked", grainQty: 2, grainUnit: "cup", prep: 10, cook: 18, diff: "Easy" },
    { styleName: "Slow Cooker Stew", primarySub: "Slow Cooker", extraSubs: ["One-Pot Meals"], cuisine: "American", grainId: "black_beans", grainQty: 1.5, grainUnit: "cup", prep: 12, cook: 240, diff: "Easy", imgOverride: "/images/food/soup-bowl.jpg" },
    { styleName: "Tuscan Marinara Bake", primarySub: "Italian-Inspired", extraSubs: ["Casseroles", "Pasta and Noodles"], cuisine: "Italian", grainId: "whole_wheat_pasta_cooked", grainQty: 3, grainUnit: "cup", prep: 12, cook: 25, diff: "Medium", imgOverride: "/images/food/pasta-bowl.jpg" },
    { styleName: "Fajita Black Bean Skillet", primarySub: "Mexican-Inspired", extraSubs: ["One-Pot Meals", "Quick 30-Minute Meals"], cuisine: "Mexican", grainId: "corn_tortilla", grainQty: 6, grainUnit: "tortilla", prep: 10, cook: 15, diff: "Easy", imgOverride: "/images/food/grain-bowl.jpg" },
    { styleName: "Ginger Sesame Stir-Fry", primarySub: "Asian-Inspired", extraSubs: ["Rice and Grain Dishes", "Quick 30-Minute Meals"], cuisine: "Asian", grainId: "brown_rice_cooked", grainQty: 2.5, grainUnit: "cup", prep: 10, cook: 12, diff: "Easy", imgOverride: "/images/food/asian-stirfry.jpg" },
    { styleName: "Chickpea Pasta Toss", primarySub: "Pasta and Noodles", extraSubs: ["Italian-Inspired", "Quick 30-Minute Meals"], cuisine: "Italian", grainId: "chickpea_pasta_cooked", grainQty: 3, grainUnit: "cup", prep: 8, cook: 15, diff: "Easy", imgOverride: "/images/food/pasta-bowl.jpg" },
    { styleName: "Farro & Herb Pilaf", primarySub: "Rice and Grain Dishes", extraSubs: ["Vegetables"], cuisine: "Mediterranean", grainId: "farro_cooked", grainQty: 2.5, grainUnit: "cup", prep: 10, cook: 22, diff: "Easy", imgOverride: "/images/food/salmon-dinner.jpg" },
    { styleName: "Vegetable Harvest Casserole", primarySub: "Casseroles", extraSubs: ["Vegetables"], cuisine: "American", grainId: "brown_rice_cooked", grainQty: 2, grainUnit: "cup", prep: 15, cook: 30, diff: "Medium", imgOverride: "/images/food/chicken-salad-bowl.jpg" },
  ];

  const dinnerVeggies = [
    { id: "broccoli", label: "Broccoli" },
    { id: "brussels_sprouts", label: "Brussels Sprouts" },
    { id: "asparagus", label: "Asparagus" },
    { id: "bell_pepper", label: "Bell Pepper" },
    { id: "zucchini", label: "Zucchini" },
    { id: "cauliflower", label: "Cauliflower" },
    { id: "green_beans", label: "Green Beans" },
    { id: "spinach", label: "Baby Spinach" },
  ];

  for (let p = 0; p < dinnerProteins.length; p++) {
    for (let m = 0; m < methodsAndCuisines.length; m++) {
      for (let v = 0; v < 2; v++) {
        if (recipes.length >= 210) break;
        const pr = dinnerProteins[p];
        const mc = methodsAndCuisines[m];
        const veg = dinnerVeggies[(p + m + v * 3) % dinnerVeggies.length];

        // Skip odd culinary pairings like cod in a slow cooker stew -> use shrimp/chicken/lentils naturally
        if (mc.primarySub === "Slow Cooker" && (pr.id === "cod_fillet" || pr.id === "shrimp")) {
          continue;
        }

        const name = `${pr.label} & ${veg.label} ${mc.styleName}`;
        const total = mc.prep + mc.cook;
        const subs = Array.from(new Set([mc.primarySub, pr.sub, ...mc.extraSubs]));
        if (total <= 30 && !subs.includes("Quick 30-Minute Meals")) {
          subs.push("Quick 30-Minute Meals");
        }
        if (pr.id === "firm_tofu" || pr.id === "lentils_cooked") {
          if (!subs.includes("Vegetarian")) subs.push("Vegetarian");
        }

        // Balance primarySubcategory rotation so every single one of the 18 subcategories has plenty of primary cards too
        const primary = idx % 2 === 0 ? mc.primarySub : pr.sub;

        const sauceId =
          mc.cuisine === "Italian"
            ? "marinara_sauce"
            : mc.cuisine === "Mexican"
            ? "salsa"
            : mc.cuisine === "Asian"
            ? "soy_sauce_low_sodium"
            : "olive_oil";

        recipes.push({
          id: `dn-main-${idx}`,
          slug: slugify(`${name}-${idx}`),
          name,
          description: `Wholesome family dinner pairing ${pr.label.toLowerCase()} and ${veg.label.toLowerCase()} with ${mc.grainId.replace(/_/g, " ")}—designed for balanced nutrition and steady evening blood sugar.`,
          mealCategory: "dinner",
          primarySubcategory: primary,
          subcategories: subs,
          imageUrl: mc.imgOverride || pr.img,
          cuisine: mc.cuisine,
          difficulty: mc.diff,
          prepTimeMin: mc.prep,
          cookTimeMin: mc.cook,
          servings: 4,
          ingredients: [
            { ingredientId: pr.id, displayName: pr.label.toLowerCase(), quantity: pr.qty, unit: pr.unit },
            { ingredientId: veg.id, displayName: veg.label.toLowerCase(), quantity: 3, unit: "cup" },
            { ingredientId: mc.grainId, displayName: mc.grainId.replace(/_/g, " "), quantity: mc.grainQty, unit: mc.grainUnit },
            { ingredientId: sauceId, displayName: sauceId.replace(/_/g, " "), quantity: sauceId === "soy_sauce_low_sodium" || sauceId === "olive_oil" ? 2 : 1, unit: sauceId === "soy_sauce_low_sodium" || sauceId === "olive_oil" ? "tbsp" : "cup" },
            { ingredientId: "garlic", displayName: "minced garlic", quantity: 3, unit: "clove" },
            { ingredientId: "onion", displayName: "sliced onion", quantity: 1, unit: "piece" },
            { ingredientId: "olive_oil", displayName: "extra-virgin olive oil", quantity: 1.5, unit: "tbsp" },
            { ingredientId: "cinnamon_spices", displayName: "herbs & seasoning", quantity: 1.5, unit: "tsp" },
          ],
          instructions: [
            { step: 1, instruction: `Prep ${veg.label.toLowerCase()}, onion, and garlic; toss with olive oil and seasonings.` },
            {
              step: 2,
              instruction:
                mc.primarySub === "Sheet Pan Meals"
                  ? `Arrange ${pr.label.toLowerCase()} and vegetables on a parchment-lined sheet pan and roast at 400°F until cooked through.`
                  : mc.primarySub === "Air Fryer"
                  ? `Air fry seasoned ${pr.label.toLowerCase()} and ${veg.label.toLowerCase()} at 380°F, shaking halfway through.`
                  : mc.primarySub === "Slow Cooker"
                  ? `Combine all ingredients except delicate greens in a slow cooker and cook on Low 4 hours until tender and steaming.`
                  : `Cook ${pr.label.toLowerCase()} with aromatics in a large skillet or Dutch oven, then add ${veg.label.toLowerCase()} and sauce until tender.`,
              temperature_note: `Ensure ${pr.label.toLowerCase()} reaches ${pr.temp}.`,
            },
            { step: 3, instruction: `Serve family-style alongside ${mc.grainId.replace(/_/g, " ")}.` },
          ],
          isFeatured: idx <= 4,
          popularityScore: 96 - (idx % 35),
          createdAt: isoDaysAgo(idx),
        });
        idx++;
      }
    }
  }

  // Ensure every Dinner subcategory (including Vegetables, Casseroles, Pork, Quick 30-Minute Meals, Asian-Inspired, etc.) exceeds 10+ items by adding 25 targeted specialty recipes
  const extraSpecialties: Array<{
    name: string;
    primary: string;
    subs: string[];
    cuisine: string;
    img: string;
    prep: number;
    cook: number;
    prot: string;
    qty: number;
    unit: string;
    grain: string;
    gQty: number;
    gUnit: string;
    veg: string;
    safetyNote?: string;
  }> = [
    { name: "Eggplant, Chickpea & Spinach Baked Casserole", primary: "Casseroles", subs: ["Casseroles", "Vegetarian", "Vegetables"], cuisine: "Mediterranean", img: "/images/food/pasta-bowl.jpg", prep: 15, cook: 30, prot: "chickpeas", qty: 2, unit: "cup", grain: "quinoa_cooked", gQty: 2, gUnit: "cup", veg: "eggplant" },
    { name: "Roasted Butternut Squash, Kale & Pork Tenderloin", primary: "Pork", subs: ["Pork", "Vegetables", "Sheet Pan Meals"], cuisine: "American", img: "/images/food/salmon-dinner.jpg", prep: 12, cook: 25, prot: "pork_tenderloin", qty: 16, unit: "oz", grain: "farro_cooked", gQty: 2, gUnit: "cup", veg: "butternut_squash" },
    { name: "Miso-Glazed Salmon & Buckwheat Soba Noodles", primary: "Asian-Inspired", subs: ["Asian-Inspired", "Seafood", "Pasta and Noodles", "Quick 30-Minute Meals"], cuisine: "Asian", img: "/images/food/salmon-dinner.jpg", prep: 10, cook: 14, prot: "salmon_fillet", qty: 16, unit: "oz", grain: "soba_noodles_cooked", gQty: 3, gUnit: "cup", veg: "broccoli" },
    { name: "Turkey, Zucchini & Ricotta Whole-Wheat Lasagna Bake", primary: "Casseroles", subs: ["Casseroles", "Turkey", "Italian-Inspired"], cuisine: "Italian", img: "/images/food/pasta-bowl.jpg", prep: 20, cook: 30, prot: "ground_turkey", qty: 16, unit: "oz", grain: "whole_wheat_pasta_cooked", gQty: 3, gUnit: "cup", veg: "zucchini" },
    { name: "Air Fryer Garlic Herb Pork Chops & Green Beans", primary: "Air Fryer", subs: ["Air Fryer", "Pork", "Quick 30-Minute Meals"], cuisine: "American", img: "/images/food/salmon-dinner.jpg", prep: 8, cook: 14, prot: "pork_tenderloin", qty: 16, unit: "oz", grain: "sweet_potato", gQty: 2, gUnit: "cup", veg: "green_beans" },
    { name: "Slow Cooker White Chicken & Cannellini Chili", primary: "Slow Cooker", subs: ["Slow Cooker", "Chicken", "One-Pot Meals"], cuisine: "Mexican", img: "/images/food/soup-bowl.jpg", prep: 12, cook: 240, prot: "chicken_breast", qty: 16, unit: "oz", grain: "cannellini_beans", gQty: 2, gUnit: "cup", veg: "corn_kernels" },
    { name: "Cauliflower, Lentil & Coconut Curry Bowl", primary: "Vegetables", subs: ["Vegetables", "Vegetarian", "One-Pot Meals"], cuisine: "Asian", img: "/images/food/grain-bowl.jpg", prep: 10, cook: 20, prot: "lentils_cooked", qty: 2.5, unit: "cup", grain: "brown_rice_cooked", gQty: 2, gUnit: "cup", veg: "cauliflower" },
    { name: "Soba Noodle & Edamame Sesame Peanut Bowl", primary: "Pasta and Noodles", subs: ["Pasta and Noodles", "Asian-Inspired", "Vegetarian", "Quick 30-Minute Meals"], cuisine: "Asian", img: "/images/food/asian-stirfry.jpg", prep: 10, cook: 10, prot: "edamame", qty: 2, unit: "cup", grain: "soba_noodles_cooked", gQty: 3, gUnit: "cup", veg: "cabbage" },
    { name: "Baked Salmon & Hot-Smoked Dill Quinoa Gratin (Reheated to 165°F)", primary: "Seafood", subs: ["Seafood", "Casseroles", "Rice and Grain Dishes"], cuisine: "American", img: "/images/food/salmon-dinner.jpg", prep: 12, cook: 24, prot: "salmon_fillet", qty: 14, unit: "oz", grain: "quinoa_cooked", gQty: 2, gUnit: "cup", veg: "asparagus", safetyNote: "smoked salmon baked thoroughly to 165°F" },
    { name: "Stuffed Bell Peppers with Lean Beef, Quinoa & Feta", primary: "Beef", subs: ["Beef", "Casseroles", "Vegetables"], cuisine: "Mediterranean", img: "/images/food/grain-bowl.jpg", prep: 15, cook: 28, prot: "lean_ground_beef", qty: 14, unit: "oz", grain: "quinoa_cooked", gQty: 2, gUnit: "cup", veg: "bell_pepper" },
  ];

  for (let pass = 0; pass < 3; pass++) {
    for (const sp of extraSpecialties) {
      if (recipes.length >= 216) break;
      const suffix = pass === 0 ? "" : pass === 1 ? " with Roasted Garlic" : " (Herb Edition)";
      const name = `${sp.name}${suffix}`;
      recipes.push({
        id: `dn-spc-${idx}`,
        slug: slugify(`${name}-${idx}`),
        name,
        description: `Thoughtfully balanced ${sp.primary.toLowerCase()} recipe highlighting ${sp.veg.replace(/_/g, " ")} and ${sp.prot.replace(/_/g, " ")} for steady nourishment.`,
        mealCategory: "dinner",
        primarySubcategory: sp.primary,
        subcategories: sp.subs,
        imageUrl: sp.img,
        cuisine: sp.cuisine,
        difficulty: sp.cook > 35 ? "Medium" : "Easy",
        prepTimeMin: sp.prep,
        cookTimeMin: sp.cook,
        servings: 4,
        ingredients: [
          { ingredientId: sp.prot, displayName: sp.prot.replace(/_/g, " "), quantity: sp.qty, unit: sp.unit, preparationNote: sp.safetyNote },
          { ingredientId: sp.grain, displayName: sp.grain.replace(/_/g, " "), quantity: sp.gQty, unit: sp.gUnit },
          { ingredientId: sp.veg, displayName: sp.veg.replace(/_/g, " "), quantity: 3, unit: "cup" },
          { ingredientId: "olive_oil", displayName: "extra-virgin olive oil", quantity: 1.5, unit: "tbsp" },
          { ingredientId: "garlic", displayName: "minced garlic", quantity: 3, unit: "clove" },
          { ingredientId: "spinach", displayName: "baby spinach", quantity: 2, unit: "cup" },
        ],
        instructions: [
          { step: 1, instruction: `Prepare ${sp.veg.replace(/_/g, " ")} and garlic in olive oil.` },
          { step: 2, instruction: `Cook ${sp.prot.replace(/_/g, " ")} thoroughly until steaming hot throughout and safely cooked.` },
          { step: 3, instruction: `Fold in spinach and serve with ${sp.grain.replace(/_/g, " ")}.` },
        ],
        isFeatured: pass === 0 && idx % 2 === 0,
        popularityScore: 91 - (idx % 20),
        createdAt: isoDaysAgo(idx),
      });
      idx++;
    }
  }

  return recipes;
}
