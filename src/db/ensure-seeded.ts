import { getDb } from "@/db/schema";
import { seedDatabase } from "@/db/seed";

let checked = false;

export function ensureSeeded(): void {
  if (checked) return;
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as c FROM recipes`).get() as { c: number };
  const legacy = db
    .prepare(`SELECT COUNT(*) as c FROM recipes WHERE id NOT LIKE 'real-%'`)
    .get() as { c: number };
  if (row.c === 0 || legacy.c > 0) {
    seedDatabase(legacy.c > 0);
  }
  checked = true;
}

