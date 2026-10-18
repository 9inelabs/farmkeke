// One-off maintenance for the dev deployment. Internal only: callable from the
// Convex dashboard or `npx convex run`, never by the app or website.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

// Only order/payment/notification test data can be cleared. Users, farms,
// listings, areas, categories and settings are never in this list.
const CLEARABLE = v.union(
  v.literal("orders"),
  v.literal("checkouts"),
  v.literal("orderEvents"),
  v.literal("ledgerEntries"),
  v.literal("notifications"),
  v.literal("paymentAttempts"),
  v.literal("unmatchedPaymentEvents"),
  v.literal("refunds"),
  v.literal("payouts"),
  v.literal("payoutItems"),
);

/** Deletes every document in one clearable table, in batches. Returns how many were deleted. */
export const clearTable = internalMutation({
  args: { table: CLEARABLE },
  returns: v.object({ deleted: v.number(), more: v.boolean() }),
  handler: async (ctx, { table }) => {
    const batch = await ctx.db.query(table).take(200);
    for (const doc of batch) await ctx.db.delete(doc._id);
    const more = batch.length === 200;
    if (more) await ctx.scheduler.runAfter(0, internal.maintenance.clearTable, { table });
    return { deleted: batch.length, more };
  },
});
