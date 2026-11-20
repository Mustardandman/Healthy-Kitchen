# Nourish Architecture & Data Governance

## Overview
Nourish is a full-stack Next.js (App Router) + TypeScript + SQLite (FTS5) recipe platform built for families seeking balanced, pregnancy-safe, blood-sugar-conscious meals.

## Stack
- **UI & Server Components**: Next.js 15 App Router, React 19, Tailwind CSS v4
- **Database**: SQLite via `better-sqlite3` (`data/nourish.db`) with WAL mode, relational foreign keys, and FTS5 full-text indexing; PostgreSQL/Supabase schema mirror in `docs/schema.postgres.sql`
- **Nutrition & Classification Engine**: Deterministic per-serving calculation from USDA FoodData Central SR Legacy / Foundation Foods reference data (`src/data/usda-ingredients.ts`, `src/lib/nutrition.ts`)
- **Pregnancy Food-Safety Engine**: Rule-based ingredient & cooking-temperature verifier aligned with FDA/EPA mercury guidance and CDC/ACOG internal temperature recommendations (`src/lib/pregnancy-safety.ts`)
- **External API Integration**: Server-only adapters in `src/lib/providers/` for USDA FoodData Central, Edamam Recipe Search v2, and Spoonacular with strict licensing & caching compliance

## Medical & Nutritional Disclaimer
Nourish provides general culinary and nutritional information calculated from USDA FoodData Central reference values. It is not a medical device, does not replace individualized care from an OB/GYN, endocrinologist, or registered dietitian, and does not guarantee any specific glycemic response.

