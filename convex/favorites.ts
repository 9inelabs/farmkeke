// Saved items (M-86, W-47). Signed-in accounts only; guests are asked to sign in.
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getViewer, requireAccount } from "./lib/auth";
import { isOutOfStock } from "./lib/listing";

const MAX_SAVED = 500;

async function account(ctx: QueryCtx) {
  const user = await getViewer(ctx);
  return user === null || user.isAnonymous ? null : user;
}

/** Saves or unsaves a listing. Returns whether it's saved now. */
export const toggle = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_userId_and_listingId", (q) => q.eq("userId", user._id).eq("listingId", args.listingId))
      .take(5);
    if (existing.length > 0) {
      for (const row of existing) await ctx.db.delete("favorites", row._id);
      return { saved: false };
    }
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null || listing.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND" });
    const count = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_SAVED);
    if (count.length >= MAX_SAVED) throw new ConvexError({ code: "TOO_MANY_SAVED", max: MAX_SAVED });
    await ctx.db.insert("favorites", { userId: user._id, listingId: args.listingId });
    return { saved: true };
  },
});

/** Whether the viewer saved this listing. False for guests and for ids that aren't listings. */
export const isSaved = query({
  args: { listingId: v.string() },
  handler: async (ctx, args) => {
    const user = await account(ctx);
    const listingId = ctx.db.normalizeId("listings", args.listingId);
    if (user === null || listingId === null) return false;
    const row = await ctx.db
      .query("favorites")
      .withIndex("by_userId_and_listingId", (q) => q.eq("userId", user._id).eq("listingId", listingId))
      .first();
    return row !== null;
  },
});

/** W-47: saved listings, newest saved first, as the shop's listing cards. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await account(ctx);
    if (user === null) return [];
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(MAX_SAVED);
    const farms = new Map<string, Doc<"farms"> | null>();
    const items = [];
    for (const row of rows) {
      const listing = await ctx.db.get("listings", row.listingId);
      if (listing === null || listing.deletedAt !== undefined || listing.units.length === 0) continue;
      if (!farms.has(listing.farmId)) farms.set(listing.farmId, await ctx.db.get("farms", listing.farmId));
      const farm = farms.get(listing.farmId) ?? null;
      const offer = listing.units.find((u) => u.stock > 0) ?? listing.units[0]!;
      const unit = await ctx.db.get("units", offer.unitId);
      const open = farm !== null && farm.status === "active" && !farm.holidayMode;
      const live = listing.status === "live";
      items.push({
        id: listing._id,
        name: listing.name,
        imageUrl: listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null,
        priceKobo: offer.priceKobo,
        unit: unit?.singular ?? "unit",
        farmName: farm?.name ?? "Farm",
        harvestedOn: listing.harvestedOn ?? null,
        available: live && open && !isOutOfStock(listing.units),
        // Why it can't be bought right now (W-47 tags)
        unavailableReason: !live || !open ? "unavailable" : isOutOfStock(listing.units) ? "sold_out" : null,
        savedAt: row._creationTime,
      });
    }
    return items;
  },
});
