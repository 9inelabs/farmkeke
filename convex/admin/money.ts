// A-60 Money (since the Paystack split, 17 Nov 2026). Farmkeke doesn't hold
// shoppers' money: Paystack splits each payment at once, the farm's share to
// its subaccount and the rest (commission, delivery fee, any debt taken back)
// to Farmkeke. Staff see what came in and where it went, refunds (paid by
// Farmkeke), what farms owe for refunds, and which farms Paystack can't pay
// yet.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { naira, notify } from "../lib/notify";
import { paymentsLive } from "../lib/paystack";
import { DAY } from "../lib/settings";

type Paystack = "ready" | "setting_up" | "problem" | "test";

const paystackState = (farm: Doc<"farms">): Paystack =>
  !paymentsLive()
    ? "test"
    : farm.subaccountError !== undefined
      ? "problem"
      : farm.paystackSubaccountCode !== undefined
        ? "ready"
        : "setting_up";

/** A-60 header: the last 30 days of payments, and what needs a person. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "money.view");
    const since = Date.now() - 30 * DAY;
    const paid = await ctx.db
      .query("paymentAttempts")
      .withIndex("by_status", (q) => q.eq("status", "success").gte("_creationTime", since))
      .take(2000);
    let collectedKobo = 0;
    let farmSharesKobo = 0;
    let commissionKobo = 0;
    let recoveredKobo = 0;
    for (const a of paid) {
      collectedKobo += a.paidAmountKobo ?? a.amountKobo;
      for (const p of a.split ?? []) {
        farmSharesKobo += p.shareKobo;
        commissionKobo += p.commissionKobo;
        recoveredKobo += p.recoveredKobo;
      }
    }

    const refundsOpen = [];
    for (const status of ["queued", "sending", "processing"] as const) {
      refundsOpen.push(...(await ctx.db.query("refunds").withIndex("by_status", (q) => q.eq("status", status)).take(200)));
    }
    const refundsFailed = await ctx.db.query("refunds").withIndex("by_status", (q) => q.eq("status", "failed")).take(200);

    const farms = await ctx.db
      .query("farms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(1000);
    const owing = farms.filter((f) => (f.owedKobo ?? 0) > 0);
    const notReady = farms.filter((f) => {
      const s = paystackState(f);
      return s === "problem" || s === "setting_up";
    });

    return {
      payments: paid.length,
      collectedKobo,
      farmSharesKobo,
      commissionKobo,
      // Delivery fees: what's left once farms and commission are counted
      deliveryKobo: Math.max(0, collectedKobo - farmSharesKobo - commissionKobo - recoveredKobo),
      recoveredKobo,
      refundsOpen: refundsOpen.length,
      refundsOpenKobo: refundsOpen.reduce((s, r) => s + r.amountKobo, 0),
      refundsFailed: refundsFailed.length,
      farmsOwing: owing.length,
      owedKobo: owing.reduce((s, f) => s + (f.owedKobo ?? 0), 0),
      farmsNotReady: notReady.length,
      farmsWithProblem: notReady.filter((f) => f.subaccountError !== undefined).length,
      live: paymentsLive(),
      capped: paid.length === 2000,
    };
  },
});

/** A-60 Payments: each successful payment and how Paystack split it, newest first. */
export const payments = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const result = await ctx.db
      .query("paymentAttempts")
      .withIndex("by_status", (q) => q.eq("status", "success"))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (a) => {
        const checkout = await ctx.db.get("checkouts", a.checkoutId);
        const parts = await Promise.all(
          (a.split ?? []).map(async (p) => {
            const [order, farm] = await Promise.all([ctx.db.get("orders", p.orderId), ctx.db.get("farms", p.farmId)]);
            return {
              orderId: p.orderId,
              orderNumber: order?.number ?? "",
              farmId: p.farmId,
              farmName: farm?.name ?? "Farm",
              shareKobo: p.shareKobo,
              commissionKobo: p.commissionKobo,
              recoveredKobo: p.recoveredKobo,
            };
          }),
        );
        const shares = parts.reduce((s, p) => s + p.shareKobo, 0);
        const amount = a.paidAmountKobo ?? a.amountKobo;
        return {
          _id: a._id,
          reference: a.reference,
          checkoutReference: checkout?.reference ?? "",
          shopperName: checkout?.contact.name ?? "",
          paidAt: a.paidAt ?? a._creationTime,
          amountKobo: amount,
          channel: a.channel ?? null,
          simulated: a.provider === "simulated",
          splitCode: a.splitCode ?? null,
          parts,
          // Commission, delivery fee and any debt taken back
          farmkekeKobo: amount - shares,
          firstOrderId: parts[0]?.orderId ?? null,
        };
      }),
    );
    return { ...result, page };
  },
});

/** A-60 Farms: what each farm owes for refunds, and whether Paystack can pay it. */
export const farms = query({
  args: { show: v.union(v.literal("owing"), v.literal("paystack")) },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const all = await ctx.db
      .query("farms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(1000);
    const rows = all
      .filter((f) => (args.show === "owing" ? (f.owedKobo ?? 0) !== 0 : paystackState(f) !== "ready"))
      .map((f) => ({
        farmId: f._id,
        name: f.name,
        owedKobo: f.owedKobo ?? 0,
        paystack: paystackState(f),
        subaccountCode: f.paystackSubaccountCode ?? null,
        subaccountError: f.subaccountError ?? null,
        syncedAt: f.subaccountSyncedAt ?? null,
        bankName: f.bankName,
        accountLast4: f.accountNumber.slice(-4),
        accountName: f.accountName,
      }));
    return args.show === "owing" ? rows.sort((a, b) => b.owedKobo - a.owedKobo) : rows;
  },
});

/** Try setting the farm up with Paystack again (after its bank details are fixed). */
export const retryPaystack = mutation({
  args: { farmId: v.id("farms"), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (!paymentsLive()) throw new ConvexError({ code: "PAYMENTS_NOT_LIVE" });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "farm.paystackRetry",
      targetTable: "farms",
      targetId: farm._id,
      reason: args.reason,
      details: { name: farm.name, error: farm.subaccountError ?? null },
    });
    await ctx.scheduler.runAfter(0, internal.payments.subaccounts.sync, { farmId: farm._id });
    return null;
  },
});

/**
 * Forgive some or all of what a farm owes for refunds (e.g. Farmkeke decides
 * to carry a loss). Never below zero; a credit is a separate decision.
 */
export const forgiveDebt = mutation({
  args: { farmId: v.id("farms"), amountKobo: v.number(), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) throw new ConvexError({ code: "NOT_FOUND" });
    const owed = Math.max(farm.owedKobo ?? 0, 0);
    if (!Number.isInteger(args.amountKobo) || args.amountKobo <= 0 || args.amountKobo > owed) {
      throw new ConvexError({ code: "INVALID_AMOUNT", owedKobo: owed });
    }
    const reason = args.reason.trim();
    if (reason.length === 0) throw new ConvexError({ code: "REASON_REQUIRED" });
    await ctx.db.patch("farms", farm._id, { owedKobo: owed - args.amountKobo });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "farm.forgiveDebt",
      targetTable: "farms",
      targetId: farm._id,
      reason,
      details: { name: farm.name, amountKobo: args.amountKobo, owedBefore: owed, owedAfter: owed - args.amountKobo },
    });
    // Tell the farm (in the app and by push; never texted)
    const left = owed - args.amountKobo;
    await notify(ctx, {
      userId: farm.userId,
      side: "farm",
      kind: "farm_debt_forgiven",
      title: `Farmkeke cleared ${naira(args.amountKobo)} you owed`,
      body:
        left > 0
          ? `That amount won't come off your next orders. ${naira(left)} still comes off your share of your next orders.`
          : "Nothing more will come off your share of your next orders.",
      href: "/earnings",
    });
    return { owedKobo: left };
  },
});
