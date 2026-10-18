// Payouts (F-63, A-64): released money goes to the farm's bank by automatic
// Paystack Transfer, minus Farmkeke's commission (taken at release). Test
// payments and test mode (no key) are recorded as simulated payouts.
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction, internalMutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { getViewer } from "../lib/auth";
import { naira, notify } from "../lib/notify";
import { paymentsLive, paystack } from "../lib/paystack";

async function viewerFarm(ctx: QueryCtx) {
  const user = await getViewer(ctx);
  if (user === null || user.isAnonymous) return null;
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
}

const row = (p: Doc<"payouts">) => ({
  _id: p._id,
  amountKobo: p.amountKobo,
  status: p.status,
  reference: p.reference,
  bankName: p.bankName,
  accountLast4: p.accountLast4,
  simulated: p.provider === "simulated",
  createdAt: p._creationTime,
  sentAt: p.sentAt ?? null,
  failed: p.status === "failed",
});

/** F-63 payout history. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return [];
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
      .order("desc")
      .take(100);
    return payouts.map(row);
  },
});

/** F-63 payout detail with the orders it pays for. */
export const get = query({
  args: { payoutId: v.string() },
  handler: async (ctx, args) => {
    const farm = await viewerFarm(ctx);
    const id = ctx.db.normalizeId("payouts", args.payoutId);
    const payout = id ? await ctx.db.get("payouts", id) : null;
    if (farm === null || payout === null || payout.farmId !== farm._id) return null;
    const items = await ctx.db
      .query("payoutItems")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", payout._id))
      .take(100);
    return {
      ...row(payout),
      items: await Promise.all(
        items.map(async (i) => {
          const order = await ctx.db.get("orders", i.orderId);
          return {
            orderId: i.orderId,
            number: order?.number ?? "",
            itemsTotalKobo: i.itemsTotalKobo,
            commissionKobo: i.commissionKobo,
            amountKobo: i.amountKobo,
          };
        }),
      ),
    };
  },
});

/** Claims a payout for sending. Null if it's sent, failed, or already in flight. */
export const beginSend = internalMutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (payout === null || payout.status !== "pending" || payout.sending || payout.transferCode) return null;
    const farm = await ctx.db.get("farms", payout.farmId);
    if (farm === null) return null;
    await ctx.db.patch("payouts", payout._id, { sending: true, attempts: payout.attempts + 1, sendStartedAt: Date.now() });
    const recipient = await ctx.db
      .query("payoutRecipients")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
      .take(10);
    const match = recipient.find((r) => r.bankCode === farm.bankCode && r.accountNumber === farm.accountNumber);
    return {
      farmId: farm._id,
      provider: payout.provider,
      amountKobo: payout.amountKobo,
      reference: payout.reference,
      recipientCode: match?.recipientCode ?? null,
      accountName: farm.accountName,
      accountNumber: farm.accountNumber,
      bankCode: farm.bankCode,
    };
  },
});

export const saveRecipient = internalMutation({
  args: { farmId: v.id("farms"), bankCode: v.string(), accountNumber: v.string(), recipientCode: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("payoutRecipients")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .take(10);
    for (const r of existing) await ctx.db.delete("payoutRecipients", r._id);
    await ctx.db.insert("payoutRecipients", args);
  },
});

/** A fresh reference before a retry (Paystack references are single-use). */
export const newReference = internalMutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (payout === null || payout.status === "sent") return null;
    const base = payout.reference.replace(/-\d+$/, "");
    const reference = `${base}-${payout.attempts + 1}`;
    await ctx.db.patch("payouts", payout._id, {
      reference,
      status: "pending",
      sending: false,
      transferCode: undefined,
      failureReason: undefined,
    });
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", payout._id))
      .take(10);
    for (const e of entries) await ctx.db.patch("ledgerEntries", e._id, { status: "pending" });
    return reference;
  },
});

type Claim = {
  farmId: Id<"farms">;
  provider: "paystack" | "simulated";
  amountKobo: number;
  reference: string;
  recipientCode: string | null;
  accountName: string;
  accountNumber: string;
  bankCode: string;
};

export const send = internalAction({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const claim: Claim | null = await ctx.runMutation(internal.payments.payouts.beginSend, { payoutId: args.payoutId });
    if (claim === null) return;
    const finish = (status: "sent" | "pending" | "failed", extra: { transferCode?: string; reason?: string } = {}) =>
      ctx.runMutation(internal.payments.payouts.finishSend, { payoutId: args.payoutId, status, ...extra });

    if (claim.provider === "simulated" || !paymentsLive()) {
      await finish("sent", { reason: "simulated" });
      return;
    }
    let recipientCode = claim.recipientCode;
    if (recipientCode === null) {
      const created = await paystack<{ recipient_code: string }>("/transferrecipient", {
        body: {
          type: "nuban",
          name: claim.accountName,
          account_number: claim.accountNumber,
          bank_code: claim.bankCode,
          currency: "NGN",
        },
      });
      if (!created.ok) {
        await finish("failed", { reason: `Recipient: ${created.message}` });
        return;
      }
      recipientCode = created.data.recipient_code;
      await ctx.runMutation(internal.payments.payouts.saveRecipient, {
        farmId: claim.farmId,
        bankCode: claim.bankCode,
        accountNumber: claim.accountNumber,
        recipientCode,
      });
    }
    const transfer = await paystack<{ transfer_code: string; status: string }>("/transfer", {
      body: {
        source: "balance",
        amount: claim.amountKobo,
        recipient: recipientCode,
        reference: claim.reference,
        currency: "NGN",
        reason: `Farmkeke payout ${claim.reference}`,
      },
    });
    if (!transfer.ok) {
      await finish("failed", { reason: transfer.message });
      return;
    }
    // "success" now, or "pending"/"otp"/"queued" until the transfer.* webhook
    await finish(transfer.data.status === "success" ? "sent" : "pending", {
      transferCode: transfer.data.transfer_code,
      reason: transfer.data.status === "otp" ? "Transfer needs OTP: turn off OTP for transfers in Paystack" : undefined,
    });
  },
});

async function markPayout(
  ctx: MutationCtx,
  payout: Doc<"payouts">,
  status: "sent" | "failed",
  reason?: string,
) {
  const now = Date.now();
  await ctx.db.patch("payouts", payout._id, {
    status,
    sending: false,
    sentAt: status === "sent" ? now : undefined,
    failureReason: status === "failed" ? (reason ?? "failed") : undefined,
  });
  const entries = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_payoutId", (q) => q.eq("payoutId", payout._id))
    .take(10);
  for (const e of entries) await ctx.db.patch("ledgerEntries", e._id, { status: status === "sent" ? "done" : "failed" });
  if (status === "sent") {
    const farm = await ctx.db.get("farms", payout.farmId);
    if (farm !== null) {
      await notify(ctx, {
        userId: farm.userId,
        side: "farm",
        kind: "payout_sent",
        title: "Payout sent",
        body: `${naira(payout.amountKobo)} was sent to ${payout.bankName} ••${payout.accountLast4}.`,
        href: `/payouts/${payout._id}`,
        smsTo: farm.phone,
      });
    }
  }
}

export const finishSend = internalMutation({
  args: {
    payoutId: v.id("payouts"),
    status: v.union(v.literal("sent"), v.literal("pending"), v.literal("failed")),
    transferCode: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (payout === null || payout.status !== "pending") return;
    if (args.status === "pending") {
      await ctx.db.patch("payouts", payout._id, {
        sending: false,
        transferCode: args.transferCode,
        failureReason: args.reason,
      });
      return;
    }
    if (args.transferCode) await ctx.db.patch("payouts", payout._id, { transferCode: args.transferCode });
    await markPayout(ctx, payout, args.status, args.reason);
  },
});

/** Paystack transfer.success / transfer.failed / transfer.reversed webhook events. */
export const settleTransfer = internalMutation({
  args: {
    event: v.string(),
    reference: v.string(),
    status: v.optional(v.string()),
    transferCode: v.optional(v.string()),
    amountKobo: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payout = await ctx.db
      .query("payouts")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (payout === null) {
      await ctx.db.insert("unmatchedPaymentEvents", {
        event: args.event,
        reference: args.reference,
        amountKobo: args.amountKobo,
        status: args.status,
      });
      return;
    }
    if (args.event === "transfer.success") {
      if (payout.status !== "sent") await markPayout(ctx, payout, "sent");
    } else if (args.event === "transfer.failed" || args.event === "transfer.reversed") {
      // A reversal after "sent" means the money came back: staff retry (A-64).
      await markPayout(ctx, { ...payout, status: "pending" }, "failed", args.reason ?? args.event);
    }
  },
});
