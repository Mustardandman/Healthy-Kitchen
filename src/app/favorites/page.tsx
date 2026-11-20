import { ensureSeeded } from "@/db/ensure-seeded";
import { getFavorites } from "@/db/queries";
import { FavoritesClient } from "@/components/FavoritesClient";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  ensureSeeded();
  const items = getFavorites();

  return (
    <div className="bg-white">
      <section className="border-b border-[#E4E7E4] bg-[#F7F8F7]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <span className="inline-block rounded-full bg-[#E7EFE7] px-3 py-1 text-xs font-semibold text-[#3D5441]">
            Saved Collection
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#292D2A] sm:text-4xl">
            Favorite Recipes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#777F78] sm:text-base">
            Quick access to the meals and snacks your family loves most.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <FavoritesClient initialItems={items} />
      </div>
    </div>
  );
}

