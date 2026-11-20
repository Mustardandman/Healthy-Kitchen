"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Clock, Heart } from "lucide-react";
import type { RecipeCardItem } from "@/types/recipe";
import { formatMinutes } from "@/lib/format";

interface RecipeCardProps {
  recipe: RecipeCardItem;
  isFavorited?: boolean;
  onToggleFavorite?: (recipeId: string) => void;
  matchBadge?: string;
}

export function RecipeCard({
  recipe,
  isFavorited,
  onToggleFavorite,
  matchBadge,
}: RecipeCardProps) {
  const [imgSrc, setImgSrc] = useState(recipe.image_url);
  const primaryBadge =
    recipe.classifications.find((c) => c === "Blood-Sugar-Conscious") ??
    recipe.classifications[0] ??
    "Balanced Nutrition";

  return (
    <article className="nourish-card group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F7F8F7]">
        <Link href={`/recipes/${recipe.slug}`} className="block h-full w-full">
          <Image
            src={imgSrc}
            alt={recipe.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImgSrc("/images/food/grain-bowl.jpg")}
          />
        </Link>

        {matchBadge && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#292D2A]/85 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {matchBadge}
          </span>
        )}

        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(recipe.id);
            }}
            aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
            className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition ${isFavorited
                ? "bg-[#78947C] text-white"
                : "bg-white/90 text-[#777F78] opacity-90 hover:bg-white hover:text-[#292D2A]"
              }`}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <span className="inline-block rounded-full bg-[#E7EFE7] px-2.5 py-0.5 text-[11px] font-medium text-[#3D5441]">
            {primaryBadge}
          </span>

          <Link href={`/recipes/${recipe.slug}`} className="mt-2.5 block">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#292D2A] transition-colors group-hover:text-[#557059]">
              {recipe.name}
            </h3>
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-between pt-3 text-xs text-[#777F78]">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#78947C]" />
            <span>{formatMinutes(recipe.total_time_min)}</span>
          </span>
          <span>
            <strong className="font-medium text-[#292D2A]">{recipe.nutrition.carbs_g}g</strong> carbs
          </span>
        </div>
      </div>
    </article>
  );
}
