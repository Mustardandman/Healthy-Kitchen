import { getDb } from "@/db/schema";
import { seedDatabase } from "@/db/seed";

let checked = false;

export function ensureSeeded(): void {
  if (checked) return;
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as c FROM recipes`).get() as { c: number };
  if (row.c === 0) {
    seedDatabase(false);
  }
  checked = true;
}

