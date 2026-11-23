"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncSharedFavoritesWithServer } from "@/lib/favorites-client";

export function FavoritesSyncBridge() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    syncSharedFavoritesWithServer()
      .then((result) => {
        if (active && result.restored) {
          router.refresh();
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  return null;
}

