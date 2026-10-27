// The website's public address, e.g. "https://farmkeke.com", for absolute
// links. Set in next.config.ts (from NEXT_PUBLIC_SITE_URL, never localhost on
// Vercel) and fixed when the site is built.
export const SITE_URL = (process.env.FARMKEKE_SITE_URL || "https://farmkeke.com").replace(/\/+$/, "");
