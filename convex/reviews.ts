// Reviews (M-73, F-80). Phase 3a stub: only the review reminder that order
// completion schedules. The public review functions are rebuilt in Phase 3b.
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { notifyConsumer } from "./lib/notify";

/** A day after the consumer confirms: "How was your order?" (section 5, push). */
export const remind = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.status !== "completed" || order.reviewedAt !== undefined) return;
    const farm = await ctx.db.get("farms", order.farmId);
    await notifyConsumer(
      ctx,
      order,
      "review_reminder",
      "How was your order?",
      `Rate ${farm?.name ?? "the farm"} to help other shoppers.`,
    );
  },
});
