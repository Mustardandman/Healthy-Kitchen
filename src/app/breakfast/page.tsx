import { CategoryPageShell } from "@/components/CategoryPageShell";

export const dynamic = "force-dynamic";

export default function BreakfastPage() {
  return (
    <CategoryPageShell
      category="breakfast"
      title="Breakfast Recipes"
      subtitle="Start your morning with balanced combinations of thoroughly cooked eggs, Greek yogurt, rolled oats, whole-grain toast, and fiber-rich berries."
    />
  );
}

