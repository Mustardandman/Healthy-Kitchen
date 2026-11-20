import { ensureSeeded } from "@/db/ensure-seeded";
import {
  getAvailableCuisines,
  getFavoriteIds,
  getSubcategoryCounts,
  searchRecipes,
} from "@/db/queries";
import {
  getExternalProviderStatus,
  searchEdamamRecipes,
  searchTheMealDbRecipes,
} from "@/lib/providers/external-apis";
import { CategoryBrowseClient } from "@/components/CategoryBrowseClient";
import type { MealCategory } from "@/types/recipe";

interface CategoryPageShellProps {
  category: MealCategory;
  title: string;
  subtitle: string;
  initialMaxTime?: number;
  showDistinctSubcategoryGrid?: boolean;
}

export async function CategoryPageShell({
  category,
  title,
  subtitle,
  initialMaxTime,
  showDistinctSubcategoryGrid = false,
}: CategoryPageShellProps) {
  ensureSeeded();
  const initialData = searchRecipes({
    category,
    maxTime: initialMaxTime,
    page: 1,
    pageSize: 24,
  });

  const providers = getExternalProviderStatus();
  const [edamamLive, tmdbLive] = await Promise.all([
    providers.edamamConfigured
      ? searchEdamamRecipes({ category, limit: 8 })
      : Promise.resolve([]),
    providers.themealdbEnabled
      ? searchTheMealDbRecipes({ category, limit: 4 })
      : Promise.resolve([]),
  ]);

  const combinedInitial = [...edamamLive, ...tmdbLive, ...initialData.items].slice(0, 24);
  const subcategoryCounts = getSubcategoryCounts(category);
  const cuisines = getAvailableCuisines();
  const favoriteIds = getFavoriteIds();

  return (
    <div className="bg-white">
      <section className="border-b border-[#E4E7E4] bg-[#F7F8F7]">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#292D2A] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#777F78] sm:text-base">
            {subtitle}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CategoryBrowseClient
          fixedCategory={category}
          initialMaxTime={initialMaxTime}
          initialItems={combinedInitial}
          initialTotal={initialData.total + edamamLive.length + tmdbLive.length}
          initialTotalPages={initialData.totalPages}
          initialFavoriteIds={favoriteIds}
          subcategoryCounts={subcategoryCounts}
          cuisines={cuisines}
          showDistinctSubcategoryGrid={showDistinctSubcategoryGrid}
        />
      </div>
    </div>
  );
}
