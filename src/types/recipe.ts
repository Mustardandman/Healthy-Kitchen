export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";

export type Difficulty = "Easy" | "Medium" | "Advanced";

export type PregnancySafetyStatus =
  | "reviewed_safe"
  | "caution_modification"
  | "flagged_unsafe"
  | "needs_review";

export type InstructionsLicenseMode =
  | "original_editorial"
  | "licensed_display"
  | "link_only";

export type HealthClassification =
  | "Blood-Sugar-Conscious"
  | "High Protein"
  | "High Fiber"
  | "Balanced Nutrition"
  | "Whole Grain"
  | "Low Added Sugar"
  | "Pregnancy Food-Safety Reviewed"
  | "Vegetarian"
  | "Quick and Easy"
  | "Dairy-Free"
  | "Gluten-Free";

export interface NutritionInfo {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  added_sugar_g: number | null;
  sodium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  folate_mcg: number;
  is_estimated: boolean;
  source: string;
}

export interface RecipeIngredientItem {
  id?: number;
  ingredient_id: string;
  canonical_name: string;
  display_name: string;
  quantity: number;
  unit: string;
  gram_weight: number;
  preparation_note?: string | null;
  is_optional?: boolean;
  category?: string;
}

export interface RecipeStep {
  step: number;
  instruction: string;
  temperature_note?: string;
}

export interface HealthAssessment {
  nutritiousHighlights: string[];
  potentialDrawbacks: string[];
  substitutions: string[];
}

export interface RecipeCardItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  meal_category: MealCategory;
  primary_subcategory: string;
  subcategories: string[];
  image_url: string;
  cuisine: string;
  difficulty: Difficulty;
  prep_time_min: number;
  cook_time_min: number;
  total_time_min: number;
  servings: number;
  nutrition: NutritionInfo;
  classifications: HealthClassification[];
  pregnancy_safety_status: PregnancySafetyStatus;
  is_featured: boolean;
  popularity_score: number;
  created_at: string;
}

export interface RecipeDetail extends RecipeCardItem {
  ingredients: RecipeIngredientItem[];
  instructions: RecipeStep[];
  instructions_license_mode: InstructionsLicenseMode;
  health_assessment: HealthAssessment;
  pregnancy_safety_notes: string;
  cooking_temp_guidance: string | null;
  source_name: string;
  source_attribution: string;
  source_url: string | null;
  license_type: string;
  is_favorited?: boolean;
}

export type FridgeMatchMode = "use_what_i_have" | "best_match" | "almost_there";

export interface FridgeMatchResult extends RecipeCardItem {
  matched_ingredients: string[];
  missing_ingredients: string[];
  matched_count: number;
  total_ingredients_count: number;
  match_percentage: number;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface MealPlanEntry {
  id: number;
  day_of_week: DayOfWeek;
  meal_slot: MealCategory;
  recipe_id: string;
  servings_multiplier: number;
  added_at: string;
  recipe: RecipeCardItem;
}

export interface ShoppingListItem {
  item_key: string;
  ingredient_id: string;
  display_name: string;
  category: string;
  quantity: number;
  unit: string;
  recipes: string[];
  checked: boolean;
}

export type RecipeSortOption =
  | "relevant"
  | "protein_desc"
  | "fiber_desc"
  | "added_sugar_asc"
  | "time_asc"
  | "recent";

export interface RecipeFilterParams {
  q?: string;
  category?: MealCategory | "";
  subcategory?: string;
  ingredients?: string[];
  maxTime?: number;
  minProtein?: number;
  maxCarbs?: number;
  minFiber?: number;
  maxCalories?: number;
  dietary?: string[];
  safetyStatus?: PregnancySafetyStatus | "";
  classification?: string;
  difficulty?: Difficulty | "";
  cuisine?: string;
  sort?: RecipeSortOption;
  page?: number;
  pageSize?: number;
}

