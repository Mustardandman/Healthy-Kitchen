import { notFound } from "next/navigation";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getRecipeByIdOrSlug } from "@/db/queries";
import { RecipeDetailClient } from "@/components/RecipeDetailClient";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureSeeded();
  const { id } = await params;
  const recipe = getRecipeByIdOrSlug(id);

  if (!recipe) {
    notFound();
  }

  return <RecipeDetailClient recipe={recipe} />;
}

