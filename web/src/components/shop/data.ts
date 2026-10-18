// Server-side, cached reads for the public shop pages (W-01 to W-07).
// Everything here runs inside "use cache" with cacheLife("minutes") so the
// pages are server-rendered for search engines. Public data only.
import { cacheLife } from "next/cache";
import { api, type Id } from "@/convex/api";
import { getCategories } from "@/convex/cached";
import type {
  CategoryListings,
  CategoryWithCounts,
  CollectionListings,
  FarmProfile,
  ProductResult,
  ReviewPage,
  ReviewSummary,
  SearchResults,
  StorefrontHome,
} from "@/convex/returns/storefront";
import type { ListingSummary } from "@/convex/returns/common";
import { serverQuery } from "@/convex/server";
import { todayInLagos } from "@/lib/format";
import { categoryArgs, searchArgs, withoutLocation, type ListFilters } from "./filters-shared";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://farmkeke.com").replace(/\/$/, "");

export {
  categoryArgs,
  clean,
  needsLocation,
  parseFilters,
  searchArgs,
  withoutLocation,
  type ListFilters,
} from "./filters-shared";

export async function getHome(): Promise<StorefrontHome> {
  "use cache";
  cacheLife("minutes");
  return (await serverQuery(api.storefront.home, { today: todayInLagos() })) as StorefrontHome;
}

export async function getCategoryListings(slug: string, f: ListFilters): Promise<CategoryListings | null> {
  "use cache";
  cacheLife("minutes");
  return (await serverQuery(
    api.storefront.categoryListings,
    categoryArgs(slug, withoutLocation(f), todayInLagos()),
  )) as CategoryListings | null;
}

export async function getSearch(text: string, f: ListFilters): Promise<SearchResults> {
  "use cache";
  cacheLife("minutes");
  return (await serverQuery(api.storefront.search, searchArgs(text, withoutLocation(f), todayInLagos()))) as SearchResults;
}

export async function getProduct(id: string): Promise<ProductResult> {
  "use cache";
  cacheLife("minutes");
  try {
    return (await serverQuery(api.storefront.product, { id, today: todayInLagos() })) as ProductResult;
  } catch {
    // A malformed id is rejected by the backend's validator: treat as not found.
    return null;
  }
}

export async function getFarm(id: string): Promise<FarmProfile | null> {
  "use cache";
  cacheLife("minutes");
  try {
    return (await serverQuery(api.storefront.farm, { id, today: todayInLagos() })) as FarmProfile | null;
  } catch {
    return null;
  }
}

export async function getReviews(farmId: string, numItems: number): Promise<{ summary: ReviewSummary; page: ReviewPage }> {
  "use cache";
  cacheLife("minutes");
  const fid = farmId as Id<"farms">;
  const empty = { summary: { average: null, count: 0, stars: [0, 0, 0, 0, 0] }, page: { page: [], isDone: true, continueCursor: "" } };
  try {
    const [summary, page] = await Promise.all([
      serverQuery(api.reviews.summary, { farmId: fid }) as Promise<ReviewSummary>,
      serverQuery(api.reviews.listPublic, { farmId: fid, paginationOpts: { cursor: null, numItems } }) as Promise<ReviewPage>,
    ]);
    return { summary: summary ?? empty.summary, page: page ?? empty.page };
  } catch {
    return empty;
  }
}

export async function getPopular(): Promise<ListingSummary[]> {
  "use cache";
  cacheLife("minutes");
  try {
    return ((await serverQuery(api.storefront.popular, { today: todayInLagos() })) as ListingSummary[] | null) ?? [];
  } catch {
    return [];
  }
}

/** W-02: categories with product counts and subtypes. */
export async function getCategoriesWithCounts(): Promise<CategoryWithCounts[]> {
  "use cache";
  cacheLife("minutes");
  try {
    const all = (await serverQuery(api.catalog.listCategoriesWithCounts, {})) as CategoryWithCounts[] | null;
    return (all ?? []).filter((c) => !c.hidden).sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    const cats = await getCategories();
    return cats.map((c) => ({ ...c, productCount: 0, subtypes: [] }));
  }
}

/** Everything the sitemap lists: categories, products and farms. */
export async function getSitemapData() {
  "use cache";
  cacheLife("hours");
  const cats = await getCategories();
  const products = new Map<string, true>();
  const farms = new Map<string, true>();
  const add = (items: ListingSummary[] | undefined) =>
    items?.forEach((i) => {
      products.set(i.id, true);
      if (i.farmId) farms.set(i.farmId, true);
    });
  try {
    const home = await getHome();
    add(home.freshPicks);
    add(home.pickedToday);
    home.farms.forEach((f) => farms.set(f.id, true));
    const fresh = (await serverQuery(api.storefront.collection, {
      kind: "fresh",
      today: todayInLagos(),
      limit: 200,
    })) as CollectionListings | null;
    add(fresh?.items);
  } catch {
    // Keep the static and category entries if the backend is unreachable.
  }
  add(await getPopular());
  for (const c of cats) {
    try {
      const r = (await serverQuery(api.storefront.categoryListings, { slug: c.slug, limit: 200 })) as CategoryListings | null;
      add(r?.items);
    } catch {
      // skip this category
    }
  }
  return { categories: cats.map((c) => c.slug), products: [...products.keys()], farms: [...farms.keys()] };
}

/** Cached "today" so server components never read the clock while prerendering. */
export async function getToday(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  return todayInLagos();
}
