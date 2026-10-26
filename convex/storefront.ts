// Shopping side: what anyone browsing sees (M-10 Home, W-01 to W-07). No
// sign-in needed. Only live listings from farms that are active and not on
// holiday are shown. Queries can't read the clock, so "today" (the shopper's
// "YYYY-MM-DD") and the shopper's position (lat/lng) come in as arguments.
//
// Every response keeps the fields the live API returned; Phase 3c only adds
// fields (see lib/shop.ts for the card and farm-row shapes).
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { farmDistanceKm, shopperPoint } from "./lib/geo";
import { farmIsOpen, isShopListing, readCount, subtypeKey } from "./lib/listingCounts";
import { getViewer } from "./lib/auth";
import {
  almostGone,
  arrange,
  BOUGHT,
  bestSellers,
  buyAgain,
  candidateOf,
  countsAsSale,
  freshPicks,
  greatValue,
  nearYou,
  SECTION_TITLES,
  topRated,
  weekStart,
  type Candidate,
} from "./lib/homeSections";
import { getRules } from "./lib/settings";
import {
  checkFilters,
  farmPasses,
  freshnessLabel,
  listFilterArgs,
  listPage,
  offerOf,
  pageSize,
  responseTimeHours,
  shopReader,
  type ShopReader,
} from "./lib/shop";
import { isOutOfStock } from "./lib/listing";

const ROW_SIZE = 10;
// Read a few more than a row holds, since some listings are filtered out.
const SCAN = 40;
// Candidates read for a grid before filtering and sorting in memory.
const GRID_SCAN = 500;
// Search hits read per index.
const SEARCH_SCAN = 200;
const FARM_SEARCH_SCAN = 20;
const FARM_LISTINGS = 200;
const SIMILAR = 8;

/** Home rows: buyable (in stock) cards, up to ROW_SIZE. */
async function buyableCards(shop: ShopReader, listings: Doc<"listings">[], limit = ROW_SIZE) {
  const cards = [];
  for (const listing of listings) {
    if (cards.length === limit) break;
    const e = await shop.entry(listing);
    if (e === null || !e.inStock) continue;
    cards.push(await shop.card(listing, e));
  }
  return cards;
}

// Home's pool: the newest live listings each row picks from
const HOME_POOL = 300;
// Recent orders read for Best Sellers This Week
const WEEK_ORDERS = 400;
// The shopper's own orders read for Buy Again
const MY_ORDERS = 50;

/**
 * M-10 / W-01 Home: the product rows (lib/homeSections.ts), the featured
 * banner and nearby farms. `freshPicks` and `pickedToday` stay for older
 * clients; `sections` is what Home draws, in order.
 */
export const home = query({
  args: {
    // The shopper's date, "YYYY-MM-DD" (queries can't read the clock).
    today: v.string(),
    // The shopper's chosen area, for "Near You" and "Farmers Near You".
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
    // Phase 3c: the shopper's position, for farm distances
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const from = shopperPoint(args.lat, args.lng);
    const shop = shopReader(ctx, { today: args.today, from });

    // Every row picks from the same buyable pool
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "live"))
      .order("desc")
      .take(HOME_POOL);
    const pool: Candidate[] = [];
    for (const listing of listings) {
      const e = await shop.entry(listing);
      const c = e === null ? null : candidateOf(e);
      if (c !== null) pool.push(c);
    }

    // Paid orders per listing in the last 7 days
    const since = weekStart(args.today);
    const sold = new Map<Id<"listings">, number>();
    for (const o of await ctx.db.query("orders").order("desc").take(WEEK_ORDERS)) {
      if (o._creationTime < since) break;
      if (!countsAsSale(o)) continue;
      for (const id of new Set(o.items.map((i) => i.listingId))) sold.set(id, (sold.get(id) ?? 0) + 1);
    }

    // What this shopper has had before, most recent first
    const viewer = await getViewer(ctx);
    const bought: Id<"listings">[] = [];
    if (viewer !== null) {
      const mine = await ctx.db
        .query("orders")
        .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
        .order("desc")
        .take(MY_ORDERS);
      for (const o of mine) {
        if (!BOUGHT.has(o.status)) continue;
        for (const item of o.items) if (!bought.includes(item.listingId)) bought.push(item.listingId);
      }
    }
    const again = buyAgain(pool, bought);

    const rows = arrange([
      { key: "fresh", list: freshPicks(pool) },
      { key: "near", list: nearYou(pool, { state: args.state, lga: args.lga }, from !== null) },
      { key: "almost_gone", list: almostGone(pool) },
      { key: "best_sellers", list: bestSellers(pool, sold) },
      { key: "top_rated", list: topRated(pool) },
      again.length > 0 ? { key: "buy_again", list: again, keepRepeats: true } : { key: "great_value", list: greatValue(pool) },
    ]);
    const sections = [];
    for (const row of rows) {
      const items = [];
      for (const c of row.items) {
        const card = await shop.card(c.listing, c);
        items.push(row.key === "almost_gone" ? { ...card, left: c.left } : card);
      }
      sections.push({ key: row.key, title: SECTION_TITLES[row.key], seeAll: row.key === "fresh", items });
    }
    const freshPicksCards = sections.find((r) => r.key === "fresh")?.items ?? [];

    // Featured banner (A-86): the first active one whose listing can be bought.
    let banner = null;
    const banners = await ctx.db
      .query("homeBanners")
      .withIndex("by_active_and_sortOrder", (q) => q.eq("active", true))
      .take(5);
    for (const row of banners) {
      const listing = await ctx.db.get("listings", row.listingId);
      if (listing === null || listing.status !== "live") continue;
      const [card] = await buyableCards(shop, [listing]);
      const farm = await shop.openFarm(listing.farmId);
      if (card === undefined || farm === null) continue;
      banner = { tag: row.tag, title: row.title, buttonLabel: row.buttonLabel, listing: card, farmName: farm.name };
      break;
    }

    // Farmers Near You: open farms in the shopper's state, their own area
    // first; nearest first when the position is known.
    const active = await ctx.db
      .query("farms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(100);
    const farmRows = await Promise.all(
      active
        .filter((farm) => !farm.holidayMode && (args.state === undefined || farm.state === args.state))
        .map((farm) => shop.farmRow(farm)),
    );
    const farms = farmRows
      .sort(
        (a, b) =>
          Number(b.lga === args.lga) - Number(a.lga === args.lga) ||
          (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      )
      .slice(0, 12);

    return { freshPicks: freshPicksCards, pickedToday: [] as typeof freshPicksCards, sections, banner, farms };
  },
});

/** W-01 "See all": Fresh picks (newest) or Picked today, with the shop filters. */
export const collection = query({
  args: {
    kind: v.union(v.literal("fresh"), v.literal("picked_today")),
    today: v.string(),
    ...listFilterArgs,
  },
  handler: async (ctx, args) => {
    const from = shopperPoint(args.lat, args.lng);
    checkFilters(args, args.today, from);
    const shop = shopReader(ctx, { today: args.today, from });
    const candidates =
      args.kind === "fresh"
        ? await ctx.db
            .query("listings")
            .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "live"))
            .order("desc")
            .take(GRID_SCAN)
        : await ctx.db
            .query("listings")
            .withIndex("by_status_and_harvestedOn", (q) => q.eq("status", "live").eq("harvestedOn", args.today))
            .order("desc")
            .take(GRID_SCAN);
    const { items, hasMore, total } = await listPage(shop, candidates, args, args.today, { inStockOnly: true });
    return { items, hasMore, total };
  },
});

/** W-03 Category: one category's listings, with filters, sorts and subtype counts (null when the slug is unknown). */
export const categoryListings = query({
  args: {
    slug: v.string(),
    ...listFilterArgs,
    // Phase 3c
    subtype: v.optional(v.string()),
    today: v.optional(v.string()),
    // Phase 5
    subtypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (category === null || category.hidden) return null;
    const from = shopperPoint(args.lat, args.lng);
    checkFilters(args, args.today, from);
    const shop = shopReader(ctx, { today: args.today, from });
    // Phase 5: several types at once (W-03 / W-05 Type checkboxes); `subtype` still works
    const wanted = [...new Set([...(args.subtypes ?? []), ...(args.subtype !== undefined ? [args.subtype] : [])])].slice(0, 20);
    const candidates: Doc<"listings">[] = [];
    if (wanted.length === 0) {
      candidates.push(
        ...(await ctx.db
          .query("listings")
          .withIndex("by_categoryId_and_status", (q) => q.eq("categoryId", category._id).eq("status", "live"))
          .order("desc")
          .take(GRID_SCAN)),
      );
    } else {
      for (const subtype of wanted) {
        candidates.push(
          ...(await ctx.db
            .query("listings")
            .withIndex("by_categoryId_and_status_and_subtype", (q) =>
              q.eq("categoryId", category._id).eq("status", "live").eq("subtype", subtype),
            )
            .order("desc")
            .take(GRID_SCAN)),
        );
      }
    }
    const sort = args.sort ?? "newest";
    const page = await listPage(shop, candidates, { ...args, sort }, args.today);
    const subtypes = await Promise.all(
      (category.subtypes ?? []).map(async (s) => ({
        slug: s.slug,
        name: s.name,
        count: await readCount(ctx, "subtype", subtypeKey(category._id, s.slug)),
      })),
    );
    return {
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        productCount: await readCount(ctx, "category", category._id),
        subtypes,
      },
      items: page.items,
      hasMore: page.hasMore,
      total: page.total,
      // "86 products from 21 farms"
      farmCount: new Set(page.entries.map((e) => e.farm._id)).size,
    };
  },
});

/** W-04 Search: full-text on listing name and farm name. */
export const search = query({
  args: {
    text: v.string(),
    ...listFilterArgs,
    // Phase 3c
    categorySlug: v.optional(v.string()),
    today: v.optional(v.string()),
    // Phase 5 (W-04 / W-05 Type checkboxes): only these subtypes
    subtypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim().slice(0, 100);
    if (text.length === 0) return { items: [], farms: [], hasMore: false, total: 0, farmTotal: 0 };
    const from = shopperPoint(args.lat, args.lng);
    checkFilters(args, args.today, from);
    const shop = shopReader(ctx, { today: args.today, from });

    let categoryId: Id<"categories"> | undefined;
    if (args.categorySlug !== undefined) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      if (category === null) return { items: [], farms: [], hasMore: false, total: 0, farmTotal: 0 };
      categoryId = category._id;
    }

    // Listings whose name matches, best match first
    const byName = await ctx.db
      .query("listings")
      .withSearchIndex("search_name", (q) => {
        const s = q.search("name", text).eq("status", "live");
        return categoryId === undefined ? s : s.eq("categoryId", categoryId);
      })
      .take(SEARCH_SCAN);

    // Farms whose name matches, and their listings after the name matches
    const farmHits = (
      await ctx.db
        .query("farms")
        .withSearchIndex("search_name", (q) => q.search("name", text).eq("status", "active"))
        .take(FARM_SEARCH_SCAN)
    ).filter((f) => farmIsOpen(f));
    const fromFarms: Doc<"listings">[] = [];
    for (const farm of farmHits) {
      const live = await ctx.db
        .query("listings")
        .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id).eq("status", "live"))
        .take(50);
      fromFarms.push(...live.filter((l) => categoryId === undefined || l.categoryId === categoryId));
    }

    const types = args.subtypes && args.subtypes.length > 0 ? new Set(args.subtypes) : null;
    const pool = [...byName, ...fromFarms].filter((l) => types === null || (l.subtype !== undefined && types.has(l.subtype)));
    const page = await listPage(shop, pool, args, args.today);

    // Farm rows: farms matching by name, then farms selling what matched
    const matches = new Map<Id<"farms">, number>();
    for (const e of page.entries) matches.set(e.farm._id, (matches.get(e.farm._id) ?? 0) + 1);
    const farmIds = [...new Set([...farmHits.map((f) => f._id), ...[...matches.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)])];
    const farmRows = [];
    for (const id of farmIds) {
      const farm = await shop.openFarm(id);
      if (farm === null) continue;
      const row = await shop.farmRow(farm);
      if (!farmPasses({ farm, rating: row.rating, distanceKm: row.distanceKm }, args)) continue;
      // "14 tomato listings"
      farmRows.push({ ...row, matchCount: matches.get(id) ?? 0 });
    }
    return {
      items: page.items,
      farms: farmRows.slice(0, 6),
      hasMore: page.hasMore,
      total: page.total,
      farmTotal: farmRows.length,
    };
  },
});

/** Similar listings: same category first, then the newest; buyable only. */
async function similarTo(ctx: Parameters<typeof shopReader>[0], shop: ShopReader, listing: Doc<"listings"> | null) {
  const candidates: Doc<"listings">[] = [];
  if (listing?.categoryId !== undefined) {
    const categoryId = listing.categoryId;
    candidates.push(
      ...(await ctx.db
        .query("listings")
        .withIndex("by_categoryId_and_status", (q) => q.eq("categoryId", categoryId).eq("status", "live"))
        .order("desc")
        .take(SCAN)),
    );
  }
  candidates.push(
    ...(await ctx.db
      .query("listings")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "live"))
      .order("desc")
      .take(SCAN)),
  );
  const seen = new Set<Id<"listings">>(listing ? [listing._id] : []);
  return await buyableCards(
    shop,
    candidates.filter((l) => !seen.has(l._id) && (seen.add(l._id), true)),
    SIMILAR,
  );
}

/** W-06 Product detail. null for an unknown id. */
export const product = query({
  args: {
    id: v.string(),
    // Phase 3c
    today: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    serviceAreaId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const listingId = ctx.db.normalizeId("listings", args.id);
    const listing = listingId ? await ctx.db.get("listings", listingId) : null;
    if (listing === null) return null;
    const from = shopperPoint(args.lat, args.lng);
    const shop = shopReader(ctx, { today: args.today, from });
    const farm = await shop.farm(listing.farmId);
    const imageUrl = listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null;

    const gone =
      listing.deletedAt !== undefined
        ? "removed"
        : listing.status !== "live"
          ? "not_live"
          : farm === null || farm.status !== "active"
            ? "farm_unavailable"
            : null;
    if (gone !== null || farm === null || listing.units.length === 0) {
      return {
        available: false as const,
        name: listing.deletedAt === undefined ? listing.name : null,
        imageUrl: listing.deletedAt === undefined ? imageUrl : null,
        reason: gone ?? "not_live",
        similar: await similarTo(ctx, shop, listing),
      };
    }

    const onBreak = farm.holidayMode;
    const category = await shop.category(listing.categoryId);
    const rating = await shop.rating(farm._id);
    const rules = await getRules(ctx);
    const units = await Promise.all(
      listing.units.map(async (u) => {
        const unit = await shop.unit(u.unitId);
        return {
          unitId: u.unitId,
          singular: unit?.singular ?? "unit",
          plural: unit?.plural ?? "units",
          priceKobo: u.priceKobo,
          stock: u.stock,
          minOrder: u.minOrder,
        };
      }),
    );
    const photos = (await Promise.all(listing.photoIds.map((id) => ctx.storage.getUrl(id)))).filter(
      (url): url is string => url !== null,
    );

    // "Delivery to Owerri North" for the shopper's chosen area. Delivery is
    // priced per order after the farm accepts, so there's no fee to show.
    const areaId = args.serviceAreaId ? ctx.db.normalizeId("serviceAreas", args.serviceAreaId) : null;
    const area = areaId ? await ctx.db.get("serviceAreas", areaId) : null;
    const deliveryArea =
      area !== null && area.active
        ? { id: area._id, name: area.name, lga: area.lga, state: area.state, deliveryFeeKobo: null }
        : null;

    const moreFromFarm = onBreak
      ? []
      : await buyableCards(
          shop,
          (
            await ctx.db
              .query("listings")
              .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id).eq("status", "live"))
              .order("desc")
              .take(SCAN)
          ).filter((l) => l._id !== listing._id),
          SIMILAR,
        );

    return {
      available: !onBreak,
      ...(onBreak ? { reason: "farm_on_break" } : {}),
      id: listing._id,
      name: listing.name,
      description: listing.description ?? null,
      photos,
      harvestedOn: listing.harvestedOn ?? null,
      delivery: listing.delivery,
      pickup: listing.pickup,
      category: category === null ? null : { name: category.name, slug: category.slug },
      farm: {
        id: farm._id,
        name: farm.name,
        lga: farm.lga,
        state: farm.state,
        photoUrl: farm.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null,
        rating: rating.rating,
        ratingCount: rating.ratingCount,
        verified: farm.status === "active",
        // Phase 3c
        onBreak,
        joinedAt: farm._creationTime,
        productCount: await shop.productCount(farm._id),
        responseTimeHours: await responseTimeHours(ctx, farm._id),
        acceptsWithinHours: rules.farmerResponseHours,
        distanceKm: farmDistanceKm(from, farm),
      },
      units,
      similar: await similarTo(ctx, shop, listing),
      // Phase 3c
      subtype: listing.subtype ?? null,
      inStock: !isOutOfStock(listing.units),
      freshness: freshnessLabel(listing.harvestedOn, args.today),
      priceKobo: offerOf(listing)?.priceKobo ?? 0,
      deliveryFeeKobo: null,
      deliveryArea,
      moreFromFarm,
    };
  },
});

/** W-07 Farm profile (null when unknown or suspended). Listings are empty while the farm is on holiday. */
export const farm = query({
  args: {
    id: v.string(),
    // Phase 3c
    today: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const farmId = ctx.db.normalizeId("farms", args.id);
    const farm = farmId ? await ctx.db.get("farms", farmId) : null;
    if (farm === null || farm.status !== "active") return null;
    const shop = shopReader(ctx, { today: args.today, from: shopperPoint(args.lat, args.lng) });
    const onBreak = farm.holidayMode;

    const live = (
      await ctx.db
        .query("listings")
        .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id).eq("status", "live"))
        .order("desc")
        .take(FARM_LISTINGS)
    ).filter((l) => isShopListing(l) && l.units.length > 0);
    const page = onBreak ? { items: [], entries: [] } : await listPage(shop, live, { sort: "newest", limit: FARM_LISTINGS }, args.today);

    // "All (18) · Vegetables (12) · Herbs and spices (4)"
    const byCategory = new Map<string, { slug: string; name: string; count: number }>();
    for (const item of page.items) {
      if (item.category === null) continue;
      const row = byCategory.get(item.category.slug) ?? { ...item.category, count: 0 };
      row.count++;
      byCategory.set(item.category.slug, row);
    }
    const row = await shop.farmRow(farm);
    const rules = await getRules(ctx);
    return {
      id: farm._id,
      name: farm.name,
      description: farm.description ?? null,
      lga: farm.lga,
      state: farm.state,
      photoUrl: row.photoUrl,
      rating: row.rating,
      ratingCount: row.ratingCount,
      verified: row.verified,
      onBreak,
      joinedAt: farm._creationTime,
      listings: page.items,
      // Phase 3c
      area: farm.lga,
      productCount: row.productCount,
      distanceKm: row.distanceKm,
      categories: [...byCategory.values()].sort((a, b) => b.count - a.count),
      delivery: live.some((l) => l.delivery),
      pickup: live.some((l) => l.pickup),
      responseTimeHours: await responseTimeHours(ctx, farm._id),
      acceptsWithinHours: rules.farmerResponseHours,
    };
  },
});

/** Areas (LGA and state) that have at least one open farm, for the area filter. */
export const farmAreas = query({
  args: {},
  handler: async (ctx) => {
    const farms = await ctx.db
      .query("farms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(500);
    const areas = new Map<string, { lga: string; state: string }>();
    for (const f of farms) if (!f.holidayMode) areas.set(`${f.state}|${f.lga}`, { lga: f.lga, state: f.state });
    return [...areas.values()].sort((a, b) => a.state.localeCompare(b.state) || a.lga.localeCompare(b.lga));
  },
});

const RECENT_ORDERS = 300;

/** Popular products: most ordered recently, topped up with the newest. Buyable only. */
export const popular = query({
  args: {
    // Phase 3c
    limit: v.optional(v.number()),
    today: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const shop = shopReader(ctx, { today: args.today, from: shopperPoint(args.lat, args.lng) });
    const limit = Math.min(pageSize(args.limit ?? 12), 50);
    const orders = await ctx.db.query("orders").order("desc").take(RECENT_ORDERS);
    const counts = new Map<Id<"listings">, number>();
    for (const o of orders) {
      if (o.paidAt === undefined) continue;
      for (const item of o.items) counts.set(item.listingId, (counts.get(item.listingId) ?? 0) + item.quantity);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit * 3);
    const candidates: Doc<"listings">[] = [];
    for (const [id] of ranked) {
      const l = await ctx.db.get("listings", id);
      if (l !== null) candidates.push(l);
    }
    candidates.push(
      ...(await ctx.db
        .query("listings")
        .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "live"))
        .order("desc")
        .take(SCAN)),
    );
    const seen = new Set<Id<"listings">>();
    return await buyableCards(
      shop,
      candidates.filter((l) => !seen.has(l._id) && (seen.add(l._id), true)),
      limit,
    );
  },
});
