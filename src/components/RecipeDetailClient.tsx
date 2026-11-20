"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/categories";
import { formatMinutes, formatQuantity, formatSafetyLabel } from "@/lib/format";
import type { DayOfWeek, MealCategory, RecipeDetail } from "@/types/recipe";

interface RecipeDetailClientProps {
  recipe: RecipeDetail;
}

export function RecipeDetailClient({ recipe }: RecipeDetailClientProps) {
  const [imgSrc, setImgSrc] = useState(recipe.image_url);
  const [servings, setServings] = useState(recipe.servings);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isFavorited, setIsFavorited] = useState(Boolean(recipe.is_favorited));
  const [plannerDay, setPlannerDay] = useState<DayOfWeek>("monday");
  const [plannerSlot, setPlannerSlot] = useState<MealCategory>(recipe.meal_category);
  const [plannerSavedMsg, setPlannerSavedMsg] = useState<string | null>(null);
  const [savingPlanner, setSavingPlanner] = useState(false);

  const multiplier = servings / Math.max(1, recipe.servings);
  const safetyMeta = formatSafetyLabel(recipe.pregnancy_safety_status);

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleToggleFavorite = async () => {
    const nextState = !isFavorited;
    setIsFavorited(nextState);
    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
    } catch {
      setIsFavorited(!nextState);
    }
  };

  const handleAddToMealPlan = async () => {
    setSavingPlanner(true);
    setPlannerSavedMsg(null);
    try {
      const res = await fetch("/api/meal-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: plannerDay,
          mealSlot: plannerSlot,
          recipeId: recipe.id,
          servingsMultiplier: multiplier,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const dayLabel = DAYS_OF_WEEK.find((d) => d.key === plannerDay)?.label ?? plannerDay;
      setPlannerSavedMsg(`Added to ${dayLabel}`);
    } catch {
      setPlannerSavedMsg("Could not add to meal planner.");
    } finally {
      setSavingPlanner(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Simple Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/${recipe.meal_category === "snack" ? "snacks" : recipe.meal_category}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#777F78] hover:text-[#292D2A]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="capitalize">
            {recipe.meal_category === "snack" ? "Snacks" : recipe.meal_category}
          </span>
        </Link>
      </div>

      {/* Clean Hero */}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#E4E7E4] bg-[#F7F8F7] lg:col-span-6">
          <Image
            src={imgSrc}
            alt={recipe.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            onError={() => setImgSrc("/images/food/grain-bowl.jpg")}
          />
        </div>

        <div className="space-y-5 lg:col-span-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#E7EFE7] px-3 py-1 text-xs font-medium text-[#3D5441]">
              {recipe.classifications[0] ?? "Balanced Nutrition"}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                safetyMeta.tone === "safe"
                  ? "bg-[#F7F8F7] text-[#3D5441]"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {safetyMeta.tone === "safe" ? (
                <ShieldCheck className="h-3.5 w-3.5 text-[#78947C]" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {safetyMeta.label}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#292D2A] sm:text-4xl">
            {recipe.name}
          </h1>

          <p className="text-sm leading-relaxed text-[#777F78] sm:text-base">
            {recipe.description}
          </p>

          {/* Compact Key Facts */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[#E4E7E4] py-3.5 text-sm text-[#292D2A]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#78947C]" />
              <strong>{formatMinutes(recipe.total_time_min)}</strong>
              <span className="text-xs text-[#777F78]">
                ({recipe.prep_time_min}m prep / {recipe.cook_time_min}m cook)
              </span>
            </span>
            <span>
              <strong>{servings}</strong> servings
            </span>
            <span>
              <strong>{recipe.difficulty}</strong>
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isFavorited
                    ? "bg-[#78947C] text-white"
                    : "border border-[#DCE2DC] bg-white text-[#292D2A] hover:border-[#78947C]"
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                <span>{isFavorited ? "Saved" : "Save Recipe"}</span>
              </button>

              <select
                aria-label="Select day of week"
                value={plannerDay}
                onChange={(e) => setPlannerDay(e.target.value as DayOfWeek)}
                className="rounded-full border border-[#DCE2DC] bg-[#F7F8F7] px-3 py-2 text-xs font-medium text-[#292D2A]"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select meal slot"
                value={plannerSlot}
                onChange={(e) => setPlannerSlot(e.target.value as MealCategory)}
                className="rounded-full border border-[#DCE2DC] bg-[#F7F8F7] px-3 py-2 text-xs font-medium text-[#292D2A]"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>

              <button
                type="button"
                disabled={savingPlanner}
                onClick={handleAddToMealPlan}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#78947C] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#647F68] disabled:opacity-50"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                <span>Add to Plan</span>
              </button>
            </div>
            {plannerSavedMsg && (
              <p className="text-xs font-medium text-[#557059]">{plannerSavedMsg}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        {/* Left: Ingredients & Nutrition */}
        <div className="space-y-8 lg:col-span-5">
          <section className="rounded-2xl border border-[#E4E7E4] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#292D2A]">Ingredients</h2>
              <div className="flex items-center gap-2 rounded-full border border-[#DCE2DC] bg-[#F7F8F7] px-2 py-1">
                <button
                  type="button"
                  aria-label="Decrease servings"
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#292D2A] shadow-sm"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-2 text-xs font-semibold text-[#292D2A]">
                  {servings} serv.
                </span>
                <button
                  type="button"
                  aria-label="Increase servings"
                  onClick={() => setServings((s) => Math.min(16, s + 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#292D2A] shadow-sm"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            <ul className="mt-4 divide-y divide-[#F2F4F2]">
              {recipe.ingredients.map((ing, idx) => {
                const checked = checkedIngredients.has(idx);
                const scaledQty = ing.quantity * multiplier;
                return (
                  <li key={`${ing.ingredient_id}-${idx}`} className="py-2.5">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIngredient(idx)}
                        className="mt-1 h-4 w-4 accent-[#78947C]"
                      />
                      <span
                        className={`text-sm ${
                          checked ? "text-[#777F78] line-through" : "text-[#292D2A]"
                        }`}
                      >
                        <strong className="font-semibold">
                          {formatQuantity(scaledQty)} {ing.unit}
                        </strong>{" "}
                        {ing.display_name}
                        {ing.preparation_note ? (
                          <span className="text-[#777F78]"> ({ing.preparation_note})</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Clean Nutrition Table */}
          <section className="rounded-2xl border border-[#E4E7E4] bg-[#F7F8F7] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#292D2A]">Nutrition Per Serving</h2>
              <span className="text-[11px] font-medium text-[#777F78]">
                {recipe.nutrition.is_estimated ? "USDA Estimated" : "Verified"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[
                { label: "Calories", val: `${recipe.nutrition.calories} kcal` },
                { label: "Carbohydrates", val: `${recipe.nutrition.carbs_g} g` },
                { label: "Protein", val: `${recipe.nutrition.protein_g} g` },
                { label: "Dietary Fiber", val: `${recipe.nutrition.fiber_g} g` },
                { label: "Total Fat", val: `${recipe.nutrition.fat_g} g` },
                { label: "Total Sugar", val: `${recipe.nutrition.sugar_g} g` },
                {
                  label: "Added Sugar",
                  val:
                    recipe.nutrition.added_sugar_g !== null
                      ? `${recipe.nutrition.added_sugar_g} g`
                      : "N/A",
                },
                { label: "Sodium", val: `${recipe.nutrition.sodium_mg} mg` },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs border border-[#E4E7E4]"
                >
                  <span className="text-[#777F78]">{row.label}</span>
                  <strong className="font-semibold text-[#292D2A]">{row.val}</strong>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-[#777F78]">
              Calcium {recipe.nutrition.calcium_mg}mg • Iron {recipe.nutrition.iron_mg}mg • Folate{" "}
              {recipe.nutrition.folate_mcg}mcg
            </p>
          </section>
        </div>

        {/* Right: Instructions, Pregnancy Safety & Assessment */}
        <div className="space-y-8 lg:col-span-7">
          <section className="rounded-2xl border border-[#E4E7E4] bg-white p-6">
            <h2 className="text-lg font-bold text-[#292D2A]">Instructions</h2>

            {recipe.instructions_license_mode === "link_only" && recipe.source_url ? (
              <div className="mt-4 rounded-xl bg-[#F7F8F7] p-5">
                <p className="text-sm text-[#292D2A]">
                  Preparation steps are hosted by <strong>{recipe.source_name}</strong>.
                </p>
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#78947C] px-4 py-2 text-sm font-medium text-white hover:bg-[#647F68]"
                >
                  <span>View Instructions</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <ol className="mt-4 space-y-4">
                {recipe.instructions.map((step) => (
                  <li key={step.step} className="flex gap-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7EFE7] text-xs font-bold text-[#3D5441]">
                      {step.step}
                    </span>
                    <div className="space-y-1.5">
                      <p className="text-sm leading-relaxed text-[#292D2A] sm:text-base">
                        {step.instruction}
                      </p>
                      {step.temperature_note && (
                        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#557059]">
                          <Thermometer className="h-3.5 w-3.5 text-[#78947C]" />
                          <span>{step.temperature_note}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-[#DCE4DD] bg-[#E7EFE7]/40 p-6 space-y-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#292D2A]">
              <ShieldCheck className="h-4 w-4 text-[#557059]" />
              <span>Pregnancy Food Safety</span>
            </h2>
            <p className="text-sm leading-relaxed text-[#292D2A]">
              {recipe.pregnancy_safety_notes}
            </p>
            {recipe.cooking_temp_guidance && (
              <p className="text-xs leading-relaxed text-[#575E58]">
                {recipe.cooking_temp_guidance}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#E4E7E4] bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-[#292D2A]">Nutritional Notes</h2>

            <ul className="space-y-1.5 text-sm text-[#292D2A]">
              {recipe.health_assessment.nutritiousHighlights.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#78947C]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="grid gap-4 border-t border-[#F0F2F0] pt-4 text-xs leading-relaxed text-[#575E58] sm:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-[#292D2A]">Considerations</p>
                {recipe.health_assessment.potentialDrawbacks.map((item, i) => (
                  <p key={i}>• {item}</p>
                ))}
              </div>
              <div>
                <p className="mb-1 font-semibold text-[#292D2A]">Possible Substitutions</p>
                {recipe.health_assessment.substitutions.map((item, i) => (
                  <p key={i}>• {item}</p>
                ))}
              </div>
            </div>

            <div className="border-t border-[#F0F2F0] pt-3 text-[11px] leading-relaxed text-[#777F78]">
              <p>
                {recipe.source_attribution} • Individual glycemic responses vary; follow guidance from your OB/GYN, diabetes specialist, or registered dietitian.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
