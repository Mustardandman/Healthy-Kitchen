"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  initialQuery = "",
  placeholder = "Search recipes, ingredients, or meal styles (e.g., salmon, overnight oats, high protein)...",
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/recipes?q=${encodeURIComponent(q)}` : "/recipes");
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex w-full items-center ${className}`}>
      <Search className="pointer-events-none absolute left-4 h-5 w-5 text-[#777F78]" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search recipes"
        className="w-full rounded-full border border-[#DCE2DC] bg-white py-3.5 pl-12 pr-28 text-sm text-[#292D2A] shadow-sm placeholder:text-[#777F78] focus:border-[#78947C] focus:outline-none focus:ring-2 focus:ring-[#E7EFE7]"
      />
      <button
        type="submit"
        className="absolute right-1.5 rounded-full bg-[#78947C] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#647F68]"
      >
        Search
      </button>
    </form>
  );
}

