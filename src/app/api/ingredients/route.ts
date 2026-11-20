import { NextRequest, NextResponse } from "next/server";
import { ensureSeeded } from "@/db/ensure-seeded";
import { getIngredientSuggestions } from "@/db/queries";

export async function GET(request: NextRequest) {
  try {
    ensureSeeded();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const suggestions = getIngredientSuggestions(q);
    return NextResponse.json({ items: suggestions });
  } catch (error) {
    console.error("Error loading ingredient suggestions:", error);
    return NextResponse.json({ error: "Failed to load ingredients" }, { status: 500 });
  }
}

