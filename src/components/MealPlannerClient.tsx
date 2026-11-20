"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CheckSquare, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/categories";
import { formatQuantity } from "@/lib/format";
import type {
  DayOfWeek,
  MealCategory,
  MealPlanEntry,
  RecipeCardItem,
  ShoppingListItem,
} from "@/types/recipe";

interface MealPlannerClientProps {
  initialEntries: MealPlanEntry[];
  initialShoppingList: ShoppingListItem[];
}

const SLOTS: Array<{ key: MealCategory; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
];

export function MealPlannerClient({
  initialEntries,
  initialShoppingList,
}: MealPlannerClientProps) {
  const [entries, setEntries] = useState<MealPlanEntry[]>(initialEntries);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(initialShoppingList);
  const [pickerTarget, setPickerTarget] = useState<{
    day: DayOfWeek;
    slot: MealCategory;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<RecipeCardItem[]>([]);
  const [searching, setSearching] = useState(false);

  const openPicker = async (day: DayOfWeek, slot: MealCategory) => {
    setPickerTarget({ day, slot });
    setSearchTerm("");
    setSearching(true);
    try {
      const res = await fetch(`/api/recipes?category=${slot}&pageSize=12`);
      const data = await res.json();
      setSearchResults(data.items ?? []);
    } finally {
      setSearching(false);
    }
  };

  const runPickerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickerTarget) return;
    setSearching(true);
    try {
      const sp = new URLSearchParams({
        category: pickerTarget.slot,
        pageSize: "12",
      });
      if (searchTerm.trim()) sp.set("q", searchTerm.trim());
      const res = await fetch(`/api/recipes?${sp.toString()}`);
      const data = await res.json();
      setSearchResults(data.items ?? []);
    } finally {
      setSearching(false);
    }
  };

  const handleAddRecipe = async (recipeId: string) => {
    if (!pickerTarget) return;
    const res = await fetch("/api/meal-planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: pickerTarget.day,
        mealSlot: pickerTarget.slot,
        recipeId,
        servingsMultiplier: 1,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setShoppingList(data.shoppingList);
      setPickerTarget(null);
    }
  };

  const handleRemoveEntry = async (id: number) => {
    const res = await fetch(`/api/meal-planner?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setShoppingList(data.shoppingList);
    }
  };

  const handleClearWeek = async () => {
    const res = await fetch(`/api/meal-planner?clearAll=true`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setShoppingList(data.shoppingList);
    }
  };

  const handleToggleShoppingItem = async (itemKey: string, nextChecked: boolean) => {
    setShoppingList((prev) =>
      prev.map((item) => (item.item_key === itemKey ? { ...item, checked: nextChecked } : item))
    );
    await fetch("/api/meal-planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemKey, checked: nextChecked }),
    });
  };

  // Group shopping list by ingredient category
  const groupedShopping = shoppingList.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
    const key = item.category || "pantry";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      {/* Weekly Schedule Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-[#78947C]" />
          <h2 className="text-xl font-bold text-[#292D2A]">
            Monday – Sunday Schedule ({entries.length} planned meals)
          </h2>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={handleClearWeek}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE2DC] bg-white px-4 py-2 text-xs font-medium text-[#575E58] hover:border-red-300 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Week</span>
          </button>
        )}
      </div>

      {/* 7-Day Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.key}
            className="flex flex-col rounded-2xl border border-[#E4E7E4] bg-[#F7F8F7] p-3.5"
          >
            <h3 className="mb-3 border-b border-[#E4E7E4] pb-2 text-sm font-bold text-[#292D2A]">
              {day.label}
            </h3>

            <div className="space-y-3">
              {SLOTS.map((slot) => {
                const slotEntries = entries.filter(
                  (e) => e.day_of_week === day.key && e.meal_slot === slot.key
                );
                return (
                  <div key={slot.key} className="rounded-xl bg-white p-2.5 border border-[#E4E7E4]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777F78]">
                        {slot.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => openPicker(day.key, slot.key)}
                        aria-label={`Add ${slot.label} for ${day.label}`}
                        className="inline-flex items-center gap-0.5 rounded-full bg-[#E7EFE7] px-2 py-0.5 text-[11px] font-medium text-[#3D5441] hover:bg-[#78947C] hover:text-white"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>

                    {slotEntries.length === 0 ? (
                      <p className="mt-1.5 text-[11px] text-[#9AA29B]">Unplanned</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {slotEntries.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-start justify-between gap-1.5 rounded-lg bg-[#F7F8F7] p-2 text-xs"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/recipes/${entry.recipe.slug}`}
                                className="line-clamp-2 font-medium text-[#292D2A] hover:text-[#557059]"
                              >
                                {entry.recipe.name}
                              </Link>
                              <span className="text-[10px] text-[#777F78]">
                                {entry.recipe.nutrition.carbs_g}g carbs • {entry.recipe.nutrition.protein_g}g protein
                              </span>
                            </div>
                            <button
                              type="button"
                              aria-label="Remove meal"
                              onClick={() => handleRemoveEntry(entry.id)}
                              className="shrink-0 rounded p-0.5 text-[#777F78] hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Consolidated Shopping List */}
      <section className="rounded-3xl border border-[#E4E7E4] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#78947C]" />
            <div>
              <h2 className="text-xl font-bold text-[#292D2A]">
                Consolidated Weekly Shopping List
              </h2>
              <p className="text-xs text-[#777F78]">
                Automatically combines matching ingredients across all planned meals. Check items off as you shop.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7EFE7] px-3.5 py-1 text-xs font-semibold text-[#3D5441]">
            <CheckSquare className="h-3.5 w-3.5" />
            {shoppingList.filter((i) => i.checked).length} / {shoppingList.length} checked
          </span>
        </div>

        {shoppingList.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#DCE2DC] bg-[#F7F8F7] px-6 py-10 text-center">
            <p className="text-sm font-medium text-[#292D2A]">
              Your shopping list is empty.
            </p>
            <p className="mt-1 text-xs text-[#777F78]">
              Add recipes to any day above (or from any recipe page) to generate your combined grocery list.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupedShopping).map(([cat, list]) => (
              <div key={cat} className="rounded-2xl border border-[#E4E7E4] bg-[#F7F8F7] p-4">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#557059]">
                  {cat}
                </h3>
                <ul className="space-y-2">
                  {list.map((item) => (
                    <li key={item.item_key}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white p-2.5 border border-[#E4E7E4]">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => handleToggleShoppingItem(item.item_key, e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#78947C]"
                        />
                        <div className="min-w-0 text-xs">
                          <span
                            className={`block font-medium ${
                              item.checked ? "text-[#777F78] line-through" : "text-[#292D2A]"
                            }`}
                          >
                            <strong>
                              {formatQuantity(item.quantity)} {item.unit}
                            </strong>{" "}
                            {item.display_name}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-[#777F78]">
                            For: {item.recipes.join(", ")}
                          </span>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Recipe Picker Modal */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#E4E7E4] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#292D2A] capitalize">
                  Add {pickerTarget.slot} for {pickerTarget.day}
                </h3>
                <p className="text-xs text-[#777F78]">
                  Search and pick a recipe to add directly to your weekly schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="rounded-full p-2 text-[#777F78] hover:bg-[#F7F8F7] hover:text-[#292D2A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={runPickerSearch} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#777F78]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${pickerTarget.slot} recipes...`}
                  className="w-full rounded-xl border border-[#DCE2DC] bg-[#F7F8F7] py-2 pl-9 pr-3 text-sm focus:border-[#78947C] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[#78947C] px-4 py-2 text-sm font-medium text-white hover:bg-[#647F68]"
              >
                Search
              </button>
            </form>

            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {searching ? (
                <p className="py-8 text-center text-sm text-[#777F78]">Searching recipes...</p>
              ) : searchResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#777F78]">No matching recipes found.</p>
              ) : (
                searchResults.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E4E7E4] p-3 hover:bg-[#F7F8F7]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#292D2A]">{recipe.name}</p>
                      <p className="text-xs text-[#777F78]">
                        {recipe.primary_subcategory} • {recipe.total_time_min} min • {recipe.nutrition.carbs_g}g carbs • {recipe.nutrition.protein_g}g protein
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddRecipe(recipe.id)}
                      className="shrink-0 rounded-full bg-[#E7EFE7] px-3.5 py-1.5 text-xs font-semibold text-[#3D5441] hover:bg-[#78947C] hover:text-white"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

