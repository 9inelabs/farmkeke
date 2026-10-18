// Shopping side: orders (M-47, M-60 to M-66, W-50 to W-53). Guests own their
// orders through the anonymous identity on the device that placed them, so
// only that device can confirm. Find my order (number + phone) is view-only.
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { getViewer, requireAccount, requireUser } from "../lib/auth";
import { orderCore, orderRow, releaseOrder, transition } from "../lib/orders";
import { normalizeNigerianPhone } from "../lib/phone";
import { DAY, HOUR } from "../lib/settings";

const CLAIM_TOKEN_MS = HOUR;

/** Orders a shopper sees: paid ones, and ones still awaiting payment. */
const visible = (o: Doc<"orders">) => o.paidAt !== undefined || o.status === "awaiting_payment";

async function consumerView(ctx: QueryCtx, order: Doc<"orders">, viewOnly: boolean) {
  const core = await orderCore(ctx, order);
  const canConfirm = !viewOnly && (order.status === "delivered" || order.status === "collected");
  return {
    ...core,
    // The pickup code proves who you are at the point: owner's device only
    pickupCode: viewOnly ? null : (order.pickupCode ?? null),
    contact: viewOnly ? { name: order.contact.name.split(/\s+/)[0] ?? "", phone: null } : order.contact,
    address: viewOnly && core.address ? { ...core.address, street: null, landmark: null } : core.address,
    canConfirm,
    canReport: canConfirm,
    viewOnly,
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
    return await Promise.all(orders.filter(visible).map((o) => orderRow(ctx, o)));
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
    if (order === null || order.contact.phone !== phone || order.paidAt === undefined) return null;
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
      itemsTotalKobo: checkout.itemsTotalKobo,
      deliveryFeeKobo: checkout.deliveryFeeKobo,
      totalKobo: checkout.totalKobo,
      contact: checkout.contact,
      isGuest: user.isAnonymous === true,
      orders: await Promise.all(
        orders.map(async (o) => ({
          ...(await orderRow(ctx, o)),
          pickupCode: o.pickupCode ?? null,
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
      await ctx.db.patch("orders", order._id, { userId: account._id, claimedFrom: guest._id });
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
    return { claimed };
  },
});
