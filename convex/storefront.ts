// Shopping side: what anyone browsing sees (M-10 Home so far). No sign-in
// needed. Only live, in-stock listings from farms that are open are shown.
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { isOutOfStock } from "./lib/listing";

const ROW_SIZE = 10;
// Read a few more than a row holds, since some listings are filtered out.
const SCAN = 40;

/** Looks farms up once per query and says whether shoppers can buy from them. */
function farmLookup(ctx: QueryCtx) {
  const cache = new Map<Id<"farms">, Doc<"farms"> | null>();
  return async (farmId: Id<"farms">) => {
    if (!cache.has(farmId)) cache.set(farmId, await ctx.db.get("farms", farmId));
    const farm = cache.get(farmId) ?? null;
    return farm !== null && farm.status === "active" && !farm.holidayMode ? farm : null;
  };
}

/** The card for a listing: its first unit still in stock, and its cover photo. */
async function productCard(ctx: QueryCtx, listing: Doc<"listings">) {
  const offer = listing.units.find((u) => u.stock > 0) ?? listing.units[0];
  const unit = await ctx.db.get("units", offer.unitId);
  return {
    id: listing._id,
    name: listing.name,
    priceKobo: offer.priceKobo,
    unit: unit?.singular ?? "unit",
    imageUrl: listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null,
  };
}

/** M-10 Home: Fresh Picks, Picked Today, the featured banner and nearby farms. */
export const home = query({
  args: {
    // The shopper's date, "YYYY-MM-DD" (queries can't read the clock).
    today: v.string(),
    // The shopper's chosen area, for "Farmers Near You".
    state: v.optional(v.string()),
    lga: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const openFarm = farmLookup(ctx);
    const buyable = async (listings: Doc<"listings">[]) => {
      const cards = [];
      for (const listing of listings) {
        if (cards.length === ROW_SIZE) break;
        if (listing.deletedAt !== undefined || listing.units.length === 0 || isOutOfStock(listing.units)) continue;
        if ((await openFarm(listing.farmId)) === null) continue;
        cards.push(await productCard(ctx, listing));
      }
      return cards;
    };

    // Fresh Picks: the newest live listings.
    const freshPicks = await buyable(
      await ctx.db
        .query("listings")
        .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "live"))
        .order("desc")
        .take(SCAN),
    );

    // Picked Today: live listings harvested on the shopper's date.
    const pickedToday = await buyable(
      await ctx.db
        .query("listings")
        .withIndex("by_status_and_harvestedOn", (q) => q.eq("status", "live").eq("harvestedOn", args.today))
        .order("desc")
        .take(SCAN),
    );

    // Featured banner (A-86): the first active one whose listing can be bought.
    let banner = null;
    const banners = await ctx.db
      .query("homeBanners")
      .withIndex("by_active_and_sortOrder", (q) => q.eq("active", true))
      .take(5);
    for (const row of banners) {
      const listing = await ctx.db.get("listings", row.listingId);
      if (listing === null || listing.status !== "live") continue;
      const [card] = await buyable([listing]);
      const farm = await openFarm(listing.farmId);
      if (card === undefined || farm === null) continue;
      banner = { tag: row.tag, title: row.title, buttonLabel: row.buttonLabel, listing: card, farmName: farm.name };
      break;
    }

    // Farmers Near You: open farms in the shopper's state, their own area first.
    const active = await ctx.db
      .query("farms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(100);
    const nearby = active
      .filter((farm) => !farm.holidayMode && (args.state === undefined || farm.state === args.state))
      .sort((a, b) => Number(b.lga === args.lga) - Number(a.lga === args.lga))
      .slice(0, 12);
    const farms = await Promise.all(
      nearby.map(async (farm) => ({
        id: farm._id,
        name: farm.name,
        area: farm.lga,
        photoUrl: farm.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null,
      })),
    );

    return { freshPicks, pickedToday, banner, farms };
  },
});
