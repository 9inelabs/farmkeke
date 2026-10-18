// URL filters for W-03 Category and W-04 Search, shared by the server pages
// and the client islands (no server-only imports here).
import type { SortKey } from "@/convex/returns/storefront";

/** Filters shared by category and search pages; all live in the URL. */
export type ListFilters = {
  sort?: SortKey;
  delivery?: boolean;
  pickup?: boolean;
  minPriceKobo?: number;
  maxPriceKobo?: number;
  farmLga?: string;
  farmState?: string;
  /** W-03 "Type" */
  subtype?: string;
  /** "Harvested": 0 today, 3 last 3 days, 7 this week */
  harvestedWithinDays?: number;
  /** "Top-rated farms only (4.5+)" */
  minRating?: number;
  /** "Distance to farm": needs lat/lng, so only the browser can ask for it */
  maxDistanceKm?: number;
  /** W-04 category chip */
  categorySlug?: string;
  limit: number;
};

type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SORTS: SortKey[] = ["newest", "price_low", "price_high", "freshest", "nearest", "top_rated"];
export const HARVESTED = { today: 0, "3": 3, "7": 7 } as const;
export const DISTANCES = ["5", "15"] as const;
export const TOP_RATED = 4.5;

/** Reads ?sort=&get=delivery|pickup&min=&max=&area=LGA|State&type=&fresh=today|3|7&dist=5|15&rated=1&cat=&show= */
export function parseFilters(sp: RawParams, pageSize: number): ListFilters {
  const sort = one(sp.sort) as SortKey | undefined;
  const get = one(sp.get);
  const naira = (v: string | undefined) => {
    const n = Number((v ?? "").replace(/[^d]/g, ""));
    return v && Number.isFinite(n) && n > 0 ? n * 100 : undefined;
  };
  const [farmLga, farmState] = (one(sp.area) ?? "").split("|");
  const show = Number(one(sp.show));
  const fresh = one(sp.fresh) as keyof typeof HARVESTED | undefined;
  const dist = one(sp.dist);
  const type = one(sp.type)?.trim();
  const cat = one(sp.cat)?.trim();
  return {
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    delivery: get === "delivery" ? true : undefined,
    pickup: get === "pickup" ? true : undefined,
    minPriceKobo: naira(one(sp.min)),
    maxPriceKobo: naira(one(sp.max)),
    farmLga: farmLga || undefined,
    farmState: farmState || undefined,
    subtype: type || undefined,
    harvestedWithinDays: fresh && fresh in HARVESTED ? HARVESTED[fresh] : undefined,
    minRating: one(sp.rated) === "1" ? TOP_RATED : undefined,
    maxDistanceKm: dist && (DISTANCES as readonly string[]).includes(dist) ? Number(dist) : undefined,
    categorySlug: cat || undefined,
    limit: Number.isFinite(show) && show > 0 ? Math.min(Math.floor(show), 200) : pageSize,
  };
}

/** True when the filters need the shopper's position (distance filter or Nearest sort). */
export const needsLocation = (f: Pick<ListFilters, "sort" | "maxDistanceKm">) =>
  f.maxDistanceKm !== undefined || f.sort === "nearest";

/** The filters the server can run without a position (for the first HTML). */
export function withoutLocation<T extends Pick<ListFilters, "sort" | "maxDistanceKm">>(f: T): T {
  return { ...f, maxDistanceKm: undefined, sort: f.sort === "nearest" ? undefined : f.sort };
}

export const clean = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** storefront.categoryListings args (without lat/lng). */
export function categoryArgs(slug: string, f: ListFilters, today: string) {
  const { categorySlug: _c, ...rest } = f;
  void _c;
  return clean({ slug, ...rest, today });
}

/** storefront.search args (without lat/lng). */
export function searchArgs(text: string, f: ListFilters, today: string) {
  const { subtype: _s, ...rest } = f;
  void _s;
  return clean({ text, ...rest, today });
}
