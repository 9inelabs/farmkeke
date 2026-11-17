// Cron safety net for refunds on their way out: re-sends refunds whose
// scheduled send never ran. Anything that might already have moved money is
// left for staff (A-63 retry), never retried blindly. (Farms are paid by the
// Paystack split, so there are no payouts to send.)
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const STUCK_MS = 15 * 60_000;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let resent = 0;

    const queued = await ctx.db
      .query("refunds")
      .withIndex("by_status", (q) => q.eq("status", "queued").lt("_creationTime", now - 5 * 60_000))
      .take(25);
    for (const r of queued) {
      await ctx.scheduler.runAfter(0, internal.payments.refunds.send, { refundId: r._id });
      resent++;
    }
    const sending = await ctx.db
      .query("refunds")
      .withIndex("by_status", (q) => q.eq("status", "sending"))
      .take(25);
    for (const r of sending) {
      if ((r.sendStartedAt ?? 0) > now - STUCK_MS) continue;
      // It may have reached Paystack, and refunds have no idempotency key, so a
      // blind re-send could refund twice. Staff check Paystack and retry (A-63).
      await ctx.db.patch("refunds", r._id, { status: "failed", failureReason: "Send stalled: check Paystack before retrying" });
      const entries = await ctx.db
        .query("ledgerEntries")
        .withIndex("by_refundId", (q) => q.eq("refundId", r._id))
        .take(5);
      for (const e of entries) await ctx.db.patch("ledgerEntries", e._id, { status: "failed" });
    }

    return { resent };
  },
});
