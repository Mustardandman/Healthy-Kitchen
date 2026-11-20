import { CategoryPageShell } from "@/components/CategoryPageShell";

export const dynamic = "force-dynamic";

export default function DinnerPage() {
  return (
    <CategoryPageShell
      category="dinner"
      title="Dinner Recipes & Subcategories"
      subtitle="Explore 18 dedicated dinner styles—from sheet pan meals, air fryer favorites, and slow cooker stews to Mexican-, Italian-, and Asian-inspired family plates."
      showDistinctSubcategoryGrid={true}
    />
  );
}

