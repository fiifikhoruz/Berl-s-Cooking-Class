import type { NextConfig } from "next";

const nextConfig: NextConfig = process.env.VERCEL
  ? {
      turbopack: {
        resolveAlias: {
          "cloudflare:workers": "./lib/cloudflare-workers-vercel.ts",
        },
      },
    }
  : {};

export default nextConfig;
