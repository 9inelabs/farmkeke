import type { MetadataRoute } from "next";
import { getSitemapData } from "@/components/shop/data";
import { routes } from "@/lib/routes";
import { SITE_URL } from "@/lib/siteUrl";

const siteUrl = SITE_URL;

// Static pages from routes, category pages, and product and farm pages found
// through the storefront queries (cached for an hour).
const STATIC: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: routes.home, priority: 1, changeFrequency: "weekly" },
  { path: routes.shop, priority: 0.9, changeFrequency: "daily" },
  { path: routes.categories, priority: 0.8, changeFrequency: "weekly" },
  { path: routes.allProducts, priority: 0.8, changeFrequency: "daily" },
  { path: routes.sell, priority: 0.6, changeFrequency: "monthly" },
  { path: routes.howItWorks, priority: 0.6, changeFrequency: "monthly" },
  { path: routes.escrow, priority: 0.6, changeFrequency: "monthly" },
  { path: routes.getTheApp, priority: 0.6, changeFrequency: "monthly" },
  { path: routes.about, priority: 0.5, changeFrequency: "monthly" },
  { path: routes.help, priority: 0.5, changeFrequency: "monthly" },
  { path: routes.contact, priority: 0.4, changeFrequency: "monthly" },
  { path: routes.legal("refunds"), priority: 0.3, changeFrequency: "monthly" },
  { path: routes.legal("terms"), priority: 0.3, changeFrequency: "monthly" },
  { path: routes.legal("privacy"), priority: 0.3, changeFrequency: "monthly" },
  { path: routes.legal("farmer-terms"), priority: 0.3, changeFrequency: "monthly" },
  { path: routes.legal("cookies"), priority: 0.3, changeFrequency: "monthly" },
  { path: routes.legal("delivery"), priority: 0.3, changeFrequency: "monthly" },
  { path: routes.legal("acceptable-use"), priority: 0.3, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  return [
    ...STATIC.map((s) => ({ url: `${siteUrl}${s.path}`, priority: s.priority, changeFrequency: s.changeFrequency })),
    ...data.categories.map((slug) => ({ url: `${siteUrl}${routes.category(slug)}`, priority: 0.8, changeFrequency: "daily" as const })),
    ...data.products.map((id) => ({ url: `${siteUrl}${routes.product(id)}`, priority: 0.7, changeFrequency: "daily" as const })),
    ...data.farms.map((id) => ({ url: `${siteUrl}${routes.farm(id)}`, priority: 0.6, changeFrequency: "weekly" as const })),
  ];
}
