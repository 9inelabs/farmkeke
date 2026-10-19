// Notification store: what deliver.ts reads and writes. `plan` decides, for one
// notification, which channels the alert type and the person's preferences
// allow, and builds the push messages, the SMS and the email (orderEmail and
// supportEmail for the shopping side, farmEmail for farms).
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "../_generated/server";
import { alertOfKind, channelOn, type Channel } from "../lib/alerts";
import {
  applicationApprovedEmail,
  applicationMoreInfoEmail,
  applicationReceivedEmail,
  applicationRejectedEmail,
  chatMessageEmail,
  confirmReminderEmail,
  disputeMessageEmail,
  farmDeadlineEmail,
  farmDeadlineExtendedEmail,
  farmDidNotAcceptEmail,
  farmListingEmail,
  farmLowStockEmail,
  farmMessageEmail,
  farmNewOrderEmail,
  farmOrderEndedEmail,
  farmPaymentReleasedEmail,
  farmPayoutAccountChangedEmail,
  farmPayoutFailedEmail,
  farmPayoutSentEmail,
  farmProblemDecisionEmail,
  farmProblemReportedEmail,
  farmReplyReminderEmail,
  farmReviewEmail,
  farmRiderAssignedEmail,
  hoursLines,
  lagosTime,
  orderAcceptedEmail,
  orderCancelledEmail,
  orderConfirmationEmail,
  orderDeliveredEmail,
  orderPreparingEmail,
  outForDeliveryEmail,
  paymentReleasedEmail,
  pickupReminderEmail,
  pickupWindowEndedEmail,
  problemDecisionEmail,
  problemReportReceivedEmail,
  readyForPickupEmail,
  refundSentEmail,
  reviewReminderEmail,
  supportReplyEmail,
  windowLabel,
  type ConfirmedOrder,
  type Email,
} from "../lib/emails";
import { claimSlot, markReadBatch, notify } from "../lib/notify";
import { DAY, getRules, HOUR } from "../lib/settings";

/** Message emails: at most one per thread in this window. */
export const MESSAGE_EMAIL_WINDOW_MS = 30 * 60_000;
const MESSAGE_KINDS = new Set(["chat_message", "dispute_message", "support_reply"]);

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
    const row = await ctx.db.get("notifications", args.notificationId);
    // Staff alerts are in-app only (lib/notify.notifyStaff)
    if (row === null || row.side === "staff") return null;
    const n = { ...row, side: row.side };
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

    const email = allow("email") ? await emailFor(ctx, n, user) : null;
    // Message emails share a once-per-thread gate (claimEmailSlot), keyed by
    // the person, the side, the kind and the order (or the ticket's href).
    const emailThrottleKey =
      email !== null && MESSAGE_KINDS.has(n.kind) ? `msg:${user._id}:${n.side}:${n.kind}:${n.orderId ?? n.href}` : undefined;
    return { push, sms, email, emailThrottleKey };
  },
});

/**
 * Claims a once-per-window slot (message emails, low-stock alerts). Returns
 * false when the key was used within the window. A mutation, so two
 * deliveries can't both win.
 */
export const claimEmailSlot = internalMutation({
  args: { key: v.string(), windowMs: v.number() },
  handler: async (ctx, args) => await claimSlot(ctx, args.key, args.windowMs),
});

const THROTTLE_KEEP_MS = 2 * DAY;

/** Cron: forgets throttle rows older than two days, a batch at a time. */
export const pruneThrottles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db
      .query("notificationThrottles")
      .withIndex("by_lastAt", (q) => q.lt("lastAt", Date.now() - THROTTLE_KEEP_MS))
      .take(200);
    for (const row of old) await ctx.db.delete("notificationThrottles", row._id);
    if (old.length === 200) await ctx.scheduler.runAfter(0, internal.notifications.store.pruneThrottles, {});
    return { deleted: old.length };
  },
});

/** The email for one notification, or null (shop and farm sides). */
async function emailFor(ctx: QueryCtx, n: Doc<"notifications">, user: Doc<"users">): Promise<Email | null> {
  if (n.side === "farm") return await farmEmail(ctx, n, user);
  if (n.kind === "support_reply") return await supportEmail(ctx, n, user);
  return await orderEmail(ctx, n, user);
}

/** "/support/<id>" -> "<id>" (the id part of an in-app href). */
const hrefId = (href: string, prefix: string) =>
  href.startsWith(prefix) ? (href.slice(prefix.length).split(/[/?#]/)[0] ?? null) : null;

/** Support replies on the shopping side; a ticket may have no order. */
async function supportEmail(ctx: QueryCtx, n: Doc<"notifications">, user: Doc<"users">): Promise<Email | null> {
  const raw = hrefId(n.href, "/support/");
  const ticketId = raw ? ctx.db.normalizeId("supportTickets", raw) : null;
  const ticket = ticketId ? await ctx.db.get("supportTickets", ticketId) : null;
  const order = n.orderId ? await ctx.db.get("orders", n.orderId) : null;
  // Guests with no email get no email.
  const to = user.isAnonymous ? order?.contact.email : (user.email ?? order?.contact.email);
  if (!to) return null;
  return supportReplyEmail({
    to,
    name: user.isAnonymous ? order?.contact.name : (user.name ?? order?.contact.name),
    ticketNumber: ticket?.number,
    preview: n.body,
    order: order ? { orderId: order._id, number: order.number } : undefined,
    isGuest: user.isAnonymous === true,
  });
}

// ---------------------------------------------------------------------------
// Order emails (shopping side). Shop kinds with no email: order_packed (push
// only, right after "being prepared"), back_in_stock and offer (nothing sends
// them yet).

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
    case "order_preparing": {
      const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
      return orderPreparingEmail({
        ...ref,
        fulfilment: order.fulfilment,
        window: order.window ? windowLabel(order.window) : undefined,
        pickupPointName: point?.name,
        isGuest,
      });
    }
    // Packed is push only: the shopper had the "being prepared" email minutes ago.
    case "order_packed":
      return null;
    case "order_cancelled":
      if (order.status !== "cancelled") return null;
      return orderCancelledEmail({
        ...ref,
        refundKobo: order.totalKobo,
        deliveryFeeKobo: order.deliveryFeeKobo,
        paymentMethod: await paymentMethodLabel(ctx, order),
      });
    case "pickup_reminder": {
      const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
      if (point === null || !order.pickupCode || order.collectBy === undefined) return null;
      return pickupReminderEmail({
        ...ref,
        pickupCode: order.pickupCode,
        pickupPoint: { name: point.name, address: point.address, hours: hoursLines(point.hours), phone: point.phone },
        collectBy: lagosTime(order.collectBy),
      });
    }
    case "pickup_overdue": {
      const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
      return pickupWindowEndedEmail({
        ...ref,
        pointName: point?.name ?? "the pickup point",
        heldKobo: order.escrow === "held" ? order.totalKobo : undefined,
      });
    }
    case "confirm_reminder":
      if (order.status !== "delivered" && order.status !== "collected") return null;
      return confirmReminderEmail({
        ...ref,
        how: order.status === "collected" ? "collected" : "delivered",
        heldKobo: order.escrow === "held" ? order.totalKobo : undefined,
        isGuest,
      });
    case "review_reminder":
      return reviewReminderEmail({ ...ref, isGuest });
    case "chat_message":
      return chatMessageEmail({ ...ref, preview: n.body, isGuest });
    case "dispute_message": {
      const dispute = order.disputeId ? await ctx.db.get("disputes", order.disputeId) : null;
      if (dispute === null) return null;
      return disputeMessageEmail({
        ...ref,
        caseNumber: dispute.number,
        from: n.title.startsWith("Farmkeke support") ? "Farmkeke support" : ref.farmName,
        preview: n.body,
        isGuest,
      });
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Farm emails (farming side). Farmers act in the app, so each email says where.

const SECTION_TITLES: Record<string, string> = {
  farm: "Farm details",
  produce: "What you grow",
  collection: "Collection details",
  documents: "Documents",
  payout: "Payout details",
};

// Same as farmerApplications.REVIEW_DAYS (F-09a "Expect a decision by")
const APPLICATION_REVIEW_DAYS = 2;

async function farmEmail(ctx: QueryCtx, n: Doc<"notifications">, user: Doc<"users">): Promise<Email | null> {
  const to = user.email;
  if (!to) return null;
  const farm = await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .first();
  const name = user.name;

  // F-09: application updates (the applicant may not have a farm yet)
  if (n.kind.startsWith("application_")) {
    const app = await ctx.db
      .query("farmerApplications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (app === null) return null;
    switch (n.kind) {
      case "application_received":
        if (!app.reference || app.submittedAt === undefined) return null;
        return applicationReceivedEmail({
          to,
          name,
          reference: app.reference,
          decisionBy: lagosTime(app.submittedAt + APPLICATION_REVIEW_DAYS * DAY, { time: false }),
        });
      case "application_approved":
        return applicationApprovedEmail({ to, name, farmName: farm?.name ?? app.farmName ?? "Your farm" });
      case "application_rejected":
        if (app.rejection === undefined) return null;
        return applicationRejectedEmail({
          to,
          name,
          reference: app.reference,
          reason: app.rejection.reason,
          note: app.rejection.note || undefined,
          reapplyFrom: app.rejection.reapplyAfter > n._creationTime ? lagosTime(app.rejection.reapplyAfter, { time: false }) : undefined,
        });
      case "application_more_info":
        if (app.moreInfo === undefined) return null;
        return applicationMoreInfoEmail({
          to,
          name,
          reference: app.reference,
          sections: app.moreInfo.sections.map((s) => SECTION_TITLES[s] ?? s),
          note: app.moreInfo.note,
        });
      default:
        return null;
    }
  }

  if (farm === null) return null;
  const base = { to, name, farmName: farm.name };
  const bank = (bankName: string, last4: string) => `${bankName} ••${last4}`;

  // Notifications that aren't about one order
  switch (n.kind) {
    case "payout_sent":
    case "payout_failed": {
      const raw = hrefId(n.href, "/payouts/");
      const payoutId = raw ? ctx.db.normalizeId("payouts", raw) : null;
      const payout = payoutId ? await ctx.db.get("payouts", payoutId) : null;
      if (payout === null) return null;
      const args = { ...base, amountKobo: payout.amountKobo, bank: bank(payout.bankName, payout.accountLast4), reference: payout.reference };
      return n.kind === "payout_sent" ? farmPayoutSentEmail(args) : farmPayoutFailedEmail({ ...args, reason: payout.failureReason });
    }
    case "payout_account_changed":
      return farmPayoutAccountChangedEmail({
        ...base,
        bank: bank(farm.bankName, farm.accountNumber.slice(-4)),
        accountName: farm.accountName,
        at: lagosTime(n._creationTime),
      });
    case "listing_approved":
    case "listing_sent_back":
    case "listing_unpublished":
    case "low_stock": {
      const raw = hrefId(n.href, "/listing/");
      const listingId = raw ? ctx.db.normalizeId("listings", raw) : null;
      const listing = listingId ? await ctx.db.get("listings", listingId) : null;
      if (listing === null || listing.farmId !== farm._id) return null;
      if (n.kind === "low_stock") {
        const low = [...listing.units].sort((a, b) => a.stock - b.stock)[0];
        if (low === undefined) return null;
        const unit = await ctx.db.get("units", low.unitId);
        return farmLowStockEmail({ ...base, listingName: listing.name, unit: unit?.singular ?? "unit", stock: low.stock });
      }
      return farmListingEmail({
        ...base,
        listingName: listing.name,
        outcome: n.kind === "listing_approved" ? "approved" : n.kind === "listing_unpublished" ? "unpublished" : "sent_back",
        reason: listing.reviewNote,
      });
    }
    case "support_reply":
      return farmMessageEmail({ ...base, kind: "support", from: "Farmkeke support", preview: n.body });
  }

  // Order notifications
  if (n.orderId === undefined) return null;
  const order = await ctx.db.get("orders", n.orderId);
  if (order === null || order.farmId !== farm._id) return null;
  const rules = await getRules(ctx);
  const ref = { ...base, number: order.number };
  switch (n.kind) {
    case "order_new":
      if (order.respondBy === undefined) return null;
      return farmNewOrderEmail({
        ...ref,
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, unit: unitOf(i), totalKobo: i.priceKobo * i.quantity })),
        itemsKobo: order.itemsTotalKobo,
        fulfilment: order.fulfilment,
        acceptBy: lagosTime(order.respondBy),
        hours: rules.farmerResponseHours,
      });
    case "order_deadline":
      if (order.respondBy === undefined || order.status !== "paid") return null;
      return farmDeadlineEmail({
        ...ref,
        acceptBy: lagosTime(order.respondBy),
        hoursLeft: Math.max(1, Math.round((order.respondBy - n._creationTime) / HOUR)),
      });
    case "deadline_extended": {
      if (order.respondBy === undefined) return null;
      const hours = Number(/(\d+) more hours?/.exec(n.body)?.[1]);
      return farmDeadlineExtendedEmail({ ...ref, acceptBy: lagosTime(order.respondBy), hours: Number.isFinite(hours) ? hours : undefined });
    }
    case "order_expired":
      return farmOrderEndedEmail({ ...ref, why: "expired" });
    case "order_cancelled":
      return farmOrderEndedEmail({ ...ref, why: "cancelled", reason: order.cancelReason });
    case "rider_assigned": {
      const rider = order.riderId ? await ctx.db.get("riders", order.riderId) : null;
      if (rider === null) return null;
      return farmRiderAssignedEmail({
        ...ref,
        riderName: rider.name,
        riderPhone: rider.phone,
        collectAt: order.riderCollectAt ? lagosTime(order.riderCollectAt) : undefined,
        changed: n.title.startsWith("New rider"),
      });
    }
    case "chat_message":
      return farmMessageEmail({
        ...ref,
        kind: "chat",
        from: (order.contact.name || "The shopper").trim().split(/\s+/)[0] ?? "The shopper",
        preview: n.body,
      });
    case "payment_released": {
      const items = await ctx.db
        .query("payoutItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .take(5);
      const amountKobo = items.reduce((sum, i) => sum + i.amountKobo, 0);
      if (amountKobo <= 0) return null;
      return farmPaymentReleasedEmail({ ...ref, amountKobo, bank: bank(farm.bankName, farm.accountNumber.slice(-4)) });
    }
  }

  // Problem reports
  const dispute = order.disputeId ? await ctx.db.get("disputes", order.disputeId) : null;
  if (dispute === null) return null;
  const caseRef = { ...ref, caseNumber: dispute.number };
  switch (n.kind) {
    case "dispute_opened": {
      const affected = dispute.itemIndexes
        .map((i) => order.items[i])
        .filter((i) => i !== undefined)
        .map((i) => `${i.name} × ${i.quantity}`);
      return farmProblemReportedEmail({
        ...caseRef,
        problem: [REASON_LABELS[dispute.reason], ...affected].join(" · "),
        note: dispute.note || undefined,
        replyBy: lagosTime(dispute.farmReplyBy),
        replyHours: rules.disputeReplyHours,
      });
    }
    case "dispute_reply_reminder":
      if (dispute.status !== "open") return null;
      return farmReplyReminderEmail({
        ...caseRef,
        replyBy: lagosTime(dispute.farmReplyBy),
        overdue: false,
        hoursLeft: Math.max(1, Math.round((dispute.farmReplyBy - n._creationTime) / HOUR)),
      });
    case "dispute_reply_overdue":
      return farmReplyReminderEmail({ ...caseRef, replyBy: lagosTime(dispute.farmReplyBy), overdue: true });
    case "dispute_resolved":
      if (dispute.outcome === undefined) return null;
      return farmProblemDecisionEmail({
        ...caseRef,
        outcome: dispute.outcome === "refunded" ? "full_refund" : dispute.outcome === "split" ? "part_refund" : "no_refund",
        reason: dispute.decisionNote ?? "",
        refundKobo: dispute.refundKobo,
        releasedKobo: dispute.releaseKobo,
      });
    case "dispute_message":
      return farmMessageEmail({
        ...caseRef,
        kind: "dispute",
        from: n.title.startsWith("Farmkeke support") ? "Farmkeke support" : "The shopper",
        preview: n.body,
      });
    default:
      return null;
  }
}
