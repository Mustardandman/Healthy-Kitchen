"use client";

import { useCallback, useEffect, useState } from "react";
import { Filter, Loader2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { RecipeCard } from "@/components/RecipeCard";
import { CLASSIFICATION_OPTIONS, SUBCATEGORIES_BY_CATEGORY } from "@/lib/categories";
import {
  FAVORITES_UPDATED_EVENT,
  toggleFavoriteClient,
} from "@/lib/favorites-client";
import type {
  Difficulty,
  MealCategory,
  PregnancySafetyStatus,
  RecipeCardItem,
  RecipeSortOption,
} from "@/types/recipe";

interface CategoryBrowseClientProps {
  fixedCategory?: MealCategory;
  initialSubcategory?: string;
  initialQuery?: string;
  initialSort?: RecipeSortOption;
  initialClassification?: string;
  initialMaxTime?: number;
  initialMinProtein?: number;
  initialSafety?: PregnancySafetyStatus | "";
  initialItems: RecipeCardItem[];
  initialTotal: number;
  initialTotalPages: number;
  initialFavoriteIds: string[];
  subcategoryCounts?: Record<string, number>;
  cuisines: string[];
  showDistinctSubcategoryGrid?: boolean;
}

const DIETARY_OPTIONS = ["Vegetarian", "Dairy-Free", "Gluten-Free", "Low Added Sugar"];

export function CategoryBrowseClient({
  fixedCategory,
  initialSubcategory = "",
  initialQuery = "",
  initialSort = "relevant",
  initialClassification = "",
  initialMaxTime,
  initialMinProtein,
  initialSafety = "",
  initialItems,
  initialTotal,
  initialTotalPages,
  initialFavoriteIds,
  subcategoryCounts = {},
  cuisines,
  showDistinctSubcategoryGrid = false,
}: CategoryBrowseClientProps) {
  const [items, setItems] = useState<RecipeCardItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialFavoriteIds)
  );

  // Filter states
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState<MealCategory | "">(fixedCategory ?? "");
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [ingredientsText, setIngredientsText] = useState("");
  const [maxTime, setMaxTime] = useState<string>(initialMaxTime ? String(initialMaxTime) : "");
  const [minProtein, setMinProtein] = useState<string>(initialMinProtein ? String(initialMinProtein) : "");
  const [maxCarbs, setMaxCarbs] = useState<string>("");
  const [minFiber, setMinFiber] = useState<string>("");
  const [maxCalories, setMaxCalories] = useState<string>("");
  const [dietary, setDietary] = useState<string[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<PregnancySafetyStatus | "">(initialSafety);
  const [classification, setClassification] = useState<string>(initialClassification);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [cuisine, setCuisine] = useState<string>("");
  const [sort, setSort] = useState<RecipeSortOption>(initialSort);

  const activeCategory = fixedCategory ?? (category || undefined);
  const subcategories = activeCategory ? SUBCATEGORIES_BY_CATEGORY[activeCategory] : [];

  const fetchFiltered = useCallback(
    async (targetPage: number, overrideSub?: string) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        const subVal = overrideSub !== undefined ? overrideSub : subcategory;
        if (q.trim()) sp.set("q", q.trim());
        if (activeCategory) sp.set("category", activeCategory);
        if (subVal) sp.set("subcategory", subVal);
        if (ingredientsText.trim()) sp.set("ingredients", ingredientsText.trim());
        if (maxTime) sp.set("maxTime", maxTime);
        if (minProtein) sp.set("minProtein", minProtein);
        if (maxCarbs) sp.set("maxCarbs", maxCarbs);
        if (minFiber) sp.set("minFiber", minFiber);
        if (maxCalories) sp.set("maxCalories", maxCalories);
        if (dietary.length > 0) sp.set("dietary", dietary.join(","));
        if (safetyStatus) sp.set("safetyStatus", safetyStatus);
        if (classification) sp.set("classification", classification);
        if (difficulty) sp.set("difficulty", difficulty);
        if (cuisine) sp.set("cuisine", cuisine);
        sp.set("sort", sort);
        sp.set("page", String(targetPage));
        sp.set("pageSize", "24");

        const res = await fetch(`/api/recipes?${sp.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch recipes");
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(data.page);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [
      q,
      activeCategory,
      subcategory,
      ingredientsText,
      maxTime,
      minProtein,
      maxCarbs,
      minFiber,
      maxCalories,
      dietary,
      safetyStatus,
      classification,
      difficulty,
      cuisine,
      sort,
    ]
  );

  const [hasInteracted, setHasInteracted] = useState(false);
  useEffect(() => {
    if (!hasInteracted) return;
    fetchFiltered(1);
  }, [
    hasInteracted,
    activeCategory,
    subcategory,
    dietary,
    safetyStatus,
    classification,
    difficulty,
    cuisine,
    sort,
    fetchFiltered,
  ]);

  const resetFilters = () => {
    setQ("");
    if (!fixedCategory) setCategory("");
    setSubcategory("");
    setIngredientsText("");
    setMaxTime("");
    setMinProtein("");
    setMaxCarbs("");
    setMinFiber("");
    setMaxCalories("");
    setDietary([]);
    setSafetyStatus("");
    setClassification("");
    setDifficulty("");
    setCuisine("");
    setSort("relevant");
    setHasInteracted(true);
  };

  useEffect(() => {
    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<{ ids?: string[] }>).detail;
      if (detail?.ids) {
        setFavoriteIds(new Set(detail.ids));
      }
    };
    window.addEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, onUpdated);
  }, []);

  const handleToggleFavorite = async (recipeId: string) => {
    const snapshot = items.find((r) => r.id === recipeId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
    try {
      await toggleFavoriteClient(recipeId, snapshot);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(recipeId)) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });
    }
  };

  const toggleDietary = (tag: string) => {
    setHasInteracted(true);
    setDietary((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-8">
      {/* Dinner Dedicated Clean Subcategory Tiles */}
      {showDistinctSubcategoryGrid && subcategories.length > 0 && (
        <section aria-label="Dinner subcategories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#292D2A]">
              Choose a Dinner Style
            </h2>
            {subcategory && (
              <button
                type="button"
                onClick={() => {
                  setSubcategory("");
                  setHasInteracted(true);
                }}
                className="text-xs font-medium text-[#557059] underline hover:text-[#292D2A]"
              >
                Show all dinners
              </button>
            )}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {subcategories.map((sub) => {
              const selected = subcategory === sub.name;
              const count = subcategoryCounts[sub.name] ?? 0;
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => {
                    setSubcategory(selected ? "" : sub.name);
                    setHasInteracted(true);
                  }}
                  className={`flex flex-col justify-between rounded-2xl border px-3.5 py-3 text-left transition ${
                    selected
                      ? "border-[#78947C] bg-[#E7EFE7]"
                      : "border-[#E4E7E4] bg-white hover:border-[#78947C] hover:bg-[#F7F8F7]"
                  }`}
                >
                  <span className="text-sm font-medium text-[#292D2A]">{sub.name}</span>
                  <span className="mt-1 text-xs text-[#777F78]">{count} recipes</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Clean Subcategory Pills for Breakfast / Lunch / Snacks */}
      {!showDistinctSubcategoryGrid && subcategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSubcategory("");
              setHasInteracted(true);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              subcategory === ""
                ? "bg-[#78947C] text-white"
                : "border border-[#E4E7E4] bg-white text-[#292D2A] hover:bg-[#F7F8F7]"
            }`}
          >
            All
          </button>
          {subcategories.map((sub) => {
            const active = subcategory === sub.name;
            return (
              <button
                key={sub.slug}
                type="button"
                onClick={() => {
                  setSubcategory(active ? "" : sub.name);
                  setHasInteracted(true);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-[#78947C] text-white"
                    : "border border-[#E4E7E4] bg-white text-[#292D2A] hover:border-[#78947C] hover:bg-[#E7EFE7]"
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Minimal Search, Sort & Filter Toolbar */}
      <div className="rounded-2xl border border-[#E4E7E4] bg-[#F7F8F7] p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setHasInteracted(true);
            fetchFiltered(1);
          }}
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#777F78]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search recipes by name or ingredient..."
              className="w-full rounded-xl border border-[#DCE2DC] bg-white py-2.5 pl-10 pr-4 text-sm text-[#292D2A] focus:border-[#78947C] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((p) => !p)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                showFilters
                  ? "border-[#78947C] bg-[#E7EFE7] text-[#292D2A]"
                  : "border-[#DCE2DC] bg-white text-[#292D2A] hover:border-[#78947C]"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 text-[#78947C]" />
              <span>Filters</span>
            </button>

            <select
              aria-label="Sort recipes"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as RecipeSortOption);
                setHasInteracted(true);
              }}
              className="rounded-xl border border-[#DCE2DC] bg-white px-3.5 py-2.5 text-sm text-[#292D2A] focus:border-[#78947C] focus:outline-none"
            >
              <option value="relevant">Most Relevant</option>
              <option value="protein_desc">Highest Protein</option>
              <option value="fiber_desc">Highest Fiber</option>
              <option value="added_sugar_asc">Lowest Added Sugar</option>
              <option value="time_asc">Shortest Time</option>
              <option value="recent">Recently Added</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-[#78947C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#647F68]"
            >
              Search
            </button>
          </div>
        </form>

        {/* Collapsible Advanced Filter Drawer */}
        {showFilters && (
          <div className="mt-4 border-t border-[#E4E7E4] pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {!fixedCategory && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#777F78]">
                    Meal Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as MealCategory | "");
                      setSubcategory("");
                      setHasInteracted(true);
                    }}
                    className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                  >
                    <option value="">All Meals</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snacks</option>
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Include Ingredients
                </label>
                <input
                  type="text"
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  placeholder="e.g., salmon, spinach"
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Max Time (min)
                </label>
                <input
                  type="number"
                  min={5}
                  value={maxTime}
                  onChange={(e) => setMaxTime(e.target.value)}
                  placeholder="e.g., 30"
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Min Protein (g)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minProtein}
                  onChange={(e) => setMinProtein(e.target.value)}
                  placeholder="e.g., 20"
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Max Carbs (g)
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxCarbs}
                  onChange={(e) => setMaxCarbs(e.target.value)}
                  placeholder="e.g., 45"
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Min Fiber (g)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minFiber}
                  onChange={(e) => setMinFiber(e.target.value)}
                  placeholder="e.g., 5"
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Max Calories (kcal)
                </label>
                <input
                  type="number"
                  min={50}
                  value={maxCalories}
                  onChange={(e) => setMaxCalories(e.target.value)}
                  placeholder="e.g., 550"
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Pregnancy Safety
                </label>
                <select
                  value={safetyStatus}
                  onChange={(e) => {
                    setSafetyStatus(e.target.value as PregnancySafetyStatus | "");
                    setHasInteracted(true);
                  }}
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                >
                  <option value="">All Recipes</option>
                  <option value="reviewed_safe">Pregnancy Food-Safety Reviewed</option>
                  <option value="caution_modification">Needs Modification</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Classification
                </label>
                <select
                  value={classification}
                  onChange={(e) => {
                    setClassification(e.target.value);
                    setHasInteracted(true);
                  }}
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Any Classification</option>
                  {CLASSIFICATION_OPTIONS.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value as Difficulty | "");
                    setHasInteracted(true);
                  }}
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Any Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#777F78]">
                  Cuisine
                </label>
                <select
                  value={cuisine}
                  onChange={(e) => {
                    setCuisine(e.target.value);
                    setHasInteracted(true);
                  }}
                  className="w-full rounded-xl border border-[#DCE2DC] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Any Cuisine</option>
                  {cuisines.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {DIETARY_OPTIONS.map((opt) => {
                  const active = dietary.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleDietary(opt)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-[#78947C] text-white"
                          : "border border-[#DCE2DC] bg-white text-[#292D2A] hover:bg-[#E7EFE7]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE2DC] bg-white px-3.5 py-2 text-xs font-medium text-[#575E58] hover:text-[#292D2A]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasInteracted(true);
                    fetchFiltered(1);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#78947C] px-4 py-2 text-xs font-medium text-white hover:bg-[#647F68]"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-[#777F78]">
        <span>
          {total} {total === 1 ? "recipe" : "recipes"}
          {subcategory ? ` in ${subcategory}` : ""}
        </span>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#557059]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating...
          </span>
        )}
      </div>

      {/* Results Grid */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-[#E4E7E4] bg-[#F7F8F7] px-6 py-14 text-center">
          <h3 className="text-base font-semibold text-[#292D2A]">
            No recipes matched those filters
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#777F78]">
            Try clearing a filter to browse more recipes.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 rounded-full bg-[#78947C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#647F68]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorited={favoriteIds.has(recipe.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => fetchFiltered(page - 1)}
            className="rounded-full border border-[#DCE2DC] bg-white px-4 py-2 text-sm font-medium text-[#292D2A] transition hover:bg-[#F7F8F7] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#777F78]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => fetchFiltered(page + 1)}
            className="rounded-full border border-[#DCE2DC] bg-white px-4 py-2 text-sm font-medium text-[#292D2A] transition hover:bg-[#F7F8F7] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
