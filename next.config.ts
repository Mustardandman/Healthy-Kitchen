import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: "https", hostname: "edamam-product-images.s3.amazonaws.com" },
      { protocol: "https", hostname: "img.spoonacular.com" },
      { protocol: "https", hostname: "spoonacular.com" },
    ],
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;

