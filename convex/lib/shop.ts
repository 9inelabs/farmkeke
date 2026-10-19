// Shared building blocks for the shop pages (storefront.*, W-01 to W-07):
// listing cards, farm rows, filters and sorts, ratings, distances, freshness
// labels and farm response times. Queries never read the clock, so "today"
// and the shopper's position come in as arguments.
import { ConvexError, v, type Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { farmDistanceKm, type Point } from "./geo";
import { isOutOfStock } from "./listing";
import { farmIsOpen, isShopListing, readCount } from "./listingCounts";

export const sortKey = v.union(
  v.literal("newest"),
  v.literal("price_low"),
  v.literal("price_high"),
  v.literal("freshest"),
  // Phase 3c
  v.literal("nearest"),
  v.literal("top_rated"),
);
export type SortKey = Infer<typeof sortKey>;

/** Filters shared by collection, categoryListings and search. The first block is the live API. */
export const listFilterArgs = {
  delivery: v.optional(v.boolean()),
  farmLga: v.optional(v.string()),
  farmState: v.optional(v.string()),
  limit: v.optional(v.number()),
  maxPriceKobo: v.optional(v.number()),
  minPriceKobo: v.optional(v.number()),
  pickup: v.optional(v.boolean()),
  sort: v.optional(sortKey),
  // Phase 3c (W-03, W-04, W-05)
  harvestedWithinDays: v.optional(v.number()),
  minRating: v.optional(v.number()),
  maxDistanceKm: v.optional(v.number()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
};

export type ListFilters = {
  delivery?: boolean;
  farmLga?: string;
  farmState?: string;
  limit?: number;
  maxPriceKobo?: number;
  minPriceKobo?: number;
  pickup?: boolean;
  sort?: SortKey;
  harvestedWithinDays?: number;
  minRating?: number;
  maxDistanceKm?: number;
};

export const DEFAULT_LIMIT = 24;
export const MAX_LIMIT = 200;
// Freshness labels stop after two weeks, like the website's own helper.
const FRESHNESS_DAYS = 14;
// Response-time samples kept per farm.
const RESPONSE_SAMPLES = 25;

export const pageSize = (limit: number | undefined) =>
  Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit ?? DEFAULT_LIMIT)));

const DAY_MS = 86_400_000;
const dayNumber = (ymd: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const t = Date.parse(`${ymd}T12:00:00Z`);
  return Number.isNaN(t) ? null : Math.round(t / DAY_MS);
};

/** Whole days from the harvest date to `today`; null when unknown or in the future. */
export function daysSinceHarvest(harvestedOn: string | undefined, today: string | undefined): number | null {
  if (harvestedOn === undefined || today === undefined) return null;
  const h = dayNumber(harvestedOn);
  const t = dayNumber(today);
  if (h === null || t === null || h > t) return null;
  return t - h;
}

/** "Harvested today", "Harvested yesterday", "Harvested 3 days ago"; null past two weeks. */
export function freshnessLabel(harvestedOn: string | undefined, today: string | undefined): string | null {
  const days = daysSinceHarvest(harvestedOn, today);
  if (days === null || days > FRESHNESS_DAYS) return null;
  if (days === 0) return "Harvested today";
  if (days === 1) return "Harvested yesterday";
  return `Harvested ${days} days ago`;
}

/** The unit a card shows: the first one still in stock, else the first. */
export const offerOf = (listing: Doc<"listings">) => listing.units.find((u) => u.stock > 0) ?? listing.units[0];

export const ratingOf = (stats: Doc<"reviewStats"> | null) =>
  stats === null || stats.count === 0
    ? { rating: null, ratingCount: 0 }
    : { rating: Math.round((stats.totalStars / stats.count) * 10) / 10, ratingCount: stats.count };

/** Median of the farm's recent payment-to-acceptance times, in hours (1 decimal); null with no history. */
export async function responseTimeHours(ctx: QueryCtx, farmId: Id<"farms">): Promise<number | null> {
  const row = await ctx.db
    .query("farmStats")
    .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
    .unique();
  if (row === null || row.responseHours.length === 0) return null;
  const sorted = [...row.responseHours].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(median * 10) / 10;
}

/** Called when a farm accepts an order: keeps the last few response times. */
export async function recordResponseTime(ctx: MutationCtx, farmId: Id<"farms">, hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return;
  const sample = Math.round(hours * 100) / 100;
  const row = await ctx.db
    .query("farmStats")
    .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
    .unique();
  if (row === null) {
    await ctx.db.insert("farmStats", { farmId, responseHours: [sample] });
  } else {
    await ctx.db.patch("farmStats", row._id, { responseHours: [...row.responseHours, sample].slice(-RESPONSE_SAMPLES) });
  }
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/** W-58: median minutes the farm took to answer a shopper's message; null with no history. */
export async function replyTimeMinutes(ctx: QueryCtx, farmId: Id<"farms">): Promise<number | null> {
  const row = await ctx.db
    .query("farmStats")
    .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
    .unique();
  const samples = row?.replyMinutes ?? [];
  return samples.length === 0 ? null : Math.round(median(samples));
}

/** "Usually replies within an hour" / "within 3 hours" / "within 2 days". */
export function replyNoteFor(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes <= 60) return "Usually replies within an hour";
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `Usually replies within ${hours} hours`;
  const days = Math.ceil(hours / 24);
  return days === 1 ? "Usually replies within a day" : `Usually replies within ${days} days`;
}

/** Called when a farm answers a shopper's message: keeps the last few reply times. */
export async function recordReplyMinutes(ctx: MutationCtx, farmId: Id<"farms">, minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 0) return;
  const sample = Math.round(minutes * 10) / 10;
  const row = await ctx.db
    .query("farmStats")
    .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
    .unique();
  if (row === null) {
    await ctx.db.insert("farmStats", { farmId, responseHours: [], replyMinutes: [sample] });
  } else {
    await ctx.db.patch("farmStats", row._id, { replyMinutes: [...(row.replyMinutes ?? []), sample].slice(-RESPONSE_SAMPLES) });
  }
}

/** A candidate listing with what filters and sorts need. */
export type Entry = {
  listing: Doc<"listings">;
  farm: Doc<"farms">;
  priceKobo: number;
  inStock: boolean;
  rating: number | null;
  ratingCount: number;
  distanceKm: number | null;
};

/** Per-query reader with caches for farms, units, categories and review stats. */
export function shopReader(ctx: QueryCtx, opts: { today?: string; from: Point | null }) {
  const farms = new Map<Id<"farms">, Doc<"farms"> | null>();
  const units = new Map<Id<"units">, Doc<"units"> | null>();
  const categories = new Map<Id<"categories">, Doc<"categories"> | null>();
  const stats = new Map<Id<"farms">, { rating: number | null; ratingCount: number }>();
  const farmCounts = new Map<Id<"farms">, number>();

  const farm = async (id: Id<"farms">) => {
    if (!farms.has(id)) farms.set(id, await ctx.db.get("farms", id));
    return farms.get(id) ?? null;
  };
  const openFarm = async (id: Id<"farms">) => {
    const f = await farm(id);
    return farmIsOpen(f) ? f : null;
  };
  const unit = async (id: Id<"units">) => {
    if (!units.has(id)) units.set(id, await ctx.db.get("units", id));
    return units.get(id) ?? null;
  };
  const category = async (id: Id<"categories"> | undefined) => {
    if (id === undefined) return null;
    if (!categories.has(id)) categories.set(id, await ctx.db.get("categories", id));
    return categories.get(id) ?? null;
  };
  const rating = async (farmId: Id<"farms">) => {
    if (!stats.has(farmId)) {
      const row = await ctx.db
        .query("reviewStats")
        .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
        .unique();
      stats.set(farmId, ratingOf(row));
    }
    return stats.get(farmId)!;
  };
  const productCount = async (farmId: Id<"farms">) => {
    if (!farmCounts.has(farmId)) farmCounts.set(farmId, await readCount(ctx, "farm", farmId));
    return farmCounts.get(farmId)!;
  };

  /** The listing as a shop candidate, or null when it can't be shown. */
  const entry = async (listing: Doc<"listings">): Promise<Entry | null> => {
    if (!isShopListing(listing) || listing.units.length === 0) return null;
    const f = await openFarm(listing.farmId);
    if (f === null) return null;
    const r = await rating(f._id);
    return {
      listing,
      farm: f,
      priceKobo: offerOf(listing)!.priceKobo,
      inStock: !isOutOfStock(listing.units),
      rating: r.rating,
      ratingCount: r.ratingCount,
      distanceKm: farmDistanceKm(opts.from, f),
    };
  };

  /** ListingSummary: the live fields first, then the Phase 3c additions. */
  const card = async (listing: Doc<"listings">, known?: Entry) => {
    const offer = offerOf(listing);
    const u = offer ? await unit(offer.unitId) : null;
    const f = known?.farm ?? (await farm(listing.farmId));
    const c = await category(listing.categoryId);
    const r = known ? { rating: known.rating, ratingCount: known.ratingCount } : await rating(listing.farmId);
    return {
      id: listing._id,
      name: listing.name,
      priceKobo: offer?.priceKobo ?? 0,
      unit: u?.singular ?? "unit",
      imageUrl: listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null,
      farmId: listing.farmId,
      farmName: f?.name ?? "Farm",
      farmVerified: f !== null && f.status === "active",
      farmRating: r.rating,
      farmRatingCount: r.ratingCount,
      harvestedOn: listing.harvestedOn ?? null,
      freshness: freshnessLabel(listing.harvestedOn, opts.today),
      inStock: !isOutOfStock(listing.units),
      delivery: listing.delivery,
      pickup: listing.pickup,
      category: c === null ? null : { slug: c.slug, name: c.name },
      subtype: listing.subtype ?? null,
      distanceKm: known?.distanceKm ?? (f === null ? null : farmDistanceKm(opts.from, f)),
    };
  };

  /** FarmSummary: the live fields first, then the Phase 3c additions. */
  const farmRow = async (f: Doc<"farms">) => {
    const r = await rating(f._id);
    return {
      id: f._id,
      name: f.name,
      area: f.lga,
      photoUrl: f.photoStorageId ? await ctx.storage.getUrl(f.photoStorageId) : null,
      lga: f.lga,
      state: f.state,
      verified: f.status === "active",
      rating: r.rating,
      ratingCount: r.ratingCount,
      productCount: await productCount(f._id),
      distanceKm: farmDistanceKm(opts.from, f),
    };
  };

  return { farm, openFarm, unit, category, rating, productCount, entry, card, farmRow };
}

export type ShopReader = ReturnType<typeof shopReader>;

/** Farm-level filters (area, rating, distance), shared by listings and farm rows. */
export function farmPasses(
  f: { farm: Doc<"farms">; rating: number | null; distanceKm: number | null },
  args: ListFilters,
) {
  if (args.farmLga !== undefined && f.farm.lga !== args.farmLga) return false;
  if (args.farmState !== undefined && f.farm.state !== args.farmState) return false;
  if (args.minRating !== undefined && (f.rating === null || f.rating < args.minRating)) return false;
  if (args.maxDistanceKm !== undefined && (f.distanceKm === null || f.distanceKm > args.maxDistanceKm)) return false;
  return true;
}

/** Checks filter arguments that need other arguments. */
export function checkFilters(args: ListFilters, today: string | undefined, from: Point | null) {
  if (args.harvestedWithinDays !== undefined && today === undefined) {
    throw new ConvexError({ code: "TODAY_REQUIRED", message: "harvestedWithinDays needs today" });
  }
  if ((args.maxDistanceKm !== undefined || args.sort === "nearest") && from === null) {
    throw new ConvexError({ code: "LOCATION_REQUIRED", message: "maxDistanceKm and sort nearest need lat and lng" });
  }
}

export function passes(e: Entry, args: ListFilters, today: string | undefined) {
  if (args.delivery === true && !e.listing.delivery) return false;
  if (args.pickup === true && !e.listing.pickup) return false;
  if (args.minPriceKobo !== undefined && e.priceKobo < args.minPriceKobo) return false;
  if (args.maxPriceKobo !== undefined && e.priceKobo > args.maxPriceKobo) return false;
  if (args.harvestedWithinDays !== undefined) {
    const days = daysSinceHarvest(e.listing.harvestedOn, today);
    if (days === null || days > args.harvestedWithinDays) return false;
  }
  return farmPasses(e, args);
}

const newestAt = (l: Doc<"listings">) => l.liveAt ?? l.submittedAt ?? l._creationTime;
const nullsLast = (a: number | null, b: number | null) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : a - b);

/** Sorts in place. With no sort the input order is kept (newest, or search relevance). In-stock listings come first. */
export function sortEntries(entries: Entry[], sort: SortKey | undefined) {
  const bySort: Record<SortKey, (a: Entry, b: Entry) => number> = {
    newest: (a, b) => newestAt(b.listing) - newestAt(a.listing),
    price_low: (a, b) => a.priceKobo - b.priceKobo,
    price_high: (a, b) => b.priceKobo - a.priceKobo,
    freshest: (a, b) =>
      (b.listing.harvestedOn ?? "").localeCompare(a.listing.harvestedOn ?? "") || newestAt(b.listing) - newestAt(a.listing),
    nearest: (a, b) => nullsLast(a.distanceKm, b.distanceKm) || newestAt(b.listing) - newestAt(a.listing),
    top_rated: (a, b) =>
      nullsLast(a.rating === null ? null : -a.rating, b.rating === null ? null : -b.rating) || b.ratingCount - a.ratingCount,
  };
  if (sort !== undefined) entries.sort(bySort[sort]);
  entries.sort((a, b) => Number(b.inStock) - Number(a.inStock));
  return entries;
}

/** Filters, sorts and pages candidate listings into `{ items, hasMore, total }`. */
export async function listPage(
  shop: ShopReader,
  candidates: Doc<"listings">[],
  args: ListFilters,
  today: string | undefined,
  options: { inStockOnly?: boolean } = {},
) {
  const seen = new Set<Id<"listings">>();
  const entries: Entry[] = [];
  for (const listing of candidates) {
    if (seen.has(listing._id)) continue;
    seen.add(listing._id);
    const e = await shop.entry(listing);
    if (e === null || (options.inStockOnly && !e.inStock) || !passes(e, args, today)) continue;
    entries.push(e);
  }
  sortEntries(entries, args.sort);
  const limit = pageSize(args.limit);
  const items = await Promise.all(entries.slice(0, limit).map((e) => shop.card(e.listing, e)));
  return { items, hasMore: entries.length > limit, total: entries.length, entries };
}
