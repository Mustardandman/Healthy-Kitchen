import type { MealCategory } from "@/types/recipe";

export interface SubcategoryMeta {
  name: string;
  slug: string;
  description: string;
  accentNote: string;
}

export const MEAL_CATEGORY_LABELS: Record<MealCategory, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export const BREAKFAST_SUBCATEGORIES: SubcategoryMeta[] = [
  { name: "Eggs and Omelets", slug: "eggs-and-omelets", description: "Thoroughly cooked eggs paired with veggies and whole-food fats.", accentNote: "Choline & Protein Rich" },
  { name: "Oatmeal and Overnight Oats", slug: "oatmeal-and-overnight-oats", description: "Soluble-fiber oats balanced with chia, nuts, and Greek yogurt.", accentNote: "Slow-Release Energy" },
  { name: "Greek Yogurt", slug: "greek-yogurt", description: "Pasteurized probiotic yogurt parfaits with berries and seeds.", accentNote: "Calcium & Protein" },
  { name: "Smoothies", slug: "smoothies", description: "Fiber-and-protein-anchored smoothies without blood-sugar spikes.", accentNote: "Balanced Blends" },
  { name: "Breakfast Bowls", slug: "breakfast-bowls", description: "Savory and warm whole-grain bowls built for sustained fullness.", accentNote: "Whole-Food Bowls" },
  { name: "Whole-Grain Toast", slug: "whole-grain-toast", description: "Sprouted and 100% whole-grain toasts topped with protein and healthy fats.", accentNote: "Fiber & Healthy Fats" },
  { name: "Pancakes and Waffles", slug: "pancakes-and-waffles", description: "Oat, almond, and cottage-cheese griddle favorites with low added sugar.", accentNote: "Higher-Protein Griddle" },
  { name: "Breakfast Wraps", slug: "breakfast-wraps", description: "Whole-wheat wraps filled with cooked eggs, beans, and vegetables.", accentNote: "Portable Morning Fuel" },
  { name: "High-Protein Breakfasts", slug: "high-protein-breakfasts", description: "Morning meals delivering 22g+ protein to steady morning glucose.", accentNote: "22g+ Protein" },
  { name: "Quick Breakfasts", slug: "quick-breakfasts", description: "Wholesome 5–15 minute breakfasts for busy mornings.", accentNote: "Under 15 Minutes" },
];

export const LUNCH_SUBCATEGORIES: SubcategoryMeta[] = [
  { name: "Chicken", slug: "chicken", description: "Lean poultry cooked to 165°F in salads, bowls, and warm plates.", accentNote: "Lean Protein" },
  { name: "Turkey", slug: "turkey", description: "Hearty ground and roasted turkey lunches with crisp produce.", accentNote: "Iron & B-Vitamins" },
  { name: "Beef", slug: "beef", description: "Iron-rich lean beef cooked to safe temperatures with colorful veggies.", accentNote: "Heme Iron Rich" },
  { name: "Seafood", slug: "seafood", description: "FDA Best Choices low-mercury fish cooked thoroughly to 145°F.", accentNote: "Omega-3 & Low Mercury" },
  { name: "Salads", slug: "salads", description: "Substantial meal salads anchored with legumes, grains, and protein.", accentNote: "Folate & Fiber" },
  { name: "Wraps", slug: "wraps", description: "High-fiber wraps packed with veggies, hummus, and cooked proteins.", accentNote: "Easy Prep" },
  { name: "Sandwiches", slug: "sandwiches", description: "Whole-grain sandwiches using freshly cooked meats and pasteurized cheeses.", accentNote: "Pregnancy-Safe Deli Alternatives" },
  { name: "Grain Bowls", slug: "grain-bowls", description: "Quinoa, farro, and brown rice bowls layered with roasted vegetables.", accentNote: "Complex Carbs" },
  { name: "Soups", slug: "soups", description: "Comforting lentil, bean, chicken, and vegetable soups.", accentNote: "Hydrating & Warm" },
  { name: "Vegetarian", slug: "vegetarian", description: "Plant-forward lunches built around lentils, chickpeas, tofu, and eggs.", accentNote: "Plant Fiber & Folate" },
  { name: "Meal Prep", slug: "meal-prep", description: "Make-ahead containers that reheat safely to 165°F.", accentNote: "Batch Friendly" },
  { name: "Quick Lunches", slug: "quick-lunches", description: "Nutritious midday meals ready in 20 minutes or less.", accentNote: "Fast Midday Plates" },
];

export const DINNER_SUBCATEGORIES: SubcategoryMeta[] = [
  { name: "Chicken", slug: "chicken", description: "Versatile chicken breasts and thighs cooked to 165°F with balanced sides.", accentNote: "Family Staple" },
  { name: "Beef", slug: "beef", description: "Lean sirloin, flank, and ground beef dinners rich in absorbable iron.", accentNote: "Iron & Zinc" },
  { name: "Turkey", slug: "turkey", description: "Savory turkey meatballs, skillets, and burgers cooked to 165°F.", accentNote: "Lean Comfort" },
  { name: "Pork", slug: "pork", description: "Pork tenderloin and chops cooked to 145°F with fiber-rich pairings.", accentNote: "Thiamin & Protein" },
  { name: "Seafood", slug: "seafood", description: "Salmon, cod, shrimp, and trout dinners following FDA mercury guidance.", accentNote: "DHA & EPA Omega-3" },
  { name: "Pasta and Noodles", slug: "pasta-and-noodles", description: "Whole-wheat, chickpea, and soba noodles loaded with vegetables and protein.", accentNote: "Smart Carb Pairings" },
  { name: "Rice and Grain Dishes", slug: "rice-and-grain-dishes", description: "Brown rice, farro, quinoa, and barley pilafs and risottos.", accentNote: "Whole-Grain Comfort" },
  { name: "Vegetables", slug: "vegetables", description: "Vegetable-forward mains highlighting roasted brassicas, greens, and squash.", accentNote: "Micronutrient Dense" },
  { name: "Vegetarian", slug: "vegetarian", description: "Satisfying meatless dinners with tofu, tempeh, legumes, and paneer.", accentNote: "Plant Protein" },
  { name: "Casseroles", slug: "casseroles", description: "Wholesome baked family dishes heated through to 165°F.", accentNote: "Cozy Family Bakes" },
  { name: "Sheet Pan Meals", slug: "sheet-pan-meals", description: "Minimal-cleanup roasted protein and vegetable dinners on one pan.", accentNote: "One-Pan Ease" },
  { name: "Slow Cooker", slug: "slow-cooker", description: "Hands-off stews, chilis, and braised meats simmered to tenderness.", accentNote: "Set & Simmer" },
  { name: "Air Fryer", slug: "air-fryer", description: "Crisp, quick dinners with minimal oil and even cooking.", accentNote: "Crisp & Fast" },
  { name: "One-Pot Meals", slug: "one-pot-meals", description: "Simmered skillets, curries, and Dutch-oven meals in one vessel.", accentNote: "Minimal Cleanup" },
  { name: "Mexican-Inspired", slug: "mexican-inspired", description: "Black bean bowls, fajitas, and enchilada bakes with fresh salsa and avocado.", accentNote: "Vibrant & Fiber-Rich" },
  { name: "Italian-Inspired", slug: "italian-inspired", description: "Herb-roasted chicken, lentil ragu, and whole-grain Tuscan plates.", accentNote: "Mediterranean Herb" },
  { name: "Asian-Inspired", slug: "asian-inspired", description: "Ginger-garlic stir-fries, miso salmon, and sesame edamame bowls.", accentNote: "Fresh Aromatics" },
  { name: "Quick 30-Minute Meals", slug: "quick-30-minute-meals", description: "Complete, balanced family dinners on the table in 30 minutes or less.", accentNote: "Weeknight Ready" },
];

export const SNACK_SUBCATEGORIES: SubcategoryMeta[] = [
  { name: "Greek Yogurt Snacks", slug: "greek-yogurt-snacks", description: "Creamy protein-rich yogurt dips, bark, and bowls.", accentNote: "Calcium & Probiotics" },
  { name: "Fruit and Protein", slug: "fruit-and-protein", description: "Whole fruit paired with nut butter, cheese, or seeds for steady energy.", accentNote: "Paired Carbohydrates" },
  { name: "Nuts and Seeds", slug: "nuts-and-seeds", description: "Roasted almonds, walnuts, pumpkin seeds, and spiced trail mixes.", accentNote: "Healthy Fats & Magnesium" },
  { name: "Cottage Cheese", slug: "cottage-cheese", description: "Pasteurized cottage cheese paired with savory veggies or berries.", accentNote: "Slow-Digesting Casein" },
  { name: "Vegetables and Dips", slug: "vegetables-and-dips", description: "Crisp vegetables with hummus, white bean dip, or guacamole.", accentNote: "Crunch & Fiber" },
  { name: "Homemade Protein Snacks", slug: "homemade-protein-snacks", description: "No-bake oat bites, egg muffins, and seed bars with minimal added sugar.", accentNote: "Make-Ahead Bites" },
  { name: "Quick Snacks", slug: "quick-snacks", description: "5-minute grab-and-go snacks when pregnancy hunger strikes.", accentNote: "Under 5 Minutes" },
  { name: "Evening Snacks", slug: "evening-snacks", description: "Gentle protein-and-complex-carb bedtime snacks to support overnight balance.", accentNote: "Evening Balance" },
];

export const SUBCATEGORIES_BY_CATEGORY: Record<MealCategory, SubcategoryMeta[]> = {
  breakfast: BREAKFAST_SUBCATEGORIES,
  lunch: LUNCH_SUBCATEGORIES,
  dinner: DINNER_SUBCATEGORIES,
  snack: SNACK_SUBCATEGORIES,
};

export const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
] as const;

export const CLASSIFICATION_OPTIONS = [
  "Blood-Sugar-Conscious",
  "High Protein",
  "High Fiber",
  "Balanced Nutrition",
  "Whole Grain",
  "Low Added Sugar",
  "Pregnancy Food-Safety Reviewed",
  "Vegetarian",
  "Quick and Easy",
  "Dairy-Free",
  "Gluten-Free",
] as const;

