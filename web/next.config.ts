import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // web/ sits inside the mobile app's repo, which has its own lockfile.
  turbopack: {
    root: path.resolve(process.cwd()),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  outputFileTracingRoot: path.resolve(process.cwd()),
  images: {
    // Product, farm and profile photos are served from Convex file storage.
    remotePatterns: [{ protocol: "https", hostname: "*.convex.cloud", pathname: "/api/storage/**" }],
  },
};

export default nextConfig;
