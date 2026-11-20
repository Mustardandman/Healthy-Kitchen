import { CategoryPageShell } from "@/components/CategoryPageShell";

export const dynamic = "force-dynamic";

export default async function LunchPage({
  searchParams,
}: {
  searchParams: Promise<{ maxTime?: string }>;
}) {
  const sp = await searchParams;
  const maxTime = sp.maxTime ? Number(sp.maxTime) : undefined;
  return (
    <CategoryPageShell
      category="lunch"
      title="Lunch Recipes"
      subtitle="Satisfying salads, whole-grain wraps, sandwiches, comforting soups, and grain bowls crafted with pregnancy-safe proteins and steady fiber."
      initialMaxTime={maxTime}
    />
  );
}

