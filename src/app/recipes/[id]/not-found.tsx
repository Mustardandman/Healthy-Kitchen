import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function RecipeNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-[#292D2A]">Recipe Not Found</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#777F78] sm:text-base">
        This recipe link may be from an older version of the database or an expired external search result. Browse our latest pregnancy-safe, blood-sugar-conscious recipes below.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#78947C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#647F68]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/recipes"
          className="inline-flex items-center gap-2 rounded-full border border-[#DCE2DC] bg-white px-5 py-2.5 text-sm font-medium text-[#292D2A] hover:border-[#78947C]"
        >
          <Search className="h-4 w-4 text-[#78947C]" />
          <span>Search All Recipes</span>
        </Link>
      </div>
    </div>
  );
}

