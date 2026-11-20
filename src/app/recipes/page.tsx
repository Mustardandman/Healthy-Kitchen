import { ensureSeeded } from "@/db/ensure-seeded";
import { getAvailableCuisines, getFavoriteIds, searchRecipes } from "@/db/queries";
import { CategoryBrowseClient } from "@/components/CategoryBrowseClient";
import type { PregnancySafetyStatus, RecipeSortOption } from "@/types/recipe";

export const dynamic = "force-dynamic";

export default async function AllRecipesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    minProtein?: string;
    maxTime?: string;
    safetyStatus?: string;
    classification?: string;
  }>;
}) {
  ensureSeeded();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const sort = (sp.sort as RecipeSortOption) || "relevant";
  const minProtein = sp.minProtein ? Number(sp.minProtein) : undefined;
  const maxTime = sp.maxTime ? Number(sp.maxTime) : undefined;
  const safetyStatus = (sp.safetyStatus as PregnancySafetyStatus | "") || "";
  const classification = sp.classification ?? "";

  const initialData = searchRecipes({
    q,
    sort,
    minProtein,
    maxTime,
    safetyStatus,
    classification,
    page: 1,
    pageSize: 24,
  });
  const cuisines = getAvailableCuisines();
  const favoriteIds = getFavoriteIds();

  return (
    <div className="bg-white">
      <section className="border-b border-[#E4E7E4] bg-[#F7F8F7]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <span className="inline-block rounded-full bg-[#E7EFE7] px-3 py-1 text-xs font-semibold text-[#3D5441]">
            Complete Recipe Library
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#292D2A] sm:text-4xl">
            Search &amp; Filter All Recipes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#777F78] sm:text-base">
            Filter across every meal category by protein, carbohydrates, dietary fiber, cooking time, pregnancy safety, and culinary style.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CategoryBrowseClient
          initialQuery={q}
          initialSort={sort}
          initialMinProtein={minProtein}
          initialMaxTime={maxTime}
          initialSafety={safetyStatus}
          initialClassification={classification}
          initialItems={initialData.items}
          initialTotal={initialData.total}
          initialTotalPages={initialData.totalPages}
          initialFavoriteIds={favoriteIds}
          cuisines={cuisines}
        />
      </div>
    </div>
  );
}

