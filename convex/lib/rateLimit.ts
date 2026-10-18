// Fixed-window limit for payment starts and bank lookups (paymentRateLimits).
// Mutations are serialised per key row, so two calls can't both slip through.
import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

export async function hitLimit(ctx: MutationCtx, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const row = await ctx.db
    .query("paymentRateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (row === null) {
    await ctx.db.insert("paymentRateLimits", { key, windowStart: now, count: 1 });
    return;
  }
  if (now - row.windowStart >= windowMs) {
    await ctx.db.patch("paymentRateLimits", row._id, { windowStart: now, count: 1 });
    return;
  }
  if (row.count >= max) {
    throw new ConvexError({ code: "RATE_LIMITED", retryAfterMs: row.windowStart + windowMs - now });
  }
  await ctx.db.patch("paymentRateLimits", row._id, { count: row.count + 1 });
}
