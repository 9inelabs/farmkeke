// Timers that drive escrow (A-85). Scheduled per order with runAt, with
// cron sweeps (crons.ts) as a safety net. Money never releases here: an
// unconfirmed order goes to staff (A-61), never straight to the farm.
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { notifyConsumer, notifyFarm } from "../lib/notify";
import { endWithFullRefund, SYSTEM } from "../lib/orders";
import { getRules, HOUR } from "../lib/settings";

const BATCH = 50;

async function expire(ctx: MutationCtx, order: Doc<"orders">) {
  const ended = await endWithFullRefund(ctx, order, "expired", SYSTEM, {}, "No response within the time allowed", true);
  await notifyConsumer(
    ctx,
    ended,
    "order_expired",
    `Order ${order.number} expired`,
    `Order ${order.number} expired because the farm didn't respond in time. Your money will be refunded.`,
  );
  await notifyFarm(
    ctx,
    ended,
    "order_expired",
    `Order ${order.number} expired`,
    "You didn't respond within the time allowed, so the order expired.",
  );
}

/** Runs at the order's accept deadline: no answer means expired and refunded in full. */
export const expireOne = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.status !== "paid") return;
    const now = Date.now();
    // Staff may have extended the deadline (A-52); wait for the new one.
    if (order.respondBy !== undefined && order.respondBy > now + 1000) {
      const expiryJobId = await ctx.scheduler.runAt(order.respondBy, internal.orders.system.expireOne, {
        orderId: order._id,
      });
      await ctx.db.patch("orders", order._id, { expiryJobId });
      return;
    }
    await expire(ctx, order);
  },
});

/** Cron safety net: expires any paid order past its deadline. */
export const expireUnanswered = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("orders")
      .withIndex("by_status_and_respondBy", (q) => q.eq("status", "paid").lte("respondBy", now))
      .take(BATCH);
    for (const order of due) await expire(ctx, order);
    if (due.length === BATCH) await ctx.scheduler.runAfter(0, internal.orders.system.expireUnanswered, {});
    return { expired: due.length };
  },
});

/** Cron: "deadline near" push + SMS to farms with a few hours left (section 5). */
export const remindFarmers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const soon = await ctx.db
      .query("orders")
      .withIndex("by_status_and_respondBy", (q) =>
        q.eq("status", "paid").gt("respondBy", now).lte("respondBy", now + 4 * HOUR),
      )
      .take(200);
    let sent = 0;
    for (const order of soon) {
      if (order.respondReminderAt !== undefined) continue;
      const hoursLeft = Math.max(1, Math.round(((order.respondBy ?? now) - now) / HOUR));
      await notifyFarm(
        ctx,
        order,
        "order_deadline",
        `Order ${order.number} is waiting`,
        `About ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left to accept or decline, or it expires and is refunded.`,
      );
      await ctx.db.patch("orders", order._id, { respondReminderAt: now });
      sent++;
    }
    return { sent };
  },
});

/**
 * Cron: delivered or collected orders still unconfirmed a day later go to the
 * A-61 release queue and the consumer gets a reminder. Pickup orders left at
 * the point past their 3 days are flagged for staff too.
 */
export const flagUnconfirmed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rules = await getRules(ctx);
    const cutoff = now - rules.unconfirmedAfterHours * HOUR;
    let flagged = 0;
    for (const status of ["delivered", "collected"] as const) {
      const late = await ctx.db
        .query("orders")
        .withIndex("by_status_and_deliveredAt", (q) => q.eq("status", status).lte("deliveredAt", cutoff))
        .take(200);
      for (const order of late) {
        if (order.unconfirmedFlaggedAt !== undefined) continue;
        await ctx.db.patch("orders", order._id, { unconfirmedFlaggedAt: now });
        await notifyConsumer(
          ctx,
          order,
          "confirm_reminder",
          `Did order ${order.number} arrive?`,
          "Please confirm you received everything, or tell us about a problem. The farm is paid once you confirm.",
        );
        flagged++;
      }
    }
    const overdue = await ctx.db
      .query("orders")
      .withIndex("by_status_and_collectBy", (q) => q.eq("status", "at_pickup_point").lte("collectBy", now))
      .take(200);
    for (const order of overdue) {
      if (order.pickupOverdueAt === undefined) {
        await markPickupOverdue(ctx, order, now);
        flagged++;
      }
    }
    return { flagged };
  },
});

async function markPickupOverdue(ctx: MutationCtx, order: Doc<"orders">, now: number) {
  await ctx.db.patch("orders", order._id, { pickupOverdueAt: now });
  await notifyConsumer(
    ctx,
    order,
    "pickup_overdue",
    `Order ${order.number} is still at the pickup point`,
    "Your collection time has passed. Contact Farmkeke support so we can sort it out.",
  );
}

/** A day before a pickup order's collect-by time: remind the shopper (scheduled by lib/orders.pickupDeadline). */
export const pickupReminder = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.status !== "at_pickup_point" || order.collectBy === undefined) return;
    if (order.collectBy <= Date.now()) return;
    const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
    await notifyConsumer(
      ctx,
      order,
      "pickup_reminder",
      `Collect order ${order.number} by tomorrow`,
      `It's waiting at ${point?.name ?? "the pickup point"}. Your code is ${order.pickupCode ?? "in the app"}.`,
    );
  },
});

/** Runs when a pickup order's 3 days at the point are up (scheduled by dispatch). */
export const pickupWindowEnded = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.status !== "at_pickup_point" || order.pickupOverdueAt !== undefined) return;
    const now = Date.now();
    if (order.collectBy !== undefined && order.collectBy > now + 1000) return;
    await markPickupOverdue(ctx, order, now);
  },
});
