"use client";

import { useEffect, useState } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import type { RecipeCardItem } from "@/types/recipe";

interface RecipeGridClientProps {
  recipes: RecipeCardItem[];
  initialFavoriteIds?: string[];
}

export function RecipeGridClient({
  recipes,
  initialFavoriteIds = [],
}: RecipeGridClientProps) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialFavoriteIds)
  );

  useEffect(() => {
    setFavoriteIds(new Set(initialFavoriteIds));
  }, [initialFavoriteIds]);

  const handleToggle = async (recipeId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
    } catch {
      // Revert if API fails
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(recipeId)) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });
    }
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          isFavorited={favoriteIds.has(recipe.id)}
          onToggleFavorite={handleToggle}
        />
      ))}
    </div>
  );
}

