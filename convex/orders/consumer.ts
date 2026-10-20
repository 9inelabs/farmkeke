// Shopping side: orders (M-47, M-60 to M-66, W-50 to W-53). Guests own their
// orders through the anonymous identity on the device that placed them, so
// only that device can confirm. Find my order (number + phone) is view-only.
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { getViewer, requireAccount, requireUser } from "../lib/auth";
import { isOutOfStock } from "../lib/listing";
import { farmIsOpen, isShopListing } from "../lib/listingCounts";
import { collectFromView, isActive, orderCore, orderRow, pickupPointView, releaseOrder, transition } from "../lib/orders";
import { normalizeNigerianPhone } from "../lib/phone";
import { DAY, HOUR } from "../lib/settings";

const CLAIM_TOKEN_MS = HOUR;
// W-42 / W-44: the emailed link to add guest orders found by email
const LINK_TOKEN_MS = DAY;
const GUEST_EMAIL_SCAN = 200;

/** "ada.obi@gmail.com" -> "a***@gmail.com" (W-51c: which email links the order). */
function maskEmail(email: string | undefined) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!name || !domain) return null;
  return `${name[0]}***@${domain}`;
}

/**
 * Orders a shopper sees: paid ones, ones still awaiting payment, and every
 * delivery order (placed unpaid, then billed, or cancelled unpaid).
 */
const visible = (o: Doc<"orders">) => o.paidAt !== undefined || o.status === "awaiting_payment" || o.fulfilment === "delivery";

/** Delivery: where the order's bill stands, for the order page's "Pay now". */
async function billView(ctx: QueryCtx, order: Doc<"orders">, viewOnly: boolean) {
  if (order.fulfilment !== "delivery") return null;
  const checkout = await ctx.db.get("checkouts", order.checkoutId);
  if (checkout === null) return null;
  const state =
    checkout.status === "paid" || order.escrow !== "none"
      ? ("paid" as const)
      : checkout.status === "awaiting_bill"
        ? ("waiting_for_price" as const)
        : checkout.status === "awaiting_payment"
          ? ("ready_to_pay" as const)
          : ("not_paid" as const);
  return {
    state,
    checkoutId: checkout._id,
    totalKobo: checkout.totalKobo,
    deliveryFeeKobo: checkout.deliveryFeeKobo,
    billedAt: checkout.billedAt ?? null,
    payBy: checkout.payBy ?? null,
    // The pay link is the owner's to use or share
    payToken: viewOnly ? null : (checkout.payToken ?? null),
  };
}

async function consumerView(ctx: QueryCtx, order: Doc<"orders">, viewOnly: boolean) {
  const core = await orderCore(ctx, order);
  const canConfirm = !viewOnly && (order.status === "delivered" || order.status === "collected");
  return {
    ...core,
    bill: await billView(ctx, order, viewOnly),
    // The pickup code proves who you are at the point: owner's device only
    pickupCode: viewOnly ? null : (order.pickupCode ?? null),
    contact: viewOnly ? { name: order.contact.name.split(/\s+/)[0] ?? "", phone: null } : order.contact,
    address: viewOnly && core.address ? { ...core.address, street: null, landmark: null, note: null } : core.address,
    canConfirm,
    canReport: canConfirm,
    viewOnly,
    // W-51c: an account with this email picks the order up (orders are only
    // ever linked by email, never by phone). Masked; null without an email.
    linkEmailHint: viewOnly ? maskEmail(order.contact.email) : null,
  };
}

/** M-60 / W-50: the viewer's orders, newest first (guests: this device's). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null) return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
    return await Promise.all(
      orders.filter(visible).map(async (o) => {
        const row = await orderRow(ctx, o);
        if (o.fulfilment !== "delivery" || o.escrow !== "none" || !isActive(o)) return row;
        // Unpaid delivery: "Bill ready" once the bill is out
        const checkout = await ctx.db.get("checkouts", o.checkoutId);
        return { ...row, billReady: checkout?.status === "awaiting_payment" };
      }),
    );
  },
});

/** M-63 / W-51: one of the viewer's orders. */
export const get = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const id = ctx.db.normalizeId("orders", args.orderId);
    const order = id ? await ctx.db.get("orders", id) : null;
    if (user === null || order === null || order.userId !== user._id || !visible(order)) return null;
    return await consumerView(ctx, order, false);
  },
});

/** M-62 / W-53 Find my order: view-only, needs the order number and its phone. */
export const find = query({
  args: { number: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const number = args.number.trim().toUpperCase().replace(/^(\d)/, "FK-$1");
    const phone = normalizeNigerianPhone(args.phone);
    if (phone === null) return null;
    const order = await ctx.db
      .query("orders")
      .withIndex("by_number", (q) => q.eq("number", number))
      .unique();
    if (order === null || order.contact.phone !== phone || !visible(order) || order.status === "awaiting_payment") return null;
    const viewer = await getViewer(ctx);
    // The owner looking from their own device gets the full view.
    return await consumerView(ctx, order, viewer === null || viewer._id !== order.userId);
  },
});

/** M-47 / W-25 Order placed: each farm's order number for one checkout. */
export const placedSummary = query({
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
    return {
      checkoutId: checkout._id,
      reference: checkout.reference,
      status: checkout.status,
      paidAt: checkout.paidAt ?? null,
      fulfilment: checkout.fulfilment,
      // Delivery: nothing to pay until the bill comes
      payBy: checkout.payBy ?? null,
      payToken: checkout.payToken ?? null,
      itemsTotalKobo: checkout.itemsTotalKobo,
      deliveryFeeKobo: checkout.deliveryFeeKobo,
      totalKobo: checkout.totalKobo,
      contact: checkout.contact,
      isGuest: user.isAnonymous === true,
      // Phase 5 (W-30): "A Farmkeke rider delivers to 12 Wetheral Road"
      address:
        checkout.address === undefined
          ? null
          : {
              street: checkout.address.street,
              landmark: checkout.address.landmark,
              areaName: checkout.address.areaName,
              lga: checkout.address.lga,
              state: checkout.address.state,
              note: checkout.address.note ?? null,
            },
      pickupPoint: await pickupPointView(ctx, checkout.pickupPointId),
      window: checkout.window ?? null,
      orders: await Promise.all(
        orders.map(async (o) => ({
          ...(await orderRow(ctx, o)),
          pickupCode: o.pickupCode ?? null,
          collectFrom: await collectFromView(ctx, o),
        })),
      ),
    };
  },
});

/** M-65 / W-52 "I received everything": completes the order and releases the money. */
export const confirmReceipt = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    // Guests: only the identity (device) that placed the order can confirm.
    if (order === null || order.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.status !== "delivered" && order.status !== "collected") {
      throw new ConvexError({ code: "NOT_DELIVERED_YET", status: order.status });
    }
    const actor = { kind: user.isAnonymous ? ("guest" as const) : ("consumer" as const), id: user._id };
    const now = Date.now();
    const completed = await transition(ctx, order, "completed", actor, { confirmedAt: now, endedAt: now });
    // A staff hold (A-62) keeps the money until it's lifted.
    if (completed.escrow === "held" && !completed.escrowHold) await releaseOrder(ctx, completed, actor);
    await ctx.scheduler.runAfter(DAY, internal.reviews.remind, { orderId: order._id });
  },
});

/** M-49 / W-44 step 1 (still signed in as the guest): a one-time link token. */
export const startGuestClaim = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.isAnonymous) throw new ConvexError({ code: "NOT_A_GUEST" });
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await ctx.db.patch("users", user._id, { guestClaimToken: token, guestClaimExpiresAt: Date.now() + CLAIM_TOKEN_MS });
    return { token };
  },
});

/** M-49 / W-44 step 2 (now signed in to the account): moves the guest's orders over. */
export const claimGuestOrders = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx);
    if (args.token.length < 32) throw new ConvexError({ code: "INVALID_TOKEN" });
    const guest = await ctx.db
      .query("users")
      .withIndex("by_guestClaimToken", (q) => q.eq("guestClaimToken", args.token))
      .unique();
    if (guest === null || !guest.isAnonymous) throw new ConvexError({ code: "INVALID_TOKEN" });
    if ((guest.guestClaimExpiresAt ?? 0) < Date.now()) throw new ConvexError({ code: "TOKEN_EXPIRED" });
    await ctx.db.patch("users", guest._id, { guestClaimToken: undefined, guestClaimExpiresAt: undefined });
    let claimed = 0;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", guest._id))
      .take(500);
    for (const order of orders) {
      await moveOrderToAccount(ctx, order, account._id);
      claimed++;
    }
    const checkouts = await ctx.db
      .query("checkouts")
      .withIndex("by_userId", (q) => q.eq("userId", guest._id))
      .take(500);
    for (const checkout of checkouts) await ctx.db.patch("checkouts", checkout._id, { userId: account._id });
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", guest._id).eq("side", "shop"))
      .take(500);
    for (const n of notifications) await ctx.db.patch("notifications", n._id, { userId: account._id });
    if (claimed > 0) {
      // Security email: guest orders were added to this account
      const numbers = [...orders].sort((a, b) => b._creationTime - a._creationTime).map((o) => o.number);
      await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
        email: { kind: "guest_orders_added", userId: account._id, numbers: numbers.slice(0, 10), total: claimed },
      });
    }
    return { claimed };
  },
});

/**
 * Moves one order (and what hangs off it: its checkout, chat, problem report,
 * refunds and review) from a guest to an account.
 */
async function moveOrderToAccount(ctx: MutationCtx, order: Doc<"orders">, accountId: Id<"users">) {
  const from = order.userId;
  await ctx.db.patch("orders", order._id, { userId: accountId, claimedFrom: from });
  const checkout = await ctx.db.get("checkouts", order.checkoutId);
  if (checkout !== null && checkout.userId === from) await ctx.db.patch("checkouts", checkout._id, { userId: accountId });
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .unique();
  if (conversation !== null && conversation.userId === from) {
    await ctx.db.patch("conversations", conversation._id, { userId: accountId });
  }
  for (const d of await ctx.db
    .query("disputes")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(10)) {
    if (d.userId === from) await ctx.db.patch("disputes", d._id, { userId: accountId });
  }
  for (const r of await ctx.db
    .query("refunds")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(20)) {
    if (r.userId === from) await ctx.db.patch("refunds", r._id, { userId: accountId });
  }
  for (const r of await ctx.db
    .query("reviews")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(5)) {
    if (r.userId === from) await ctx.db.patch("reviews", r._id, { userId: accountId });
  }
}

/**
 * Paid orders placed as a guest (on any device) with this email, not yet in
 * an account. Only guest identities' orders: never another account's.
 */
async function guestOrdersByEmail(ctx: QueryCtx, account: Doc<"users">) {
  const email = account.email?.trim().toLowerCase();
  if (!email) return [];
  const rows = await ctx.db
    .query("orders")
    .withIndex("by_contact_email", (q) => q.eq("contact.email", email))
    .order("desc")
    .take(GUEST_EMAIL_SCAN);
  const guests = new Map<Id<"users">, boolean>();
  const found: Doc<"orders">[] = [];
  for (const o of rows) {
    if (o.userId === account._id || o.paidAt === undefined) continue;
    if (!guests.has(o.userId)) guests.set(o.userId, (await ctx.db.get("users", o.userId))?.isAnonymous === true);
    if (guests.get(o.userId)) found.push(o);
  }
  return found;
}

/**
 * W-42 / W-44: how many guest orders were placed with the account's email.
 * Only a count: the orders are shown once the shopper has proved the email
 * is theirs (linkGuestOrdersByEmail).
 */
export const linkableGuestOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous || !user.email) return { count: 0, email: null, verified: false };
    const orders = await guestOrdersByEmail(ctx, user);
    return { count: orders.length, email: user.email, verified: user.emailVerificationTime !== undefined };
  },
});

async function linkByEmail(ctx: MutationCtx, account: Doc<"users">) {
  const orders = await guestOrdersByEmail(ctx, account);
  for (const order of orders) await moveOrderToAccount(ctx, order, account._id);
  if (orders.length > 0) {
    await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
      email: {
        kind: "guest_orders_added",
        userId: account._id,
        numbers: orders.slice(0, 10).map((o) => o.number),
        total: orders.length,
      },
    });
  }
  return orders.length;
}

/**
 * W-42 / W-44 "Add them to my account" for guest orders placed elsewhere.
 * Orders are matched only by the account's email, never by phone number (there
 * is no SMS check). Sign-up doesn't verify the email, so unless it is already
 * verified, a one-time link goes to that address first; opening it
 * (confirmGuestOrdersLink) adds the orders. Returns:
 *   { status: "linked", linked }      email already verified: added now
 *   { status: "email_sent", count }   the link is on its way
 *   { status: "none" }                nothing to add
 */
export const linkGuestOrdersByEmail = mutation({
  args: {},
  handler: async (ctx) => {
    const account = await requireAccount(ctx);
    if (!account.email) throw new ConvexError({ code: "NO_EMAIL" });
    const orders = await guestOrdersByEmail(ctx, account);
    if (orders.length === 0) return { status: "none" as const, count: 0, linked: 0 };
    if (account.emailVerificationTime !== undefined) {
      return { status: "linked" as const, count: orders.length, linked: await linkByEmail(ctx, account) };
    }
    const now = Date.now();
    // At most one link email every 2 minutes
    const sentAt = account.guestLinkExpiresAt === undefined ? undefined : account.guestLinkExpiresAt - LINK_TOKEN_MS;
    if (sentAt !== undefined && now - sentAt < 2 * 60_000) {
      return { status: "email_sent" as const, count: orders.length, linked: 0 };
    }
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await ctx.db.patch("users", account._id, { guestLinkToken: token, guestLinkExpiresAt: now + LINK_TOKEN_MS });
    await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
      email: { kind: "guest_orders_confirm", userId: account._id, token, total: orders.length },
    });
    return { status: "email_sent" as const, count: orders.length, linked: 0 };
  },
});

/** The emailed link (W-44 `?link=`): proves the email, then adds its guest orders. */
export const confirmGuestOrdersLink = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const account = await requireAccount(ctx);
    if (args.token.length < 32 || account.guestLinkToken !== args.token) throw new ConvexError({ code: "INVALID_TOKEN" });
    if ((account.guestLinkExpiresAt ?? 0) < Date.now()) throw new ConvexError({ code: "TOKEN_EXPIRED" });
    await ctx.db.patch("users", account._id, {
      guestLinkToken: undefined,
      guestLinkExpiresAt: undefined,
      // Opening the link proved the address is theirs
      emailVerificationTime: account.emailVerificationTime ?? Date.now(),
    });
    return { linked: await linkByEmail(ctx, account) };
  },
});

const RECENT_ORDER_SCAN = 30;
const RECENT_MAX = 12;

/**
 * W-43 "Buy again": distinct listings from the viewer's recent paid orders,
 * newest first, that can still be bought (live, farm open, in stock).
 */
export const recentItems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return [];
    const limit = Math.max(1, Math.min(RECENT_MAX, Math.floor(args.limit ?? 6)));
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(RECENT_ORDER_SCAN);
    const seen = new Set<Id<"listings">>();
    const farms = new Map<Id<"farms">, Doc<"farms"> | null>();
    const items = [];
    for (const order of orders) {
      if (order.paidAt === undefined) continue;
      for (const item of order.items) {
        if (items.length >= limit) break;
        if (seen.has(item.listingId)) continue;
        seen.add(item.listingId);
        const listing = await ctx.db.get("listings", item.listingId);
        if (listing === null || !isShopListing(listing) || isOutOfStock(listing.units)) continue;
        if (!farms.has(listing.farmId)) farms.set(listing.farmId, await ctx.db.get("farms", listing.farmId));
        const farm = farms.get(listing.farmId) ?? null;
        if (farm === null || !farmIsOpen(farm)) continue;
        // The unit bought last time while it's still sold and in stock, else the first in stock
        const unit =
          listing.units.find((u) => u.unitId === item.unitId && u.stock > 0 && u.stock >= u.minOrder) ??
          listing.units.find((u) => u.stock > 0 && u.stock >= u.minOrder);
        if (unit === undefined) continue;
        const unitDoc = await ctx.db.get("units", unit.unitId);
        items.push({
          listingId: listing._id,
          unitId: unit.unitId,
          name: listing.name,
          imageUrl: listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null,
          priceKobo: unit.priceKobo,
          unitSingular: unitDoc?.singular ?? item.unitSingular,
          unitPlural: unitDoc?.plural ?? item.unitPlural,
          farmId: listing.farmId,
          farmName: farm.name,
          lastOrderedAt: order._creationTime,
          lastQuantity: item.quantity,
        });
      }
      if (items.length >= limit) break;
    }
    return items;
  },
});
