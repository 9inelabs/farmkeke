// Notification store: what deliver.ts reads and writes. `plan` decides, for one
// notification, which channels the alert type and the person's preferences
// allow, and builds the push messages, the SMS and the email.
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { alertOfKind, channelOn, type Channel } from "../lib/alerts";
import {
  farmDidNotAcceptEmail,
  hoursLines,
  lagosTime,
  orderAcceptedEmail,
  orderConfirmationEmail,
  orderDeliveredEmail,
  outForDeliveryEmail,
  paymentReleasedEmail,
  problemDecisionEmail,
  problemReportReceivedEmail,
  readyForPickupEmail,
  refundSentEmail,
  windowLabel,
  type ConfirmedOrder,
  type Email,
} from "../lib/emails";
import { markReadBatch, notify } from "../lib/notify";
import { getRules } from "../lib/settings";

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    side: v.union(v.literal("shop"), v.literal("farm")),
    kind: v.string(),
    title: v.string(),
    body: v.string(),
    href: v.string(),
    orderId: v.optional(v.id("orders")),
    smsTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => await notify(ctx, args),
});

export const logSms = internalMutation({
  args: {
    to: v.string(),
    body: v.string(),
    status: v.union(v.literal("recorded"), v.literal("sent"), v.literal("failed")),
    userId: v.optional(v.id("users")),
    notificationId: v.optional(v.id("notifications")),
    provider: v.optional(v.string()),
    providerReference: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("smsLog", args);
  },
});

/** Expo said these tokens are no longer registered: forget them. */
export const dropTokens = internalMutation({
  args: { tokens: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const token of args.tokens.slice(0, 500)) {
      const rows = await ctx.db
        .query("pushTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .take(10);
      for (const row of rows) await ctx.db.delete("pushTokens", row._id);
    }
  },
});

/** Marks a batch of unread notifications read, and continues until none are left. */
export const markAllReadBatch = internalMutation({
  args: { side: v.union(v.literal("shop"), v.literal("farm")), userId: v.id("users") },
  handler: async (ctx, args) => await markReadBatch(ctx, args.userId, args.side),
});

/** What to send for one notification, after the preferences are applied. */
export const plan = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const n = await ctx.db.get("notifications", args.notificationId);
    if (n === null) return null;
    const user = await ctx.db.get("users", n.userId);
    if (user === null) return null;
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", user._id).eq("side", n.side))
      .take(100);
    const alert = alertOfKind(n.side, n.kind);
    const allow = (channel: Channel) => channelOn(prefs, alert, n.side, channel);

    const tokens = allow("push")
      ? await ctx.db
          .query("pushTokens")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .take(10)
      : [];
    const push = tokens.map((t) => ({
      to: t.token,
      title: n.title,
      body: n.body,
      sound: "default" as const,
      priority: "high" as const,
      channelId: "default",
      data: { href: n.href, kind: n.kind, notificationId: n._id as string, side: n.side },
    }));

    // Farms get push and SMS. Shoppers get push, or SMS when there's no push;
    // guests always get SMS (Screen Inventory section 5).
    const wantsSms =
      n.smsTo !== undefined && allow("sms") && (n.side === "farm" || user.isAnonymous === true || push.length === 0);
    const sms = wantsSms
      ? { to: n.smsTo!, body: `Farmkeke: ${n.title}. ${n.body}`, userId: user._id, notificationId: n._id }
      : null;

    const email = allow("email") ? await orderEmail(ctx, n, user) : null;
    return { push, sms, email };
  },
});

// ---------------------------------------------------------------------------
// Order emails (shopping side)

const REASON_LABELS: Record<Doc<"disputes">["reason"], string> = {
  missing: "Missing items",
  damaged: "Damaged or spoiled",
  wrong_item: "Wrong item",
  not_received: "Order not received",
};

const unitOf = (i: Doc<"orders">["items"][number]) => (i.quantity === 1 ? i.unitSingular : i.unitPlural);

async function paymentMethodLabel(ctx: QueryCtx, order: Doc<"orders">): Promise<string | undefined> {
  const attempts = await ctx.db
    .query("paymentAttempts")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", order.checkoutId))
    .take(20);
  const paid = attempts.find((a) => a.status === "success");
  if (paid?.cardLast4) return `card ending ${paid.cardLast4}`;
  if (paid?.method === "bank_transfer") return "bank account";
  return undefined;
}

async function orderEmail(ctx: QueryCtx, n: Doc<"notifications">, user: Doc<"users">): Promise<Email | null> {
  if (n.side !== "shop" || n.orderId === undefined) return null;
  const order = await ctx.db.get("orders", n.orderId);
  if (order === null) return null;
  // Guests with no email get no email.
  const to = user.isAnonymous ? order.contact.email : (user.email ?? order.contact.email);
  if (!to) return null;
  const farm = await ctx.db.get("farms", order.farmId);
  const ref = {
    to,
    name: order.contact.name || user.name,
    orderId: order._id as string,
    number: order.number,
    farmName: farm?.name ?? "the farm",
  };
  const isGuest = user.isAnonymous === true;

  switch (n.kind) {
    case "order_placed": {
      // One email per checkout, sent with its first order's notification.
      const siblings = (
        await ctx.db
          .query("orders")
          .withIndex("by_checkoutId", (q) => q.eq("checkoutId", order.checkoutId))
          .take(50)
      ).filter((o) => o.paidAt !== undefined);
      if (siblings.length === 0 || siblings[0]!._id !== order._id) return null;
      const orders: ConfirmedOrder[] = [];
      for (const o of siblings) {
        const f = await ctx.db.get("farms", o.farmId);
        orders.push({
          orderId: o._id,
          number: o.number,
          farmName: f?.name ?? "Farm",
          items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, unit: unitOf(i), totalKobo: i.priceKobo * i.quantity })),
          itemsKobo: o.itemsTotalKobo,
          deliveryFeeKobo: o.deliveryFeeKobo,
          totalKobo: o.totalKobo,
        });
      }
      const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
      return orderConfirmationEmail({
        to,
        name: ref.name,
        isGuest,
        phone: order.contact.phone,
        orders,
        totalKobo: siblings.reduce((sum, o) => sum + o.totalKobo, 0),
        fulfilment: order.fulfilment,
        delivery: order.address
          ? { address: `${order.address.street}, ${order.address.areaName}`, window: order.window ? windowLabel(order.window) : undefined }
          : undefined,
        pickupPoint: point ? { name: point.name, address: point.address } : undefined,
      });
    }
    case "order_accepted": {
      const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
      return orderAcceptedEmail({
        ...ref,
        fulfilment: order.fulfilment,
        window: order.window ? windowLabel(order.window) : undefined,
        pickupPointName: point?.name,
      });
    }
    case "out_for_delivery": {
      const rider = order.riderId ? await ctx.db.get("riders", order.riderId) : null;
      return outForDeliveryEmail({
        ...ref,
        window: order.window ? windowLabel(order.window) : "soon",
        address: order.address ? `${order.address.street}, ${order.address.areaName}` : undefined,
        riderName: rider?.name,
      });
    }
    case "ready_for_pickup": {
      const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
      if (point === null || !order.pickupCode || order.collectBy === undefined) return null;
      const rules = await getRules(ctx);
      return readyForPickupEmail({
        ...ref,
        pickupCode: order.pickupCode,
        pickupPoint: { name: point.name, address: point.address, hours: hoursLines(point.hours), phone: point.phone },
        collectBy: lagosTime(order.collectBy, { time: false }),
        collectWithinDays: Math.max(rules.pickupHoldDays, point.collectWithinDays),
      });
    }
    case "order_delivered":
    case "order_collected":
      return orderDeliveredEmail({
        ...ref,
        how: n.kind === "order_collected" ? "collected" : "delivered",
        heldKobo: order.escrow === "held" ? order.totalKobo : undefined,
        isGuest,
      });
    case "order_declined":
    case "order_expired":
      return farmDidNotAcceptEmail({
        ...ref,
        refundKobo: order.totalKobo,
        why: n.kind === "order_expired" ? "timeout" : "declined",
        paymentMethod: await paymentMethodLabel(ctx, order),
      });
    case "dispute_opened":
    case "dispute_resolved": {
      const dispute = order.disputeId ? await ctx.db.get("disputes", order.disputeId) : null;
      if (dispute === null) return null;
      if (n.kind === "dispute_opened") {
        const affected = dispute.itemIndexes
          .map((i) => order.items[i])
          .filter((i) => i !== undefined)
          .map((i) => `${i.name} × ${i.quantity}`);
        return problemReportReceivedEmail({
          ...ref,
          caseNumber: dispute.number,
          problem: [REASON_LABELS[dispute.reason], ...affected].join(" · "),
          farmReplyBy: lagosTime(dispute.farmReplyBy),
          heldKobo: order.escrow === "held" ? order.totalKobo : undefined,
        });
      }
      if (dispute.outcome === undefined) return null;
      return problemDecisionEmail({
        ...ref,
        caseNumber: dispute.number,
        outcome: dispute.outcome === "refunded" ? "full_refund" : dispute.outcome === "split" ? "part_refund" : "no_refund",
        reason: dispute.decisionNote ?? "",
        refundKobo: dispute.refundKobo,
        releasedKobo: dispute.releaseKobo,
        deliveryFeeKobo: order.deliveryFeeKobo,
      });
    }
    case "refund_issued": {
      const refunds = await ctx.db
        .query("refunds")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .order("desc")
        .take(10);
      const refund = refunds.find((r) => r.status === "processed");
      if (refund === undefined) return null;
      return refundSentEmail({
        ...ref,
        amountKobo: refund.amountKobo,
        kind: refund.kind,
        method: (await paymentMethodLabel(ctx, order)) ?? "original payment method",
        reference: refund.providerRefundId,
        deliveryFeeKobo: order.deliveryFeeKobo,
      });
    }
    case "order_completed":
      return paymentReleasedEmail({ ...ref, amountKobo: order.itemsTotalKobo });
    default:
      return null;
  }
}
