"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { RecipeCard } from "@/components/RecipeCard";
import type { RecipeCardItem } from "@/types/recipe";

interface FavoritesClientProps {
  initialItems: RecipeCardItem[];
}

export function FavoritesClient({ initialItems }: FavoritesClientProps) {
  const [items, setItems] = useState<RecipeCardItem[]>(initialItems);

  const handleToggleFavorite = async (recipeId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== recipeId));
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId }),
    }).catch(() => {});
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-[#E4E7E4] bg-[#F7F8F7] px-6 py-16 text-center">
        <Heart className="mx-auto h-10 w-10 text-[#78947C]" />
        <h2 className="mt-4 text-lg font-semibold text-[#292D2A]">No saved favorites yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#777F78]">
          Tap the heart icon on any recipe card or recipe detail page to keep your go-to pregnancy-friendly meals handy.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/recipes"
            className="rounded-full bg-[#78947C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#647F68]"
          >
            Browse All Recipes
          </Link>
          <Link
            href="/find-recipes"
            className="rounded-full border border-[#DCE2DC] bg-white px-5 py-2.5 text-sm font-medium text-[#292D2A] hover:border-[#78947C]"
          >
            What&apos;s in Your Fridge?
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#777F78]">
        You have <strong className="text-[#292D2A]">{items.length}</strong> saved favorite{" "}
        {items.length === 1 ? "recipe" : "recipes"}.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isFavorited={true}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

