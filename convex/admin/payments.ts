// A-63 Refunds, A-64 Payouts, A-65 Payment reconciliation. Finance staff
// retry failed money movements and settle mismatched or unmatched payments.
// Every change is audited with a reason.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, internalQuery, mutation, query, type QueryCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { BANKS } from "../lib/banks";
import { paymentsLive, paystack } from "../lib/paystack";
import { freshReference } from "../payments/payouts";
import { payoutStatus, refundStatus } from "../schema";


async function payoutRow(ctx: QueryCtx, p: Doc<"payouts">) {
  const farm = await ctx.db.get("farms", p.farmId);
  const items = await ctx.db
    .query("payoutItems")
    .withIndex("by_payoutId", (q) => q.eq("payoutId", p._id))
    .take(50);
  return {
    _id: p._id,
    farmId: p.farmId,
    farmName: farm?.name ?? "Farm",
    amountKobo: p.amountKobo,
    status: p.status,
    reference: p.reference,
    provider: p.provider,
    simulated: p.provider === "simulated",
    sending: p.sending === true,
    transferCode: p.transferCode ?? null,
    bankName: p.bankName,
    accountLast4: p.accountLast4,
    failureReason: p.failureReason ?? null,
    attempts: p.attempts,
    createdAt: p._creationTime,
    sentAt: p.sentAt ?? null,
    orderCount: items.length,
  };
}

async function refundRow(ctx: QueryCtx, r: Doc<"refunds">) {
  const order = await ctx.db.get("orders", r.orderId);
  return {
    _id: r._id,
    orderId: r.orderId,
    orderNumber: order?.number ?? "",
    consumerName: order?.contact.name ?? "",
    amountKobo: r.amountKobo,
    kind: r.kind,
    reason: r.reason,
    status: r.status,
    provider: r.provider,
    simulated: r.provider === "simulated",
    transactionReference: r.transactionReference,
    providerRefundId: r.providerRefundId ?? null,
    providerStatus: r.providerStatus ?? null,
    failureReason: r.failureReason ?? null,
    attempts: r.attempts,
    createdAt: r._creationTime,
    sentAt: r.sentAt ?? null,
    expectedAt: r.expectedAt ?? null,
    settledAt: r.settledAt ?? null,
    disputeId: r.disputeId ?? null,
  };
}

export const payouts = query({
  args: { paginationOpts: paginationOptsValidator, status: payoutStatus },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const result = await ctx.db
      .query("payouts")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((p) => payoutRow(ctx, p))) };
  },
});

export const payout = query({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const p = await ctx.db.get("payouts", args.payoutId);
    if (p === null) return null;
    const items = await ctx.db
      .query("payoutItems")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", p._id))
      .take(100);
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", p._id))
      .take(50);
    return {
      ...(await payoutRow(ctx, p)),
      recipientCode: p.recipientCode ?? null,
      items: await Promise.all(
        items.map(async (i) => ({
          orderId: i.orderId,
          orderNumber: (await ctx.db.get("orders", i.orderId))?.number ?? "",
          itemsTotalKobo: i.itemsTotalKobo,
          commissionKobo: i.commissionKobo,
          amountKobo: i.amountKobo,
        })),
      ),
      ledger: entries.map((e) => ({ _id: e._id, kind: e.kind, amountKobo: e.amountKobo, status: e.status, at: e._creationTime })),
    };
  },
});

export const refunds = query({
  args: { paginationOpts: paginationOptsValidator, status: refundStatus },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const result = await ctx.db
      .query("refunds")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((r) => refundRow(ctx, r))) };
  },
});

/** Refunds not settled yet: queued, sending, processing, and failed ones to retry. */
export const refundsWaiting = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "money.view");
    const out: Doc<"refunds">[] = [];
    for (const status of ["failed", "sending", "queued", "processing"] as const) {
      out.push(
        ...(await ctx.db
          .query("refunds")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(100)),
      );
    }
    return await Promise.all(out.map((r) => refundRow(ctx, r)));
  },
});

/** A-65: payments that didn't match a checkout, and Paystack events we couldn't place. */
export const reconciliation = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "money.view");
    const mismatches = (
      await ctx.db
        .query("paymentAttempts")
        .withIndex("by_status", (q) => q.eq("status", "mismatch"))
        .order("desc")
        .take(200)
    ).filter((a) => a.resolvedAt === undefined);
    const unmatched = await ctx.db
      .query("unmatchedPaymentEvents")
      .withIndex("by_resolvedAt", (q) => q.eq("resolvedAt", undefined))
      .order("desc")
      .take(200);
    const failedRefunds = await ctx.db
      .query("refunds")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(100);
    const failedPayouts = await ctx.db
      .query("payouts")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(100);
    return {
      live: paymentsLive(),
      mismatches: await Promise.all(
        mismatches.map(async (a) => {
          const checkout = await ctx.db.get("checkouts", a.checkoutId);
          return {
            _id: a._id,
            reference: a.reference,
            checkoutReference: checkout?.reference ?? null,
            checkoutStatus: checkout?.status ?? null,
            expectedKobo: a.amountKobo,
            paidKobo: a.paidAmountKobo ?? null,
            currency: a.currency,
            provider: a.provider,
            paidAt: a.paidAt ?? null,
            failureReason: a.failureReason ?? null,
          };
        }),
      ),
      unmatched: unmatched.map((e) => ({
        _id: e._id,
        event: e.event,
        reference: e.reference,
        amountKobo: e.amountKobo ?? null,
        status: e.status ?? null,
        at: e._creationTime,
      })),
      failedRefundCount: failedRefunds.length,
      failedPayoutCount: failedPayouts.length,
    };
  },
});

/** A-65: a paid attempt that didn't fit its checkout. Refund it, or dismiss it after checking. */
export const resolveMismatch = mutation({
  args: { attemptId: v.id("paymentAttempts"), decision: v.union(v.literal("refund"), v.literal("dismiss")), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const attempt = await ctx.db.get("paymentAttempts", args.attemptId);
    if (attempt === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (attempt.status !== "mismatch" || attempt.resolvedAt !== undefined) throw new ConvexError({ code: "ALREADY_RESOLVED" });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: `payments.mismatch_${args.decision}`,
      targetTable: "paymentAttempts",
      targetId: attempt._id,
      reason: args.reason,
      details: { reference: attempt.reference, paidKobo: attempt.paidAmountKobo ?? null },
    });
    if (args.decision === "refund") {
      const amountKobo = attempt.paidAmountKobo ?? attempt.amountKobo;
      // The refund row needs an order: use the checkout's first one. No ledger
      // row, because this money never entered that order's escrow.
      const order = await ctx.db
        .query("orders")
        .withIndex("by_checkoutId", (q) => q.eq("checkoutId", attempt.checkoutId))
        .first();
      if (order === null) throw new ConvexError({ code: "NO_ORDER" });
      if (!Number.isInteger(amountKobo) || amountKobo <= 0) throw new ConvexError({ code: "INVALID_AMOUNT" });
      const refundId = await ctx.db.insert("refunds", {
        orderId: order._id,
        checkoutId: attempt.checkoutId,
        userId: attempt.userId,
        farmId: order.farmId,
        amountKobo,
        kind: "full",
        reason: `Payment mismatch ${attempt.reference}: ${args.reason.trim()}`,
        status: "queued",
        provider: attempt.provider,
        transactionReference: attempt.reference,
        attempts: 0,
        actorId: staff._id,
      });
      await ctx.scheduler.runAfter(0, internal.payments.refunds.send, { refundId });
    }
    await ctx.db.patch("paymentAttempts", attempt._id, { resolution: args.decision, resolvedAt: Date.now() });
  },
});

export const resolveUnmatched = mutation({
  args: { eventId: v.id("unmatchedPaymentEvents"), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const event = await ctx.db.get("unmatchedPaymentEvents", args.eventId);
    if (event === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (event.resolvedAt !== undefined) return;
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "payments.resolve_unmatched",
      targetTable: "unmatchedPaymentEvents",
      targetId: event._id,
      reason: args.reason,
      details: { event: event.event, reference: event.reference },
    });
    await ctx.db.patch("unmatchedPaymentEvents", event._id, {
      resolvedAt: Date.now(),
      resolvedBy: staff._id,
      resolveReason: args.reason.trim(),
    });
  },
});

/** A-64: send a failed payout again, with a new Paystack reference. */
export const retryPayout = mutation({
  args: { payoutId: v.id("payouts"), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (payout === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (payout.status !== "failed") throw new ConvexError({ code: "NOT_FAILED", status: payout.status });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "payments.retry_payout",
      targetTable: "payouts",
      targetId: payout._id,
      reason: args.reason,
      details: { reference: payout.reference, amountKobo: payout.amountKobo },
    });
    const reference = await freshReference(ctx, payout);
    await ctx.scheduler.runAfter(0, internal.payments.payouts.send, { payoutId: payout._id });
    return { reference };
  },
});

/**
 * A-63: send a failed refund again. Staff check Paystack first: a send that
 * stalled may already have gone through, and refunds have no idempotency key.
 */
export const retryRefund = mutation({
  args: { reason: v.string(), refundId: v.id("refunds") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const refund = await ctx.db.get("refunds", args.refundId);
    if (refund === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (refund.status !== "failed") throw new ConvexError({ code: "NOT_FAILED", status: refund.status });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "payments.retry_refund",
      targetTable: "refunds",
      targetId: refund._id,
      reason: args.reason,
      details: { amountKobo: refund.amountKobo, failureReason: refund.failureReason ?? null },
    });
    await ctx.db.patch("refunds", refund._id, { status: "queued", failureReason: undefined, providerRefundId: undefined });
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_refundId", (q) => q.eq("refundId", refund._id))
      .take(5);
    for (const e of entries) await ctx.db.patch("ledgerEntries", e._id, { status: "pending" });
    await ctx.scheduler.runAfter(0, internal.payments.refunds.send, { refundId: refund._id });
  },
});

/** For checkBankList: throws unless the caller is staff who can see money. */
export const staffCheck = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "money.view");
    return true;
  },
});

/** Compares the app's bank list (lib/banks.ts) with Paystack's live list of Nigerian banks. */
export const checkBankList = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runQuery(internal.admin.payments.staffCheck, {});
    if (!paymentsLive()) return { live: false as const, checked: 0, missing: [], renamed: [], paystackCount: 0 };
    const result = await paystack<{ code: string; name: string; active?: boolean }[]>("/bank?country=nigeria&perPage=500");
    if (!result.ok) throw new ConvexError({ code: "PAYSTACK_ERROR", message: result.message });
    const byCode = new Map(result.data.map((b) => [b.code, b]));
    const missing = BANKS.filter((b) => !byCode.has(b.code)).map((b) => ({ code: b.code, name: b.name }));
    const renamed = BANKS.filter((b) => {
      const live = byCode.get(b.code);
      return live !== undefined && live.name.trim().toLowerCase() !== b.name.trim().toLowerCase();
    }).map((b) => ({ code: b.code, ours: b.name, paystack: byCode.get(b.code)!.name }));
    return { live: true as const, checked: BANKS.length, missing, renamed, paystackCount: result.data.length };
  },
});
