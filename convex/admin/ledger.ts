// A-51 / A-60: every money movement on one order (the farm's share, Farmkeke's
// commission and delivery fee, refunds, and refund debts). Since the Paystack
// split nothing is held, so there is no release queue or hold.
import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireStaff } from "../lib/auth";

/** A-51 / A-60: every money movement on one order. */
export const entries = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const rows = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(100);
    return await Promise.all(
      rows.map(async (e) => {
        const actor = e.actorId ? await ctx.db.get("users", e.actorId) : null;
        return {
          _id: e._id,
          at: e._creationTime,
          kind: e.kind,
          amountKobo: e.amountKobo,
          status: e.status,
          note: e.note ?? null,
          simulated: e.simulated === true,
          refundId: e.refundId ?? null,
          actorName: actor?.name ?? null,
        };
      }),
    );
  },
});
