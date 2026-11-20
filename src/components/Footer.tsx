import Link from "next/link";
import { Leaf } from "lucide-react";
import { TRUSTED_HEALTH_AND_RECIPE_REFERENCES } from "@/lib/references";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#E4E7E4] bg-[#F7F8F7]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-[#E4E7E4] pb-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7EFE7] text-[#557059]">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold text-[#292D2A]">Nourish</span>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#575E58]">
            <Link href="/breakfast" className="hover:text-[#292D2A]">Breakfast</Link>
            <Link href="/lunch" className="hover:text-[#292D2A]">Lunch</Link>
            <Link href="/dinner" className="hover:text-[#292D2A]">Dinner</Link>
            <Link href="/snacks" className="hover:text-[#292D2A]">Snacks</Link>
            <Link href="/find-recipes" className="hover:text-[#292D2A]">Find Recipes</Link>
            <Link href="/meal-planner" className="hover:text-[#292D2A]">Meal Planner</Link>
            <Link href="/favorites" className="hover:text-[#292D2A]">Favorites</Link>
          </nav>
        </div>

        <div className="mt-6 space-y-3 text-xs leading-relaxed text-[#777F78]">
          <p>
            <strong className="font-medium text-[#292D2A]">Medical Disclaimer:</strong> Nourish provides general nutrition and culinary information calculated from USDA FoodData Central reference data (CC0 1.0). It is not a medical device or medical provider and does not guarantee any glycemic outcome. Follow individualized guidance from your OB/GYN, diabetes specialist, or registered dietitian.
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium text-[#292D2A]">Trusted Resources:</span>
            {TRUSTED_HEALTH_AND_RECIPE_REFERENCES.map((ref) => (
              <a
                key={ref.url}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#557059] underline hover:text-[#292D2A]"
              >
                {ref.name}
              </a>
            ))}
          </p>
          <p>© {new Date().getFullYear()} Nourish Kitchen</p>
        </div>
      </div>
    </footer>
  );
}
