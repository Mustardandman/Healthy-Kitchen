"use client";

import { useEffect, useState } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import {
  FAVORITES_UPDATED_EVENT,
  toggleFavoriteClient,
} from "@/lib/favorites-client";
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

  const handleToggle = async (recipeId: string) => {
    const snapshot = recipes.find((r) => r.id === recipeId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });

    try {
      await toggleFavoriteClient(recipeId, snapshot);
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

