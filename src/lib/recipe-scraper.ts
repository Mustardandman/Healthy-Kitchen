import type { RecipeStep } from "@/types/recipe";

const ONE_HOUR_MS = 60 * 60 * 1000;
const instructionsCache = new Map<string, { expiresAt: number; steps: RecipeStep[] }>();

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  deg: "°",
  ndash: "–",
  mdash: "—",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeHtmlAndStripTags(input: string): string {
  const withoutTags = input.replace(/<[^>]+>/g, " ");
  const decoded = withoutTags
    .replace(/&#(\d+);/g, (_, num) => {
      const code = Number(num);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-z0-9]+);/gi, (full, name: string) => HTML_ENTITY_MAP[name.toLowerCase()] ?? full);

  return decoded
    .replace(/\s+/g, " ")
    .replace(/^(?:step\s*)?\d+\s*[:.)\-]\s*/i, "")
    .trim();
}

function isAllowedPublicRecipeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "::1" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function collectInstructionStrings(node: unknown, out: string[]): void {
  if (!node) return;
  if (typeof node === "string") {
    const parts = node
      .split(/\r?\n+|(?<=\.)\s+(?=[A-Z])/)
      .map(decodeHtmlAndStripTags)
      .filter((s) => s.length >= 6);
    for (const p of parts) out.push(p);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectInstructionStrings(item, out);
    }
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.text === "string") {
      const clean = decodeHtmlAndStripTags(obj.text);
      if (clean.length >= 6) out.push(clean);
      return;
    }
    if (Array.isArray(obj.itemListElement)) {
      collectInstructionStrings(obj.itemListElement, out);
      return;
    }
    if (typeof obj.name === "string" && !obj["@type"]?.toString().includes("HowToSection")) {
      const clean = decodeHtmlAndStripTags(obj.name);
      if (clean.length >= 6) out.push(clean);
    }
  }
}

function findRecipeInstructionsInJsonLd(node: unknown): unknown {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeInstructionsInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.recipeInstructions) {
      return obj.recipeInstructions;
    }
    if (Array.isArray(obj["@graph"])) {
      const found = findRecipeInstructionsInJsonLd(obj["@graph"]);
      if (found) return found;
    }
    for (const val of Object.values(obj)) {
      if (typeof val === "object" && val !== null) {
        const found = findRecipeInstructionsInJsonLd(val);
        if (found) return found;
      }
    }
  }
  return null;
}

export function parseInstructionsFromHtml(html: string): RecipeStep[] {
  const extracted: string[] = [];

  // 1. Parse all Schema.org JSON-LD blocks (supports WPRM, Tasty Recipes, Mediavine, Allrecipes, etc.)
  const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const rawInst = findRecipeInstructionsInJsonLd(parsed);
      if (rawInst) {
        collectInstructionStrings(rawInst, extracted);
        if (extracted.length > 0) break;
      }
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }

  // 2. Fallback to common WordPress recipe card HTML markup
  if (extracted.length === 0) {
    const wprmRegex =
      /<(?:div|span|li)[^>]*class=["'][^"']*(?:wprm-recipe-instruction-text|tasty-recipes-instructions-body|mv-create-instructions)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|li)>/gi;
    while ((match = wprmRegex.exec(html)) !== null) {
      const clean = decodeHtmlAndStripTags(match[1]);
      if (clean.length >= 6) extracted.push(clean);
    }
  }

  const deduped: RecipeStep[] = [];
  const seen = new Set<string>();
  for (const text of extracted) {
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ step: deduped.length + 1, instruction: text });
    if (deduped.length >= 20) break;
  }

  return deduped;
}

export async function extractRecipeInstructionsFromUrl(url: string): Promise<RecipeStep[]> {
  if (!url || !isAllowedPublicRecipeUrl(url)) return [];

  const cached = instructionsCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.steps;
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return [];

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return [];
    }

    const html = await res.text();
    const steps = parseInstructionsFromHtml(html);

    if (steps.length > 0) {
      instructionsCache.set(url, {
        expiresAt: Date.now() + ONE_HOUR_MS,
        steps,
      });
    }

    return steps;
  } catch {
    return [];
  }
}

