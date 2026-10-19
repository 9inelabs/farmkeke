// Paying for a checkout with Paystack (M-43 to M-46, W-24). One checkout =
// one Paystack transaction. Success arrives by webhook, by the return page,
// or by `verify`; `settleCharge` handles all three and is idempotent.
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, env, internalMutation, mutation, query } from "../_generated/server";
import { getViewer, requireUser } from "../lib/auth";
import { markCheckoutPaid, orderRow } from "../lib/orders";
import {
  chargeArgs,
  paymentEmail,
  paymentsLive,
  paystack,
  testStepOn,
  websiteUrl,
  type PaystackTransaction,
} from "../lib/paystack";
import { hitLimit } from "../lib/rateLimit";
import { paymentMethod } from "../schema";

const START_LIMIT = { max: 10, windowMs: 10 * 60_000 };

const cardArgs = v.object({
  authorizationCode: v.string(),
  brand: v.string(),
  last4: v.string(),
  expMonth: v.string(),
  expYear: v.string(),
  bank: v.optional(v.string()),
  reusable: v.boolean(),
  signature: v.optional(v.string()),
});

/** W-24 pay page: the checkout's state and its orders. Owner only. */
export const get = query({
  args: { checkoutId: v.string() },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const id = ctx.db.normalizeId("checkouts", args.checkoutId);
    const checkout = id ? await ctx.db.get("checkouts", id) : null;
    if (user === null || checkout === null || checkout.userId !== user._id) return null;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
      .take(50);
    const last = await ctx.db
      .query("paymentAttempts")
      .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
      .order("desc")
      .first();
    return {
      _id: checkout._id,
      reference: checkout.reference,
      status: checkout.status,
      fulfilment: checkout.fulfilment,
      itemsTotalKobo: checkout.itemsTotalKobo,
      deliveryFeeKobo: checkout.deliveryFeeKobo,
      totalKobo: checkout.totalKobo,
      paidAt: checkout.paidAt ?? null,
      contact: checkout.contact,
      canSaveCard: user.isAnonymous !== true,
      lastAttempt:
        last === null
          ? null
          : {
              status: last.status,
              method: last.method ?? null,
              reason: last.failureReason ?? null,
              reference: last.reference,
              // Phase 5: W-27 "Card ending 4081", W-29 "Transfer started 10:41"
              channel: last.channel ?? null,
              cardBrand: last.cardBrand ?? null,
              cardLast4: last.cardLast4 ?? null,
              startedAt: last.startedAt ?? last._creationTime,
            },
      orders: await Promise.all(orders.map((o) => orderRow(ctx, o))),
      payments: { live: paymentsLive(), testStep: testStepOn() },
    };
  },
});

/** Checks the caller owns the checkout and opens a payment attempt. */
export const beginAttempt = internalMutation({
  args: {
    checkoutId: v.id("checkouts"),
    method: paymentMethod,
    saveCard: v.optional(v.boolean()),
    savedCardId: v.optional(v.id("savedCards")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const checkout = await ctx.db.get("checkouts", args.checkoutId);
    if (checkout === null || checkout.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    if (checkout.status === "paid") throw new ConvexError({ code: "ALREADY_PAID" });
    if (checkout.status !== "awaiting_payment") throw new ConvexError({ code: "CHECKOUT_EXPIRED" });
    await hitLimit(ctx, `pay:${user._id}`, START_LIMIT.max, START_LIMIT.windowMs);
    let authorizationCode: string | undefined;
    let savedCard: { brand: string; last4: string } | undefined;
    if (args.method === "saved_card") {
      const card = args.savedCardId ? await ctx.db.get("savedCards", args.savedCardId) : null;
      if (card === null || card.userId !== user._id) throw new ConvexError({ code: "CARD_NOT_FOUND" });
      authorizationCode = card.authorizationCode;
      savedCard = { brand: card.brand, last4: card.last4 };
    }
    const previous = await ctx.db
      .query("paymentAttempts")
      .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
      .take(100);
    const reference = `${checkout.reference}-${previous.length + 1}`;
    const email = paymentEmail(checkout.contact.email ?? (user.isAnonymous ? undefined : user.email), checkout.contact.phone);
    await ctx.db.insert("paymentAttempts", {
      checkoutId: checkout._id,
      userId: user._id,
      reference,
      provider: "paystack",
      method: args.method,
      status: "started",
      amountKobo: checkout.totalKobo,
      currency: "NGN",
      email,
      // Guests can't keep cards (no account to keep them on)
      saveCard: args.saveCard === true && !user.isAnonymous ? true : undefined,
      savedCardId: args.savedCardId,
      startedAt: Date.now(),
      // A saved card is known before Paystack answers (W-27 "Card ending 4081")
      cardBrand: savedCard?.brand,
      cardLast4: savedCard?.last4,
    });
    return { reference, amountKobo: checkout.totalKobo, email, authorizationCode, checkoutReference: checkout.reference };
  },
});

/** Records the Paystack page we opened. */
export const attemptOpened = internalMutation({
  args: { reference: v.string(), authorizationUrl: v.string() },
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("paymentAttempts")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (attempt === null || attempt.status !== "started") return;
    await ctx.db.patch("paymentAttempts", attempt._id, { status: "opened", authorizationUrl: args.authorizationUrl });
  },
});

/** M-43 Pay: opens a Paystack payment (or charges a saved card). */
export const start = action({
  args: {
    checkoutId: v.id("checkouts"),
    method: paymentMethod,
    saveCard: v.optional(v.boolean()),
    savedCardId: v.optional(v.id("savedCards")),
    // Where Paystack sends the shopper back; the website by default
    returnTo: v.optional(v.union(v.literal("web"), v.literal("app"))),
  },
  handler: async (ctx, args): Promise<{ accessCode: string; authorizationUrl: string; reference: string }> => {
    if (!paymentsLive()) throw new ConvexError({ code: "PAYMENTS_NOT_LIVE" });
    const { returnTo, ...attemptArgs } = args;
    const begun: { reference: string; amountKobo: number; email: string; authorizationCode?: string; checkoutReference: string } =
      await ctx.runMutation(internal.payments.checkout.beginAttempt, attemptArgs);
    const metadata = { checkoutId: args.checkoutId, checkoutReference: begun.checkoutReference };

    if (args.method === "saved_card") {
      const charged = await paystack<PaystackTransaction>("/transaction/charge_authorization", {
        body: {
          email: begun.email,
          amount: begun.amountKobo,
          currency: "NGN",
          authorization_code: begun.authorizationCode,
          reference: begun.reference,
          metadata,
        },
      });
      await ctx.runMutation(
        internal.payments.checkout.settleCharge,
        charged.ok
          ? chargeArgs(charged.data)
          : { reference: begun.reference, status: "failed", reason: charged.message },
      );
      return { accessCode: "", authorizationUrl: "", reference: begun.reference };
    }

    const callbackUrl =
      returnTo === "app"
        ? `${env.CONVEX_SITE_URL}/paystack/return?checkoutId=${args.checkoutId}`
        : `${websiteUrl()}/checkout/pay/${args.checkoutId}`;
    const channels = args.method === "card" ? ["card"] : args.method === "bank_transfer" ? ["bank_transfer"] : ["ussd"];
    const opened = await paystack<{ authorization_url: string; access_code: string; reference: string }>(
      "/transaction/initialize",
      {
        body: {
          email: begun.email,
          amount: begun.amountKobo,
          currency: "NGN",
          reference: begun.reference,
          callback_url: callbackUrl,
          channels,
          metadata: { ...metadata, cancel_action: callbackUrl },
        },
      },
    );
    if (!opened.ok) {
      await ctx.runMutation(internal.payments.checkout.settleCharge, {
        reference: begun.reference,
        status: "failed",
        reason: opened.message,
      });
      throw new ConvexError({ code: "PAYMENT_START_FAILED", message: "We couldn't open the payment. Try again." });
    }
    await ctx.runMutation(internal.payments.checkout.attemptOpened, {
      reference: begun.reference,
      authorizationUrl: opened.data.authorization_url,
    });
    return {
      accessCode: opened.data.access_code,
      authorizationUrl: opened.data.authorization_url,
      reference: begun.reference,
    };
  },
});

/** The caller's checkout state and its attempts still waiting for an answer. */
export const openAttempts = internalMutation({
  args: { checkoutId: v.id("checkouts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const checkout = await ctx.db.get("checkouts", args.checkoutId);
    if (checkout === null || checkout.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    const attempts = await ctx.db
      .query("paymentAttempts")
      .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
      .order("desc")
      .take(10);
    return {
      status: checkout.status,
      references: attempts
        .filter((a) => a.provider === "paystack" && (a.status === "started" || a.status === "opened"))
        .map((a) => a.reference),
    };
  },
});

/** M-46 "Check again": asks Paystack about open attempts. */
export const verify = action({
  args: { checkoutId: v.id("checkouts") },
  handler: async (ctx, args): Promise<{ status: string; paid: boolean }> => {
    const open: { status: string; references: string[] } = await ctx.runMutation(
      internal.payments.checkout.openAttempts,
      { checkoutId: args.checkoutId },
    );
    let status = open.status;
    if (status === "awaiting_payment" && paymentsLive()) {
      for (const reference of open.references) {
        const tx = await paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
        if (!tx.ok) continue;
        // Still on the payment page: leave it open.
        if (!["success", "failed", "abandoned", "reversed"].includes(tx.data.status)) continue;
        const settled: { checkoutStatus: string | null } = await ctx.runMutation(
          internal.payments.checkout.settleCharge,
          chargeArgs(tx.data),
        );
        if (settled.checkoutStatus) status = settled.checkoutStatus;
        if (status === "paid") break;
      }
    }
    return { status, paid: status === "paid" };
  },
});

/**
 * One Paystack answer for one attempt (webhook, return page, verify, saved card).
 * Idempotent. A payment we can't apply becomes a mismatch for staff (A-65).
 */
export const settleCharge = internalMutation({
  args: {
    reference: v.string(),
    status: v.string(),
    amountKobo: v.optional(v.number()),
    currency: v.optional(v.string()),
    channel: v.optional(v.string()),
    email: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    reason: v.optional(v.string()),
    card: v.optional(cardArgs),
    // Phase 5: the card's brand and last 4 digits, also for failed payments
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ outcome: string; checkoutStatus: string | null }> => {
    const attempt = await ctx.db
      .query("paymentAttempts")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (attempt === null) {
      if (args.status === "success") {
        const seen = await ctx.db
          .query("unmatchedPaymentEvents")
          .withIndex("by_reference", (q) => q.eq("reference", args.reference))
          .first();
        if (seen === null) {
          await ctx.db.insert("unmatchedPaymentEvents", {
            event: "charge.success",
            reference: args.reference,
            amountKobo: args.amountKobo,
            status: args.status,
          });
        }
      }
      return { outcome: "unmatched", checkoutStatus: null };
    }
    const checkout = await ctx.db.get("checkouts", attempt.checkoutId);
    const checkoutStatus = checkout?.status ?? null;
    if (attempt.status === "success" || attempt.status === "mismatch") return { outcome: "duplicate", checkoutStatus };

    if (args.status !== "success") {
      if (["failed", "abandoned", "reversed"].includes(args.status)) {
        await ctx.db.patch("paymentAttempts", attempt._id, {
          status: args.status === "abandoned" ? "abandoned" : "failed",
          failureReason: args.reason ?? args.status,
          channel: args.channel,
          ...(args.cardLast4 ? { cardLast4: args.cardLast4, cardBrand: args.cardBrand } : {}),
        });
        return { outcome: "failed", checkoutStatus };
      }
      return { outcome: "pending", checkoutStatus };
    }

    const paidAt = args.paidAt ?? Date.now();
    const card = args.card;
    const paid = {
      paidAmountKobo: args.amountKobo,
      paidAt,
      channel: args.channel,
      cardBrand: card?.brand ?? args.cardBrand ?? attempt.cardBrand,
      cardLast4: card?.last4 ?? args.cardLast4 ?? attempt.cardLast4,
    };
    const amountOk = args.amountKobo === attempt.amountKobo && (args.currency ?? "NGN") === "NGN";
    if (checkout === null || checkout.status !== "awaiting_payment" || !amountOk) {
      await ctx.db.patch("paymentAttempts", attempt._id, {
        ...paid,
        status: "mismatch",
        failureReason: !amountOk ? "amount_mismatch" : `checkout_${checkout?.status ?? "missing"}`,
      });
      return { outcome: "mismatch", checkoutStatus };
    }
    await ctx.db.patch("paymentAttempts", attempt._id, { ...paid, status: "success" });
    await markCheckoutPaid(ctx, checkout._id, { provider: "paystack", reference: attempt.reference, paidAt });

    if (attempt.saveCard && card?.reusable) {
      const existing = card.signature
        ? await ctx.db
            .query("savedCards")
            .withIndex("by_userId_and_signature", (q) => q.eq("userId", attempt.userId).eq("signature", card.signature))
            .first()
        : null;
      const fields = {
        authorizationCode: card.authorizationCode,
        email: args.email ?? attempt.email ?? "",
        brand: card.brand,
        last4: card.last4,
        expMonth: card.expMonth,
        expYear: card.expYear,
        bank: card.bank,
        signature: card.signature,
      };
      if (existing === null) await ctx.db.insert("savedCards", { userId: attempt.userId, ...fields });
      else await ctx.db.patch("savedCards", existing._id, fields);
    }
    return { outcome: "paid", checkoutStatus: "paid" };
  },
});

/** "Pay (test)": marks a checkout paid without Paystack. Only while the test step is on. */
export const markPaidTest = mutation({
  args: { checkoutId: v.id("checkouts") },
  handler: async (ctx, args): Promise<{ checkoutId: Id<"checkouts">; reference: string }> => {
    if (!testStepOn()) throw new ConvexError({ code: "TEST_STEP_OFF" });
    const user = await requireUser(ctx);
    const checkout = await ctx.db.get("checkouts", args.checkoutId);
    if (checkout === null || checkout.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    if (checkout.status === "paid") throw new ConvexError({ code: "ALREADY_PAID" });
    if (checkout.status !== "awaiting_payment") throw new ConvexError({ code: "CHECKOUT_EXPIRED" });
    const reference = `TEST-${checkout.reference}`;
    const paidAt = Date.now();
    await ctx.db.insert("paymentAttempts", {
      checkoutId: checkout._id,
      userId: user._id,
      reference,
      provider: "simulated",
      channel: "test",
      status: "success",
      amountKobo: checkout.totalKobo,
      currency: "NGN",
      paidAmountKobo: checkout.totalKobo,
      paidAt,
      startedAt: paidAt,
    });
    await markCheckoutPaid(ctx, checkout._id, { provider: "simulated", reference, paidAt });
    return { checkoutId: checkout._id, reference };
  },
});
