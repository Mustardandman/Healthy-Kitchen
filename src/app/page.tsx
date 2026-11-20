import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getFavoriteIds, getHomepageSections } from "@/db/queries";
import {
  getExternalProviderStatus,
  searchEdamamRecipes,
  searchTheMealDbRecipes,
} from "@/lib/providers/external-apis";
import { SearchBar } from "@/components/SearchBar";
import { RecipeGridClient } from "@/components/RecipeGridClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  ensureSeeded();
  const sections = getHomepageSections();
  const favoriteIds = getFavoriteIds();
  const providers = getExternalProviderStatus();

  // Fetch cached live recipes across the 4 meal pillars when Edamam/TheMealDB are active
  const [liveBf, liveLn, liveDn, liveSn, liveTmdb] = await Promise.all([
    providers.edamamConfigured
      ? searchEdamamRecipes({ category: "breakfast", limit: 4 })
      : Promise.resolve([]),
    providers.edamamConfigured
      ? searchEdamamRecipes({ category: "lunch", limit: 4 })
      : Promise.resolve([]),
    providers.edamamConfigured
      ? searchEdamamRecipes({ category: "dinner", limit: 4 })
      : Promise.resolve([]),
    providers.edamamConfigured
      ? searchEdamamRecipes({ category: "snack", limit: 4 })
      : Promise.resolve([]),
    providers.themealdbEnabled
      ? searchTheMealDbRecipes({ query: "salmon", limit: 4 })
      : Promise.resolve([]),
  ]);

  const pick4 = <T,>(live: T[], fallback: T[]) =>
    [...live, ...fallback].slice(0, 4);

  const sectionList = [
    {
      title: "Featured Recipes",
      href: "/recipes",
      items: pick4([...liveDn.slice(0, 2), ...liveLn.slice(0, 2)], sections.featured),
    },
    {
      title: "Popular Breakfast Recipes",
      href: "/breakfast",
      items: pick4(liveBf, sections.popularBreakfast),
    },
    {
      title: "Quick and Easy Lunches",
      href: "/lunch?maxTime=20",
      items: pick4(liveLn, sections.quickLunches),
    },
    {
      title: "Healthy Dinner Ideas",
      href: "/dinner",
      items: pick4(liveDn, sections.healthyDinners),
    },
    {
      title: "Pregnancy-Friendly Recipes",
      href: "/recipes?safetyStatus=reviewed_safe",
      items: pick4(
        [...liveBf, ...liveLn, ...liveDn].filter(
          (r) => r.pregnancy_safety_status === "reviewed_safe"
        ),
        sections.pregnancyFriendly
      ),
    },
    {
      title: "High-Protein Meals",
      href: "/recipes?minProtein=24&sort=protein_desc",
      items: pick4(
        [...liveDn, ...liveLn].filter((r) => r.nutrition.protein_g >= 20),
        sections.highProtein
      ),
    },
    {
      title: "Recipes Ready in 30 Minutes",
      href: "/recipes?maxTime=30",
      items: pick4(
        [...liveLn, ...liveSn].filter((r) => r.total_time_min <= 30),
        sections.readyIn30
      ),
    },
    {
      title: "Recently Added Recipes",
      href: "/recipes?sort=recent",
      items: pick4(liveTmdb, sections.recentlyAdded),
    },
  ];

  return (
    <div className="bg-white">
      {/* Calm, Spacious Welcome Hero */}
      <section className="border-b border-[#E4E7E4] bg-[#F7F8F7]">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#292D2A] sm:text-5xl">
            Eat Well. Feel Good. Nourish Every Day.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#777F78] sm:text-lg">
            Discover delicious recipes that make healthy eating easier.
          </p>

          <div className="mx-auto mt-8 max-w-2xl">
            <SearchBar placeholder="Search recipes or ingredients..." />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-sm">
            <Link
              href="/find-recipes"
              className="rounded-full bg-[#E7EFE7] px-4 py-2 font-medium text-[#3D5441] transition hover:bg-[#78947C] hover:text-white"
            >
              What&apos;s in Your Fridge?
            </Link>
            <Link
              href="/breakfast"
              className="rounded-full border border-[#E4E7E4] bg-white px-4 py-2 font-medium text-[#292D2A] transition hover:border-[#78947C]"
            >
              Breakfast
            </Link>
            <Link
              href="/lunch"
              className="rounded-full border border-[#E4E7E4] bg-white px-4 py-2 font-medium text-[#292D2A] transition hover:border-[#78947C]"
            >
              Lunch
            </Link>
            <Link
              href="/dinner"
              className="rounded-full border border-[#E4E7E4] bg-white px-4 py-2 font-medium text-[#292D2A] transition hover:border-[#78947C]"
            >
              Dinner
            </Link>
            <Link
              href="/snacks"
              className="rounded-full border border-[#E4E7E4] bg-white px-4 py-2 font-medium text-[#292D2A] transition hover:border-[#78947C]"
            >
              Snacks
            </Link>
          </div>
        </div>
      </section>

      {/* Clean Single-Row Recipe Sections */}
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        {sectionList.map((section) => (
          <section key={section.title} className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#292D2A] sm:text-2xl">
                {section.title}
              </h2>
              <Link
                href={section.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#557059] hover:text-[#292D2A]"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <RecipeGridClient recipes={section.items} initialFavoriteIds={favoriteIds} />
          </section>
        ))}
      </div>
    </div>
  );
}
