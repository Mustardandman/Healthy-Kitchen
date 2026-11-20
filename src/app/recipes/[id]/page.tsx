import { notFound } from "next/navigation";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getRecipeByIdOrSlug } from "@/db/queries";
import {
  getCachedEdamamRecipeDetail,
  getSpoonacularRecipeDetail,
} from "@/lib/providers/external-apis";
import { RecipeDetailClient } from "@/components/RecipeDetailClient";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureSeeded();
  const { id } = await params;

  let recipe = null;
  if (id.startsWith("spoonacular-")) {
    recipe = await getSpoonacularRecipeDetail(id);
  } else if (id.startsWith("edamam-")) {
    recipe = getCachedEdamamRecipeDetail(id);
  } else {
    recipe = getRecipeByIdOrSlug(id);
  }

  if (!recipe) {
    notFound();
  }

  return <RecipeDetailClient recipe={recipe} />;
}
