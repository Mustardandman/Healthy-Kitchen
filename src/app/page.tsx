import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getFavoriteIds, getHomepageSections } from "@/db/queries";
import { SearchBar } from "@/components/SearchBar";
import { RecipeGridClient } from "@/components/RecipeGridClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  ensureSeeded();
  const sections = getHomepageSections();
  const favoriteIds = getFavoriteIds();

  const sectionList = [
    {
      title: "Featured Recipes",
      href: "/recipes",
      items: sections.featured.slice(0, 4),
    },
    {
      title: "Popular Breakfast Recipes",
      href: "/breakfast",
      items: sections.popularBreakfast.slice(0, 4),
    },
    {
      title: "Quick and Easy Lunches",
      href: "/lunch?maxTime=20",
      items: sections.quickLunches.slice(0, 4),
    },
    {
      title: "Healthy Dinner Ideas",
      href: "/dinner",
      items: sections.healthyDinners.slice(0, 4),
    },
    {
      title: "Pregnancy-Friendly Recipes",
      href: "/recipes?safetyStatus=reviewed_safe",
      items: sections.pregnancyFriendly.slice(0, 4),
    },
    {
      title: "High-Protein Meals",
      href: "/recipes?minProtein=24&sort=protein_desc",
      items: sections.highProtein.slice(0, 4),
    },
    {
      title: "Recipes Ready in 30 Minutes",
      href: "/recipes?maxTime=30",
      items: sections.readyIn30.slice(0, 4),
    },
    {
      title: "Recently Added Recipes",
      href: "/recipes?sort=recent",
      items: sections.recentlyAdded.slice(0, 4),
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
