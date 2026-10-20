// Delivery bills. Delivery orders are placed unpaid: each farm accepts and
// packs, staff brief a rider and set the delivery price, and once every farm
// in the checkout has answered and every accepted order is priced, one bill
// goes out (in-app, email and SMS). The shopper has 12 hours to pay, with a
// reminder at 6; an unpaid bill cancels its orders and tells the farms.
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { links } from "./emails";
import { naira, notifyConsumer, notifyFarm } from "./notify";
import { ENDED, restoreStock, SYSTEM, transition } from "./orders";
import { HOUR } from "./settings";

export const BILL_PAY_HOURS = 12;
export const BILL_REMINDER_HOURS = 6;
// Open unpaid delivery checkouts one shopper (or one phone number) can have
export const MAX_OPEN_BILLS = 3;
// ₦50,000: a typo guard on the price staff enter
export const MAX_DELIVERY_FEE_KOBO = 5_000_000;

/** A delivery order the farm has accepted and the shopper hasn't paid for. */
export const awaitingPayment = (o: Doc<"orders">) =>
  o.fulfilment === "delivery" && o.escrow === "none" && !ENDED.includes(o.status) && o.status !== "placed";

function newPayToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function ordersOf(ctx: MutationCtx, checkoutId: Id<"checkouts">) {
  return await ctx.db
    .query("orders")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkoutId))
    .take(50);
}

/** "farmkeke.com/pay/…" for SMS, where every character counts. */
const shortLink = (url: string) => url.replace(/^https?:\/\//, "");

/**
 * Sends the bill once it's complete: every farm has answered (accepted, or
 * declined / expired / cancelled) and every accepted order has a delivery
 * price. A checkout with no orders left is closed. Safe to call after any
 * change to the checkout's orders.
 */
export async function checkBill(ctx: MutationCtx, checkoutId: Id<"checkouts">) {
  const checkout = await ctx.db.get("checkouts", checkoutId);
  if (checkout === null || checkout.fulfilment !== "delivery" || checkout.status !== "awaiting_bill") return;
  const orders = await ordersOf(ctx, checkoutId);
  const live = orders.filter((o) => !ENDED.includes(o.status));
  const now = Date.now();
  if (live.length === 0) {
    // Every farm declined or the orders were cancelled; each was already told.
    await ctx.db.patch("checkouts", checkoutId, { status: "abandoned", abandonedAt: now, abandonReason: "no_orders_left" });
    return;
  }
  if (live.some((o) => o.status === "placed" || o.deliveryPricedAt === undefined)) return;

  const itemsTotalKobo = live.reduce((sum, o) => sum + o.itemsTotalKobo, 0);
  const deliveryFeeKobo = live.reduce((sum, o) => sum + o.deliveryFeeKobo, 0);
  const totalKobo = itemsTotalKobo + deliveryFeeKobo;
  const payBy = now + BILL_PAY_HOURS * HOUR;
  const payToken = newPayToken();
  await ctx.db.patch("checkouts", checkoutId, {
    status: "awaiting_payment",
    itemsTotalKobo,
    deliveryFeeKobo,
    totalKobo,
    billedAt: now,
    payBy,
    payToken,
  });
  for (const o of live) {
    await ctx.db.insert("orderEvents", { orderId: o._id, kind: "bill_sent", actorKind: "system", note: naira(totalKobo) });
  }
  await ctx.scheduler.runAt(now + BILL_REMINDER_HOURS * HOUR, internal.orders.system.billReminder, { checkoutId });
  await ctx.scheduler.runAt(payBy, internal.orders.system.billExpired, { checkoutId });
  const numbers = live.map((o) => o.number).join(", ");
  await notifyConsumer(
    ctx,
    live[0]!,
    "bill_ready",
    `Your bill for order ${numbers} is ready`,
    `${naira(totalKobo)}, including ${naira(deliveryFeeKobo)} delivery. Pay within ${BILL_PAY_HOURS} hours: ${shortLink(links.pay(payToken))}`,
    { href: `/pay/${payToken}` },
  );
}

/** Six hours in: one reminder if the bill is still unpaid. */
export async function remindBill(ctx: MutationCtx, checkout: Doc<"checkouts">) {
  if (checkout.status !== "awaiting_payment" || checkout.payToken === undefined || checkout.payBy === undefined) return;
  const live = (await ordersOf(ctx, checkout._id)).filter(awaitingPayment);
  if (live.length === 0) return;
  const hoursLeft = Math.max(1, Math.round((checkout.payBy - Date.now()) / HOUR));
  await notifyConsumer(
    ctx,
    live[0]!,
    "bill_reminder",
    `Pay for order ${live.map((o) => o.number).join(", ")} soon`,
    `${naira(checkout.totalKobo)} is due within ${hoursLeft} hours, or the order is cancelled: ${shortLink(links.pay(checkout.payToken))}`,
    { href: `/pay/${checkout.payToken}` },
  );
}

/**
 * Twelve hours up: the bill lapses. Its orders are cancelled, their stock
 * goes back, and the farms and the shopper are told. Nothing was paid, so
 * nothing is refunded.
 */
export async function expireBill(ctx: MutationCtx, checkout: Doc<"checkouts">) {
  if (checkout.status !== "awaiting_payment" || checkout.payBy === undefined) return;
  const now = Date.now();
  // A deadline moved later (nothing does this today) waits for its own job
  if (checkout.payBy > now + 1000) return;
  await ctx.db.patch("checkouts", checkout._id, { status: "abandoned", abandonedAt: now, abandonReason: "bill_not_paid" });
  const orders = (await ordersOf(ctx, checkout._id)).filter(awaitingPayment);
  for (const order of orders) {
    const ended = await transition(
      ctx,
      order,
      "cancelled",
      SYSTEM,
      { endedAt: now, cancelReason: "bill_not_paid" },
      "The bill wasn't paid in time",
    );
    await restoreStock(ctx, order);
    await notifyFarm(
      ctx,
      ended,
      "order_cancelled",
      `Order ${order.number} was cancelled`,
      "The shopper didn't pay in time, so the order is cancelled. Don't hand it to a rider; you can unpack it.",
    );
  }
  if (orders.length > 0) {
    await notifyConsumer(
      ctx,
      orders[0]!,
      "bill_expired",
      `Order ${orders.map((o) => o.number).join(", ")} was cancelled`,
      `The bill wasn't paid within ${BILL_PAY_HOURS} hours, so the order is cancelled. You weren't charged.`,
    );
  }
  const attempts = await ctx.db
    .query("paymentAttempts")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
    .take(20);
  for (const a of attempts) {
    if (a.status === "started" || a.status === "opened") await ctx.db.patch("paymentAttempts", a._id, { status: "abandoned" });
  }
}

/**
 * Who may pay a checkout: its owner, or anyone holding the bill's pay link
 * (a guest paying from another phone). Throws when neither.
 */
export function canPay(
  checkout: Doc<"checkouts"> | null,
  userId: Id<"users">,
  payToken?: string,
): asserts checkout is Doc<"checkouts"> {
  if (checkout === null) throw new ConvexError({ code: "NOT_FOUND" });
  if (checkout.userId === userId) return;
  if (payToken !== undefined && checkout.payToken !== undefined && payToken === checkout.payToken) return;
  throw new ConvexError({ code: "NOT_FOUND" });
}

/** A checkout can be paid now: awaiting payment and, for a bill, not past its time. */
export function assertPayable(checkout: Doc<"checkouts">) {
  if (checkout.status === "paid") throw new ConvexError({ code: "ALREADY_PAID" });
  if (checkout.status === "awaiting_bill") throw new ConvexError({ code: "BILL_NOT_READY" });
  if (checkout.status !== "awaiting_payment") throw new ConvexError({ code: "CHECKOUT_EXPIRED" });
  if (checkout.payBy !== undefined && Date.now() > checkout.payBy) throw new ConvexError({ code: "CHECKOUT_EXPIRED" });
}
