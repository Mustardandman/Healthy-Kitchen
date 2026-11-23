"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Loader2, Plus, X } from "lucide-react";
import { RecipeCard } from "@/components/RecipeCard";
import {
  FAVORITES_UPDATED_EVENT,
  toggleFavoriteClient,
} from "@/lib/favorites-client";
import type { FridgeMatchMode, FridgeMatchResult, MealCategory } from "@/types/recipe";

interface CatalogItem {
  id: string;
  canonical_name: string;
  synonyms: string[];
  category: string;
}

interface FridgeFinderClientProps {
  catalog: CatalogItem[];
  initialFavoriteIds: string[];
}

const QUICK_PICKS = [
  "chicken",
  "broccoli",
  "eggs",
  "spinach",
  "Greek yogurt",
  "salmon",
  "avocado",
  "rolled oats",
];

export function FridgeFinderClient({
  catalog,
  initialFavoriteIds,
}: FridgeFinderClientProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([
    "chicken",
    "spinach",
  ]);
  const [inputVal, setInputVal] = useState("");
  const [mode, setMode] = useState<FridgeMatchMode>("use_what_i_have");
  const [requireAll, setRequireAll] = useState(false);
  const [category, setCategory] = useState<MealCategory | "">("");
  const [results, setResults] = useState<FridgeMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialFavoriteIds)
  );

  const suggestions = useMemo(() => {
    const q = inputVal.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set(selectedIngredients.map((s) => s.toLowerCase()));
    return catalog
      .filter(
        (item) =>
          !seen.has(item.canonical_name.toLowerCase()) &&
          (item.canonical_name.toLowerCase().includes(q) ||
            item.synonyms.some((syn) => syn.toLowerCase().includes(q)))
      )
      .slice(0, 8);
  }, [inputVal, catalog, selectedIngredients]);

  const runMatch = useCallback(async () => {
    if (selectedIngredients.length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/fridge-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: selectedIngredients,
          mode,
          requireAll,
          category,
          limit: 40,
        }),
      });
      if (!res.ok) throw new Error("Failed to match ingredients");
      const data = (await res.json()) as { results: FridgeMatchResult[] };
      setResults(data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedIngredients, mode, requireAll, category]);

  useEffect(() => {
    runMatch();
  }, [runMatch]);

  const addIngredientsFromInput = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setSelectedIngredients((prev) => {
      const existing = new Set(prev.map((x) => x.toLowerCase()));
      const next = [...prev];
      for (const p of parts) {
        if (!existing.has(p.toLowerCase())) {
          next.push(p);
          existing.add(p.toLowerCase());
        }
      }
      return next;
    });
    setInputVal("");
  };

  const removeIngredient = (label: string) => {
    setSelectedIngredients((prev) =>
      prev.filter((item) => item.toLowerCase() !== label.toLowerCase())
    );
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
    const snapshot = results.find((r) => r.id === recipeId);
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

  return (
    <div className="space-y-8">
      {/* Simplified Ingredient Picker */}
      <div className="rounded-3xl border border-[#E4E7E4] bg-[#F7F8F7] p-6">
        <div className="space-y-4">
          <div className="relative flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="fridge-input"
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIngredientsFromInput(inputVal);
                  }
                }}
                placeholder="Enter ingredients (e.g., Chicken, broccoli, eggs, spinach, Greek yogurt)..."
                aria-label="Enter ingredients you have"
                className="w-full rounded-2xl border border-[#DCE2DC] bg-white px-4 py-3 text-sm text-[#292D2A] focus:border-[#78947C] focus:outline-none"
              />

              {suggestions.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-[#E4E7E4] bg-white p-1.5 shadow-lg"
                >
                  {suggestions.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => addIngredientsFromInput(item.canonical_name)}
                        className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-sm text-[#292D2A] hover:bg-[#E7EFE7]"
                      >
                        <span className="capitalize">{item.canonical_name}</span>
                        <span className="text-xs text-[#777F78]">{item.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={() => addIngredientsFromInput(inputVal)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#78947C] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#647F68]"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>

          {/* Selected Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedIngredients.map((ing) => (
              <span
                key={ing}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#78947C] px-3.5 py-1.5 text-xs font-medium text-white"
              >
                <span>{ing}</span>
                <button
                  type="button"
                  aria-label={`Remove ${ing}`}
                  onClick={() => removeIngredient(ing)}
                  className="rounded-full p-0.5 hover:bg-white/20"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {QUICK_PICKS.filter(
              (qp) => !selectedIngredients.some((s) => s.toLowerCase() === qp.toLowerCase())
            )
              .slice(0, 6)
              .map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => addIngredientsFromInput(qp)}
                  className="rounded-full border border-[#DCE2DC] bg-white px-3 py-1 text-xs text-[#575E58] transition hover:border-[#78947C] hover:text-[#292D2A]"
                >
                  + {qp}
                </button>
              ))}
          </div>

          {/* Simple Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E7E4] pt-4">
            <div className="inline-flex flex-wrap gap-1.5">
              {[
                { id: "use_what_i_have" as FridgeMatchMode, label: "Use What I Have" },
                { id: "best_match" as FridgeMatchMode, label: "Best Match" },
                { id: "almost_there" as FridgeMatchMode, label: "Almost There (1–2 missing)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    mode === opt.id
                      ? "bg-[#292D2A] text-white"
                      : "border border-[#DCE2DC] bg-white text-[#292D2A] hover:border-[#78947C]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#292D2A]">
                <input
                  type="checkbox"
                  checked={requireAll}
                  onChange={(e) => setRequireAll(e.target.checked)}
                  className="h-4 w-4 accent-[#78947C]"
                />
                <span>Include all selected</span>
              </label>

              <select
                aria-label="Filter matches by meal category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MealCategory | "")}
                className="rounded-xl border border-[#DCE2DC] bg-white px-3 py-1.5 text-xs font-medium text-[#292D2A]"
              >
                <option value="">All Meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snacks</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-sm text-[#777F78]">
        <span>{results.length} matching recipes</span>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#557059]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Matching...
          </span>
        )}
      </div>

      {/* Results Grid */}
      {selectedIngredients.length === 0 ? (
        <div className="rounded-2xl border border-[#E4E7E4] bg-[#F7F8F7] px-6 py-12 text-center">
          <ChefHat className="mx-auto h-8 w-8 text-[#78947C]" />
          <p className="mt-3 text-sm font-medium text-[#292D2A]">
            Add an ingredient above to discover matching recipes.
          </p>
        </div>
      ) : results.length === 0 && !loading ? (
        <div className="rounded-2xl border border-[#E4E7E4] bg-[#F7F8F7] px-6 py-12 text-center">
          <p className="text-sm font-medium text-[#292D2A]">
            No exact matches found. Try switching to &ldquo;Best Match&rdquo; or unchecking &ldquo;Include all selected&rdquo;.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((recipe) => (
            <div key={recipe.id} className="flex flex-col gap-2">
              <RecipeCard
                recipe={recipe}
                isFavorited={favoriteIds.has(recipe.id)}
                onToggleFavorite={handleToggleFavorite}
                matchBadge={`${recipe.match_percentage}% match • ${recipe.matched_count}/${selectedIngredients.length}`}
              />
              <p className="px-1 text-xs leading-snug text-[#777F78] line-clamp-2">
                {recipe.missing_ingredients.length > 0 ? (
                  <>
                    <span className="font-medium text-[#292D2A]">Need:</span>{" "}
                    {recipe.missing_ingredients.slice(0, 4).join(", ")}
                    {recipe.missing_ingredients.length > 4
                      ? ` +${recipe.missing_ingredients.length - 4} more`
                      : ""}
                  </>
                ) : (
                  <span className="font-medium text-[#557059]">All ingredients on hand</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
