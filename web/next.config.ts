import path from "node:path";
import type { NextConfig } from "next";

// The Admin Portal's own host (src/lib/adminHost.ts, src/proxy.ts):
// NEXT_PUBLIC_ADMIN_HOST when it's set, otherwise admin.farmkeke.com on Vercel
// production builds. Preview and local builds keep the portal at /admin.
// Read when the site is built, so a change needs a redeploy.
const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim() || (process.env.VERCEL_ENV === "production" ? "admin.farmkeke.com" : "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  env: { FARMKEKE_ADMIN_HOST: adminHost },
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No other site may show these pages in a frame (stops clickjacking, e.g. on the Admin Portal)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Location is used to find the shopper's area; nothing needs the camera or microphone
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // The Admin Portal is never cached by shared caches, and never indexed
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
