// Refunds to the original payment method (M-72, W-56, A-63), through the
// Paystack Refund API. Test payments and test mode (no key) are recorded as
// simulated refunds, never skipped.
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction, internalMutation, query, type MutationCtx } from "../_generated/server";
import { getViewer } from "../lib/auth";
import { naira, notifyConsumer } from "../lib/notify";
import { paymentsLive, paystack } from "../lib/paystack";

/** M-72 / W-56 / F-48: refunds on one order. Owner, the farm, or staff. */
export const forOrder = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const id = ctx.db.normalizeId("orders", args.orderId);
    const order = id ? await ctx.db.get("orders", id) : null;
    if (user === null || order === null) return [];
    const farm = await ctx.db.get("farms", order.farmId);
    const allowed = order.userId === user._id || farm?.userId === user._id || user.staffRole !== undefined;
    if (!allowed) return [];
    const checkout = await ctx.db.get("checkouts", order.checkoutId);
    const attempt = checkout?.paymentReference
      ? await ctx.db
          .query("paymentAttempts")
          .withIndex("by_reference", (q) => q.eq("reference", checkout.paymentReference!))
          .unique()
      : null;
    const methodLabel = attempt?.cardLast4
      ? `Card ending ${attempt.cardLast4}`
      : attempt?.channel === "bank_transfer" || attempt?.channel === "bank"
        ? "Your bank account"
        : attempt?.provider === "simulated"
          ? "Test payment"
          : "Your original payment method";
    const refunds = await ctx.db
      .query("refunds")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);
    return refunds.map((r) => ({
      _id: r._id,
      orderNumber: order.number,
      amountKobo: r.amountKobo,
      kind: r.kind,
      status: r.status,
      reason: r.reason,
      methodLabel,
      channel: attempt?.channel ?? null,
      reference: r.providerRefundId ?? r.transactionReference,
      simulated: r.provider === "simulated",
      decidedAt: r._creationTime,
      sentAt: r.sentAt ?? null,
      expectedAt: r.expectedAt ?? null,
      settledAt: r.settledAt ?? null,
      failureReason: user.staffRole !== undefined ? (r.failureReason ?? null) : null,
    }));
  },
});

/** Claims a queued refund for sending. Null if someone else has it. */
export const beginSend = internalMutation({
  args: { refundId: v.id("refunds") },
  handler: async (ctx, args) => {
    const refund = await ctx.db.get("refunds", args.refundId);
    if (refund === null || refund.status !== "queued") return null;
    await ctx.db.patch("refunds", refund._id, { status: "sending", attempts: refund.attempts + 1, sendStartedAt: Date.now() });
    return {
      provider: refund.provider,
      transactionReference: refund.transactionReference,
      amountKobo: refund.amountKobo,
      reason: refund.reason,
    };
  },
});

export const send = internalAction({
  args: { refundId: v.id("refunds") },
  handler: async (ctx, args) => {
    const claim: { provider: "paystack" | "simulated"; transactionReference: string; amountKobo: number; reason: string } | null =
      await ctx.runMutation(internal.payments.refunds.beginSend, { refundId: args.refundId });
    if (claim === null) return;
    if (claim.provider === "simulated" || !paymentsLive()) {
      await ctx.runMutation(internal.payments.refunds.finishSend, {
        refundId: args.refundId,
        ok: true,
        providerStatus: "simulated",
      });
      return;
    }
    const result = await paystack<{ id?: number | string; status?: string; expected_at?: string }>("/refund", {
      body: {
        transaction: claim.transactionReference,
        amount: claim.amountKobo,
        currency: "NGN",
        merchant_note: `Farmkeke refund: ${claim.reason}`,
      },
    });
    if (!result.ok) {
      await ctx.runMutation(internal.payments.refunds.finishSend, {
        refundId: args.refundId,
        ok: false,
        reason: result.message,
      });
      return;
    }
    const expected = result.data.expected_at ? Date.parse(result.data.expected_at) : NaN;
    await ctx.runMutation(internal.payments.refunds.finishSend, {
      refundId: args.refundId,
      ok: true,
      providerRefundId: result.data.id === undefined ? undefined : String(result.data.id),
      providerStatus: result.data.status,
      expectedAt: Number.isNaN(expected) ? undefined : expected,
    });
  },
});

async function settle(ctx: MutationCtx, refund: Doc<"refunds">, status: "processed" | "failed", reason?: string) {
  const now = Date.now();
  await ctx.db.patch("refunds", refund._id, {
    status,
    settledAt: status === "processed" ? now : undefined,
    failureReason: status === "failed" ? (reason ?? "failed") : undefined,
  });
  const entries = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_refundId", (q) => q.eq("refundId", refund._id))
    .take(5);
  for (const e of entries) await ctx.db.patch("ledgerEntries", e._id, { status: status === "processed" ? "done" : "failed" });
  if (status === "processed") {
    const order = await ctx.db.get("orders", refund.orderId);
    if (order !== null) {
      await notifyConsumer(
        ctx,
        order,
        "refund_issued",
        `Refund for order ${order.number}`,
        `${naira(refund.amountKobo)} is on its way back to your original payment method.`,
      );
    }
  }
}

export const finishSend = internalMutation({
  args: {
    refundId: v.id("refunds"),
    ok: v.boolean(),
    providerRefundId: v.optional(v.string()),
    providerStatus: v.optional(v.string()),
    expectedAt: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const refund = await ctx.db.get("refunds", args.refundId);
    if (refund === null || refund.status !== "sending") return;
    if (!args.ok) {
      await settle(ctx, refund, "failed", args.reason);
      return;
    }
    await ctx.db.patch("refunds", refund._id, {
      status: "processing",
      sentAt: Date.now(),
      providerRefundId: args.providerRefundId,
      providerStatus: args.providerStatus,
      expectedAt: args.expectedAt,
    });
    if (args.providerStatus === "processed" || args.providerStatus === "simulated") {
      await settle(ctx, { ...refund, status: "processing" }, "processed");
    }
  },
});

/** Paystack refund.* webhook events. */
export const settleEvent = internalMutation({
  args: {
    event: v.string(),
    status: v.string(),
    transactionReference: v.string(),
    providerRefundId: v.optional(v.string()),
    amountKobo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("refunds")
      .withIndex("by_transactionReference", (q) => q.eq("transactionReference", args.transactionReference))
      .take(20);
    const open = candidates.filter((r) => r.status !== "processed");
    const refund =
      open.find((r) => args.providerRefundId !== undefined && r.providerRefundId === args.providerRefundId) ??
      open.find((r) => r.amountKobo === args.amountKobo) ??
      null;
    if (refund === null) {
      await ctx.db.insert("unmatchedPaymentEvents", {
        event: args.event,
        reference: args.transactionReference,
        amountKobo: args.amountKobo,
        status: args.status,
      });
      return;
    }
    if (args.event === "refund.processed") await settle(ctx, refund, "processed");
    else if (args.event === "refund.failed") await settle(ctx, refund, "failed", args.status);
    else await ctx.db.patch("refunds", refund._id, { status: "processing", providerStatus: args.status });
  },
});
