"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Leaf, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/breakfast", label: "Breakfast" },
  { href: "/lunch", label: "Lunch" },
  { href: "/dinner", label: "Dinner" },
  { href: "/snacks", label: "Snacks" },
  { href: "/find-recipes", label: "Find Recipes" },
  { href: "/meal-planner", label: "Meal Planner" },
  { href: "/favorites", label: "Favorites" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E4E7E4] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E7EFE7] text-[#557059] transition-colors group-hover:bg-[#78947C] group-hover:text-white">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-[#292D2A]">
            Nourish
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E7EFE7] text-[#292D2A]"
                    : "text-[#777F78] hover:bg-[#F7F8F7] hover:text-[#292D2A]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E4E7E4] text-[#292D2A] lg:hidden"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-[#E4E7E4] bg-white px-4 py-3 lg:hidden"
        >
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#E7EFE7] text-[#292D2A]"
                      : "bg-[#F7F8F7] text-[#575E58] hover:text-[#292D2A]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
