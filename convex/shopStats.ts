// One-off backfill for the Phase 3c shop counters and response times. The
// live data predates them, so after deploying run once:
//   npx convex run shopStats:rebuild
// It is safe to run again: it recomputes everything from the listings and
// the orderEvents timeline. Internal only.
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { farmIsOpen, isShopListing, subtypeKey } from "./lib/listingCounts";
import { HOUR } from "./lib/settings";

const MAX_ROWS = 4000;
const RESPONSE_SAMPLES = 25;

export const rebuild = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // Listing counters
    const counts = new Map<string, number>();
    const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
    const farmOpen = new Map<Id<"farms">, boolean>();
    const live = await ctx.db
      .query("listings")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "live"))
      .take(MAX_ROWS);
    for (const l of live) {
      if (!isShopListing(l)) continue;
      if (!farmOpen.has(l.farmId)) farmOpen.set(l.farmId, farmIsOpen(await ctx.db.get("farms", l.farmId)));
      add(`farm|${l.farmId}`);
      if (farmOpen.get(l.farmId) && l.categoryId !== undefined) {
        add(`category|${l.categoryId}`);
        if (l.subtype !== undefined) add(`subtype|${subtypeKey(l.categoryId, l.subtype)}`);
      }
    }

    // Response times: payment to acceptance, from each accepted order's events
    const samples = new Map<Id<"farms">, { at: number; hours: number }[]>();
    const orders = await ctx.db.query("orders").order("desc").take(MAX_ROWS);
    for (const o of orders) {
      if (o.acceptedAt === undefined) continue;
      const events = await ctx.db
        .query("orderEvents")
        .withIndex("by_orderId", (q) => q.eq("orderId", o._id))
        .take(50);
      const paid = events.find((e) => e.kind === "paid");
      const accepted = events.find((e) => e.kind === "accepted");
      if (paid === undefined || accepted === undefined) continue;
      const list = samples.get(o.farmId) ?? [];
      list.push({ at: accepted._creationTime, hours: Math.round(((accepted._creationTime - paid._creationTime) / HOUR) * 100) / 100 });
      samples.set(o.farmId, list);
    }

    if (args.dryRun !== true) {
      for (const row of await ctx.db.query("listingCounts").take(MAX_ROWS)) await ctx.db.delete("listingCounts", row._id);
      for (const [scopedKey, count] of counts) {
        const [scope, key] = scopedKey.split("|") as ["farm" | "category" | "subtype", string];
        await ctx.db.insert("listingCounts", { scope, key, count });
      }
      for (const row of await ctx.db.query("farmStats").take(MAX_ROWS)) await ctx.db.delete("farmStats", row._id);
      for (const [farmId, list] of samples) {
        const responseHours = list
          .sort((a, b) => a.at - b.at)
          .slice(-RESPONSE_SAMPLES)
          .map((s) => s.hours);
        await ctx.db.insert("farmStats", { farmId, responseHours });
      }
    }
    return { counters: counts.size, liveListings: live.length, farmsWithResponseTimes: samples.size };
  },
});
