import { USDA_INGREDIENTS } from "@/data/usda-ingredients";
import type { PregnancySafetyStatus } from "@/types/recipe";
import type { RawIngredientInput } from "@/lib/nutrition";

export interface PregnancySafetyEvaluation {
  status: PregnancySafetyStatus;
  notes: string;
  cookingTempGuidance: string | null;
  flags: string[];
}

const HIGH_MERCURY_KEYWORDS = [
  "king mackerel",
  "marlin",
  "orange roughy",
  "shark",
  "swordfish",
  "tilefish",
  "bigeye tuna",
  "ahi tuna",
];

const UNPASTEURIZED_KEYWORDS = [
  "raw milk",
  "unpasteurized",
  "queso fresco",
  "brie",
  "camembert",
  "roquefort",
  "blue cheese",
];

const RAW_PREPARATION_KEYWORDS = [
  "raw egg",
  "runny yolk",
  "poached soft",
  "sunny side up",
  "tartare",
  "ceviche",
  "sashimi",
  "sushi",
  "carpaccio",
  "rare steak",
  "medium-rare",
  "raw sprouts",
  "alfalfa sprouts",
];

const SMOKED_SEAFOOD_KEYWORDS = ["smoked salmon", "lox", "nova salmon", "kippered"];
const DELI_MEAT_KEYWORDS = ["deli ham", "deli turkey", "salami", "prosciutto", "bologna", "hot dog"];

export function evaluatePregnancySafety(params: {
  ingredients: RawIngredientInput[];
  instructionsText: string;
}): PregnancySafetyEvaluation {
  const { ingredients, instructionsText } = params;
  const combinedText = [
    ...ingredients.map((i) => `${i.displayName ?? ""} ${i.preparationNote ?? ""} ${i.ingredientId}`),
    instructionsText,
  ]
    .join(" ")
    .toLowerCase();

  const flags: string[] = [];
  const tempNotes: string[] = [];
  let hasPoultry = false;
  let hasGroundMeat = false;
  let hasBeefOrPorkCut = false;
  let hasSeafood = false;
  let hasEgg = false;
  let hasDairy = false;

  for (const item of ingredients) {
    const ref = USDA_INGREDIENTS[item.ingredientId];
    if (!ref) continue;
    if (ref.tags.includes("poultry")) hasPoultry = true;
    if (ref.tags.includes("seafood")) hasSeafood = true;
    if (ref.tags.includes("egg")) hasEgg = true;
    if (ref.tags.includes("dairy")) hasDairy = true;
    if (item.ingredientId === "lean_ground_beef" || item.ingredientId === "ground_turkey") {
      hasGroundMeat = true;
    }
    if (item.ingredientId === "beef_sirloin" || item.ingredientId === "pork_tenderloin") {
      hasBeefOrPorkCut = true;
    }
    if (ref.tags.includes("seafood_avoid_mercury")) {
      flags.push(`High-mercury fish detected (${ref.canonicalName}); avoid during pregnancy.`);
    }
  }

  const hasWord = (kw: string) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`\\b${escaped}\\b`, "i").test(combinedText);
  };

  for (const kw of HIGH_MERCURY_KEYWORDS) {
    if (hasWord(kw)) {
      flags.push(`Contains high-mercury fish (${kw}); FDA/EPA recommends avoiding during pregnancy.`);
    }
  }

  for (const kw of UNPASTEURIZED_KEYWORDS) {
    if (hasWord(kw) && !hasWord("pasteurized")) {
      flags.push(`May contain unpasteurized dairy (${kw}); verify "made with pasteurized milk" on the label.`);
    }
  }

  for (const kw of RAW_PREPARATION_KEYWORDS) {
    if (hasWord(kw)) {
      flags.push(`Preparation mentions "${kw}"; cook eggs, meats, seafood, and sprouts thoroughly during pregnancy.`);
    }
  }

  for (const kw of SMOKED_SEAFOOD_KEYWORDS) {
    if (hasWord(kw)) {
      flags.push(`Refrigerated smoked seafood (${kw}) must be heated to 165°F (74°C) in a cooked dish or substituted with cooked salmon.`);
    }
  }

  for (const kw of DELI_MEAT_KEYWORDS) {
    if (hasWord(kw)) {
      flags.push(`Cold deli or cured meat (${kw}) should be heated until steaming hot (165°F / 74°C) or replaced with freshly cooked poultry.`);
    }
  }

  if (hasPoultry || hasGroundMeat) {
    tempNotes.push("Cook poultry and ground meats to an internal temperature of 165°F (74°C) for poultry / 160°F (71°C) for ground beef.");
  } else if (hasBeefOrPorkCut) {
    tempNotes.push("Cook whole beef or pork cuts to at least 145°F (63°C) with a 3-minute rest.");
  }

  if (hasSeafood) {
    tempNotes.push("Cook finfish to 145°F (63°C) until opaque and flaking easily, and shrimp until pearly and opaque. Uses FDA/EPA Best Choices low-mercury seafood.");
  }

  if (hasEgg) {
    tempNotes.push("Cook eggs thoroughly until both whites and yolks are firm (160°F / 71°C for egg dishes).");
  }

  if (hasDairy) {
    tempNotes.push("Use pasteurized milk, yogurt, cottage cheese, and cheeses.");
  }

  let status: PregnancySafetyStatus = "reviewed_safe";
  if (flags.some((f) => f.includes("High-mercury") || f.includes("high-mercury"))) {
    status = "flagged_unsafe";
  } else if (flags.length > 0) {
    status = "caution_modification";
  }

  const notes =
    flags.length > 0
      ? flags.join(" ")
      : "Prepared with pregnancy-friendly whole foods, pasteurized dairy (where used), low-mercury seafood (where used), and thorough cooking temperatures.";

  return {
    status,
    notes,
    cookingTempGuidance: tempNotes.length > 0 ? tempNotes.join(" ") : null,
    flags,
  };
}

