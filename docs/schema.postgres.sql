-- PostgreSQL / Supabase Production Schema Blueprint for Nourish
-- Mirrors the local SQLite schema in src/db/schema.ts

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  meal_category TEXT NOT NULL CHECK (meal_category IN ('breakfast', 'lunch', 'dinner', 'snack')),
  primary_subcategory TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cuisine TEXT NOT NULL DEFAULT 'American',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Advanced')),
  prep_time_min INTEGER NOT NULL,
  cook_time_min INTEGER NOT NULL,
  total_time_min INTEGER NOT NULL,
  servings INTEGER NOT NULL DEFAULT 2,
  instructions_json JSONB NOT NULL,
  instructions_license_mode TEXT NOT NULL DEFAULT 'original_editorial'
    CHECK (instructions_license_mode IN ('original_editorial', 'licensed_display', 'link_only')),
  health_assessment_json JSONB NOT NULL,
  nutrition_calories REAL NOT NULL,
  nutrition_carbs_g REAL NOT NULL,
  nutrition_protein_g REAL NOT NULL,
  nutrition_fat_g REAL NOT NULL,
  nutrition_fiber_g REAL NOT NULL,
  nutrition_sugar_g REAL NOT NULL,
  nutrition_added_sugar_g REAL,
  nutrition_sodium_mg REAL NOT NULL,
  nutrition_calcium_mg REAL NOT NULL DEFAULT 0,
  nutrition_iron_mg REAL NOT NULL DEFAULT 0,
  nutrition_folate_mcg REAL NOT NULL DEFAULT 0,
  nutrition_is_estimated BOOLEAN NOT NULL DEFAULT TRUE,
  nutrition_source TEXT NOT NULL,
  pregnancy_safety_status TEXT NOT NULL
    CHECK (pregnancy_safety_status IN ('reviewed_safe', 'caution_modification', 'flagged_unsafe', 'needs_review')),
  pregnancy_safety_notes TEXT NOT NULL,
  cooking_temp_guidance TEXT,
  source_name TEXT NOT NULL,
  source_attribution TEXT NOT NULL,
  source_url TEXT,
  license_type TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  popularity_score INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes (meal_category, primary_subcategory);
CREATE INDEX IF NOT EXISTS idx_recipes_time ON recipes (total_time_min);
CREATE INDEX IF NOT EXISTS idx_recipes_macros ON recipes (nutrition_protein_g, nutrition_carbs_g, nutrition_fiber_g);
CREATE INDEX IF NOT EXISTS idx_recipes_safety ON recipes (pregnancy_safety_status);

CREATE TABLE IF NOT EXISTS recipe_subcategories (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  subcategory TEXT NOT NULL,
  PRIMARY KEY (recipe_id, subcategory)
);

CREATE TABLE IF NOT EXISTS recipe_classifications (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  classification TEXT NOT NULL,
  PRIMARY KEY (recipe_id, classification)
);

CREATE TABLE IF NOT EXISTS ingredients_catalog (
  id TEXT PRIMARY KEY,
  canonical_name TEXT UNIQUE NOT NULL,
  synonyms_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL,
  usda_fdc_id INTEGER
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id BIGSERIAL PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients_catalog(id),
  display_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  gram_weight REAL NOT NULL,
  preparation_note TEXT,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ing ON recipe_ingredients (ingredient_id);

CREATE TABLE IF NOT EXISTS favorites (
  recipe_id TEXT PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id BIGSERIAL PRIMARY KEY,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  servings_multiplier REAL NOT NULL DEFAULT 1.0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_list_checks (
  item_key TEXT PRIMARY KEY,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

