// Saved items (M-86, W-47). Signed-in accounts only; guests are asked to sign in.
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { getViewer, requireAccount } from "./lib/auth";
import { isOutOfStock } from "./lib/listing";
import { notify } from "./lib/notify";
import { isBuyable } from "./lib/restock";

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
      const available = live && open && !isOutOfStock(listing.units);
      items.push({
        id: listing._id,
        name: listing.name,
        imageUrl: listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null,
        priceKobo: offer.priceKobo,
        unit: unit?.singular ?? "unit",
        farmName: farm?.name ?? "Farm",
        harvestedOn: listing.harvestedOn ?? null,
        available,
        // Why it can't be bought right now (W-47 tags)
        unavailableReason: !live || !open ? "unavailable" : isOutOfStock(listing.units) ? "sold_out" : null,
        savedAt: row._creationTime,
        // Phase 5 (W-47): stock came back since the shopper last looked at
        // their saved items (favorites.markSeen), and the "Notify me" switch
        backInStock:
          available &&
          listing.restockedAt !== undefined &&
          listing.restockedAt > (row.lastSeenAt ?? row._creationTime),
        notify: row.notify === true,
        farmId: listing.farmId,
        unitId: offer.unitId,
      });
    }
    return items;
  },
});

/**
 * W-47: the shopper has seen their saved items, so "Back in stock" tags reset
 * next time. The page calls this after showing the tags.
 */
export const markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAccount(ctx);
    const now = Date.now();
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_SAVED);
    for (const row of rows) {
      if (row.lastSeenAt === undefined || row.lastSeenAt < now) await ctx.db.patch("favorites", row._id, { lastSeenAt: now });
    }
  },
});

/**
 * W-47 "Notify me": one email (and push) when this item can be bought again.
 * Saves the item if it isn't saved yet. Returns the switch's new state.
 */
export const setNotify = mutation({
  args: { listingId: v.id("listings"), on: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null || listing.deletedAt !== undefined) throw new ConvexError({ code: "NOT_FOUND" });
    const row = await ctx.db
      .query("favorites")
      .withIndex("by_userId_and_listingId", (q) => q.eq("userId", user._id).eq("listingId", args.listingId))
      .first();
    if (row !== null) {
      await ctx.db.patch("favorites", row._id, { notify: args.on || undefined });
      return { notify: args.on, saved: true };
    }
    if (!args.on) return { notify: false, saved: false };
    const count = await ctx.db
      .query("favorites")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_SAVED);
    if (count.length >= MAX_SAVED) throw new ConvexError({ code: "TOO_MANY_SAVED", max: MAX_SAVED });
    await ctx.db.insert("favorites", { userId: user._id, listingId: args.listingId, notify: true });
    return { notify: true, saved: true };
  },
});

const NOTIFY_BATCH = 200;

/**
 * Scheduled by lib/restock when a listing can be bought again: tells everyone
 * who asked ("back_in_stock": push and email, per their preferences), once.
 */
export const notifyBackInStock = internalMutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get("listings", args.listingId);
    if (listing === null || !isBuyable(listing)) return { notified: 0 };
    const farm = await ctx.db.get("farms", listing.farmId);
    if (farm === null || farm.status !== "active" || farm.holidayMode) return { notified: 0 };
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_listingId_and_notify", (q) => q.eq("listingId", listing._id).eq("notify", true))
      .take(NOTIFY_BATCH);
    const now = Date.now();
    for (const row of rows) {
      await ctx.db.patch("favorites", row._id, { notify: undefined, notifiedAt: now });
      const user = await ctx.db.get("users", row.userId);
      if (user === null || user.isAnonymous) continue;
      await notify(ctx, {
        userId: row.userId,
        side: "shop",
        kind: "back_in_stock",
        title: `${listing.name} is back in stock`,
        body: `${farm.name} has ${listing.name} again. Order before it sells out.`,
        href: `/product/${listing._id}`,
      });
    }
    if (rows.length === NOTIFY_BATCH) {
      await ctx.scheduler.runAfter(0, internal.favorites.notifyBackInStock, { listingId: listing._id });
    }
    return { notified: rows.length };
  },
});
