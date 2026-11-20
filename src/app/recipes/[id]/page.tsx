import { notFound } from "next/navigation";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getFavoriteIds, getRecipeByIdOrSlug } from "@/db/queries";
import { resolveAnyExternalRecipeDetail } from "@/lib/providers/external-apis";
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
  const recipe = local ?? (await resolveAnyExternalRecipeDetail(id));

  if (!recipe) {
    notFound();
  }

  const favIds = getFavoriteIds();
  if (favIds.includes(recipe.id)) {
    recipe.is_favorited = true;
  }

  return <RecipeDetailClient recipe={recipe} />;
}
