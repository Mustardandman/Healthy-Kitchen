import { notFound } from "next/navigation";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getFavoriteIds, getRecipeByIdOrSlug } from "@/db/queries";
import { resolveAnyExternalRecipeDetail } from "@/lib/providers/external-apis";
import { extractRecipeInstructionsFromUrl } from "@/lib/recipe-scraper";
import { RecipeDetailClient } from "@/components/RecipeDetailClient";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureSeeded();
  const { id } = await params;

  const local = getRecipeByIdOrSlug(id);
  let recipe = local ?? (await resolveAnyExternalRecipeDetail(id));

  if (!recipe) {
    notFound();
  }

  // If a previously saved external recipe had no inline steps yet, extract them on demand from source_url
  if (recipe.instructions.length === 0 && recipe.source_url) {
    const extracted = await extractRecipeInstructionsFromUrl(recipe.source_url);
    if (extracted.length > 0) {
      recipe = {
        ...recipe,
        instructions: extracted,
        instructions_license_mode: "licensed_display",
      };
    }
  }

  const favIds = getFavoriteIds();
  if (favIds.includes(recipe.id)) {
    recipe.is_favorited = true;
  }

  return <RecipeDetailClient recipe={recipe} />;
}
