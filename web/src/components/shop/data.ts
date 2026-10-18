// Server-side, cached reads for the public shop pages (W-01 to W-07).
// Everything here runs inside "use cache" with cacheLife("minutes") so the
// pages are server-rendered for search engines. Public data only.
import { cacheLife } from "next/cache";
import { api, type Id } from "@/convex/api";
import { getCategories } from "@/convex/cached";
import type {
  CategoryListings,
  CollectionListings,
  FarmArea,
  FarmProfile,
  ProductResult,
  ReviewPage,
  ReviewSummary,
  SearchResults,
  SortKey,
  StorefrontHome,
} from "@/convex/returns/storefront";
import type { ListingSummary } from "@/convex/returns/common";
import { serverQuery } from "@/convex/server";
import { todayInLagos } from "@/lib/format";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://farmkeke.com").replace(/\/$/, "");

/** Filters shared by category and search pages; all live in the URL. */
export type ListFilters = {
  sort?: SortKey;
  delivery?: boolean;
  pickup?: boolean;
  minPriceKobo?: number;
  maxPriceKobo?: number;
  farmLga?: string;
  farmState?: string;
  limit: number;
};

type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORTS: SortKey[] = ["newest", "price_low", "price_high", "freshest"];

/** Reads ?sort=&get=delivery|pickup&min=&max=&area=LGA|State&show= */
export function parseFilters(sp: RawParams, pageSize: number): ListFilters {
  const sort = one(sp.sort) as SortKey | undefined;
  const get = one(sp.get);
  const naira = (v: string | undefined) => {
    const n = Number((v ?? "").replace(/[^\d]/g, ""));
    return v && Number.isFinite(n) && n > 0 ? n * 100 : undefined;
  };
  const [farmLga, farmState] = (one(sp.area) ?? "").split("|");
  const show = Number(one(sp.show));
  return {
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    delivery: get === "delivery" ? true : undefined,
    pickup: get === "pickup" ? true : undefined,
    minPriceKobo: naira(one(sp.min)),
    maxPriceKobo: naira(one(sp.max)),
    farmLga: farmLga || undefined,
    farmState: farmState || undefined,
    limit: Number.isFinite(show) && show > 0 ? Math.min(Math.floor(show), 200) : pageSize,
  };
}

const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export async function getHome(): Promise<StorefrontHome> {
  "use cache";
  cacheLife("minutes");
  return (await serverQuery(api.storefront.home, { today: todayInLagos() })) as StorefrontHome;
}

export async function getCategoryListings(slug: string, f: ListFilters): Promise<CategoryListings | null> {
  "use cache";
  cacheLife("minutes");
  return (await serverQuery(api.storefront.categoryListings, clean({ slug, ...f }))) as CategoryListings | null;
}

export async function getSearch(text: string, f: ListFilters): Promise<SearchResults> {
  "use cache";
  cacheLife("minutes");
  return (await serverQuery(api.storefront.search, clean({ text, ...f }))) as SearchResults;
}

export async function getFarmAreas(): Promise<FarmArea[]> {
  "use cache";
  cacheLife("minutes");
  return ((await serverQuery(api.storefront.farmAreas, {})) as FarmArea[] | null) ?? [];
}

export async function getProduct(id: string): Promise<ProductResult> {
  "use cache";
  cacheLife("minutes");
  try {
    return (await serverQuery(api.storefront.product, { id })) as ProductResult;
  } catch {
    // A malformed id is rejected by the backend's validator: treat as not found.
    return null;
  }
}

export async function getFarm(id: string): Promise<FarmProfile | null> {
  "use cache";
  cacheLife("minutes");
  try {
    return (await serverQuery(api.storefront.farm, { id })) as FarmProfile | null;
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
    return ((await serverQuery(api.storefront.popular, {})) as ListingSummary[] | null) ?? [];
  } catch {
    return [];
  }
}

/** Product count per category slug, for W-02. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  "use cache";
  cacheLife("minutes");
  const cats = await getCategories();
  const rows = await Promise.all(
    cats.map(async (c) => {
      try {
        const r = (await serverQuery(api.storefront.categoryListings, { slug: c.slug, limit: 1 })) as CategoryListings | null;
        return [c.slug, r?.total ?? 0] as const;
      } catch {
        return [c.slug, 0] as const;
      }
    }),
  );
  return Object.fromEntries(rows);
}

/** Everything the sitemap lists: categories, products and farms. */
export async function getSitemapData() {
  "use cache";
  cacheLife("hours");
  const cats = await getCategories();
  const products = new Map<string, true>();
  const farms = new Map<string, true>();
  const add = (items: ListingSummary[] | undefined) => items?.forEach((i) => products.set(i.id, true));
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

/** "Harvested today" / "Harvested yesterday" / "Harvested 3 days ago" from "YYYY-MM-DD". */
export function freshnessLabel(harvestedOn: string | null | undefined, today: string): string | undefined {
  if (!harvestedOn) return undefined;
  const days = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${harvestedOn}T12:00:00Z`)) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return undefined;
  if (days === 0) return "Harvested today";
  if (days === 1) return "Harvested yesterday";
  if (days <= 14) return `Harvested ${days} days ago`;
  return undefined;
}

/** Cached "today" so server components never read the clock while prerendering. */
export async function getToday(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  return todayInLagos();
}
