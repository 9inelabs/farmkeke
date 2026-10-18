// Cron safety net for money on its way out: re-sends refunds and payouts
// whose scheduled send never ran or stalled. Anything that might already have
// moved money is left for staff (A-63 / A-64 retry), never retried blindly.
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const STUCK_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

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

    const pending = await ctx.db
      .query("payouts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(50);
    for (const p of pending) {
      if (p.transferCode) continue; // waiting for Paystack's webhook
      const stuck = p.sending === true && (p.sendStartedAt ?? 0) < now - STUCK_MS;
      const neverSent = p.sending !== true && p._creationTime < now - 5 * 60_000;
      if (!stuck && !neverSent) continue;
      if (p.attempts >= MAX_ATTEMPTS) {
        await ctx.db.patch("payouts", p._id, { status: "failed", sending: false, failureReason: "Send kept stalling" });
        continue;
      }
      // Same reference on purpose: if the stalled send reached Paystack, the
      // retry is rejected as a duplicate instead of paying twice.
      if (stuck) await ctx.db.patch("payouts", p._id, { sending: false });
      await ctx.scheduler.runAfter(0, internal.payments.payouts.send, { payoutId: p._id });
      resent++;
    }
    return { resent };
  },
});
