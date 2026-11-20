# Nourish — Pregnancy & Blood-Sugar-Conscious Recipe Platform

Nourish is a full-stack recipe discovery, nutrition transparency, ingredient-matching, and meal-planning web application designed to help families prepare balanced, nutritious meals with pregnancy food-safety mindfulness.

## Features

- **750+ Curated Recipes** across Breakfast (210+), Lunch (214+), Dinner (216+ across 18 subcategories), and Snacks (110+)
- **What's in Your Fridge?** ingredient matcher (`Use What I Have`, `Best Match`, `Almost There`) with case-insensitive & synonym-aware matching
- **USDA Reference Nutrition** calculated deterministically from ingredient gram weights (labeled as estimated per serving)
- **Pregnancy Food-Safety Engine** aligned with FDA/EPA mercury guidance, dairy pasteurization, and CDC/ACOG internal cooking temperatures
- **Interactive Recipe Pages** with adjustable servings, ingredient checklist, nutritional breakdown, and balanced food assessment
- **Weekly Meal Planner & Consolidated Shopping List** plus **Favorites** persisted in SQLite

## Local Development

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:3000`.

Run tests and production build:

```bash
npm test
npm run build
```

## Deploying to Render

This repository includes a `render.yaml` Blueprint:

1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint** (or **Web Service**).
2. Connect the `Mustardandman/Healthy-Kitchen` GitHub repository.
3. Render automatically reads `render.yaml`:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`
   - **Environment**: `NODE_VERSION=22.14.0`, `NOURISH_DB_PATH=/tmp/nourish.db`
4. On first startup, Nourish automatically seeds all 750 recipes into SQLite.
   - *Optional persistence*: If upgrading from Render's Free plan to Starter, attach a persistent disk at `/var/data` and update `NOURISH_DB_PATH` to `/var/data/nourish.db` so Favorites and Meal Plans persist across restarts.
   - *Optional external APIs*: Add `USDA_FDC_API_KEY`, `EDAMAM_APP_ID` / `EDAMAM_APP_KEY`, or `SPOONACULAR_API_KEY` in Render's Environment Variables tab.

## Disclaimer

Nourish provides general culinary and estimated nutritional information and is not a medical device or medical provider. Always follow individualized recommendations from your OB/GYN, diabetes care team, or registered dietitian.

