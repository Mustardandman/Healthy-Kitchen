import type { RecipeCardItem, RecipeDetail } from "@/types/recipe";

export interface CloudFavoriteRecord {
  id: string;
  savedAt: string;
  snapshot?: RecipeCardItem;
  detail?: RecipeDetail;
}

export interface CloudFavoritesPayload {
  favorites: CloudFavoriteRecord[];
  updatedAt: string;
}

const UPSTASH_KEY = "nourish:shared_favorites_v1";
const GIST_FILENAME = "nourish-shared-favorites.json";

export function isCloudFavoritesConfigured(): boolean {
  const hasUpstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
  const hasGist = Boolean(process.env.GITHUB_TOKEN && process.env.FAVORITES_GIST_ID);
  return hasUpstash || hasGist;
}

export async function fetchCloudFavorites(): Promise<CloudFavoritesPayload | null> {
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (upstashUrl && upstashToken) {
      const res = await fetch(
        `${upstashUrl.replace(/\/$/, "")}/get/${encodeURIComponent(UPSTASH_KEY)}`,
        {
          headers: { Authorization: `Bearer ${upstashToken}` },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const json = (await res.json()) as { result?: string | null };
        if (json.result) {
          return JSON.parse(json.result) as CloudFavoritesPayload;
        }
      }
    }

    const gistId = process.env.FAVORITES_GIST_ID;
    const ghToken = process.env.GITHUB_TOKEN;
    if (gistId && ghToken) {
      const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const gist = (await res.json()) as {
          files?: Record<string, { content?: string }>;
        };
        const content = gist.files?.[GIST_FILENAME]?.content;
        if (content) {
          return JSON.parse(content) as CloudFavoritesPayload;
        }
      }
    }
  } catch {
    // Non-fatal; fallback to SQLite + browser sync
  }
  return null;
}

export async function pushCloudFavorites(payload: CloudFavoritesPayload): Promise<void> {
  try {
    const bodyStr = JSON.stringify(payload);
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (upstashUrl && upstashToken) {
      await fetch(`${upstashUrl.replace(/\/$/, "")}/set/${encodeURIComponent(UPSTASH_KEY)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: bodyStr,
        cache: "no-store",
      });
    }

    const gistId = process.env.FAVORITES_GIST_ID;
    const ghToken = process.env.GITHUB_TOKEN;
    if (gistId && ghToken) {
      await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: { content: bodyStr },
          },
        }),
        cache: "no-store",
      });
    }
  } catch {
    // Non-fatal; SQLite and localStorage continue working
  }
}

