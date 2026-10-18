// A-50 All orders, A-51 Order detail, A-52 Intervene (cancel with a full
// refund, extend the farm's deadline, reassign the rider), and the stuck view.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { notifyConsumer, notifyFarm } from "../lib/notify";
import { endWithFullRefund, logOrderEvent, orderCore, orderRow, restoreStock, transition, type OrderStatus } from "../lib/orders";
import { HOUR } from "../lib/settings";
import { fulfilment, orderStatus } from "../schema";
import { windowEnd } from "./dispatch";

const READERS = ["operations", "support", "finance"] as const;
const OPERATORS = ["operations"] as const;

// Staff can cancel until the order reaches the shopper
const CANCELLABLE: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "accepted",
  "preparing",
  "ready_for_rider",
  "out_for_delivery",
  "with_rider",
  "at_pickup_point",
];
// Still at the farm: the stock can go back
const AT_FARM: OrderStatus[] = ["awaiting_payment", "paid", "accepted", "preparing", "ready_for_rider"];
const RIDER_STAGES: OrderStatus[] = ["accepted", "preparing", "ready_for_rider", "out_for_delivery", "with_rider"];

async function adminRow(ctx: QueryCtx, o: Doc<"orders">) {
  return {
    ...(await orderRow(ctx, o)),
    consumerName: o.contact.name,
    consumerPhone: o.contact.phone,
    escrowHold: o.escrowHold === true,
    riderId: o.riderId ?? null,
    disputeId: o.disputeId ?? null,
    unconfirmedFlaggedAt: o.unconfirmedFlaggedAt ?? null,
  };
}

/** A-50: filter by status, fulfilment, farm and date (placed between `from` and `to`). */
export const list = query({
  args: {
    farmId: v.optional(v.id("farms")),
    from: v.optional(v.number()),
    fulfilment: v.optional(fulfilment),
    paginationOpts: paginationOptsValidator,
    status: v.optional(orderStatus),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, [...READERS]);
    const { farmId, status, from, to } = args;
    const lo = from ?? 0;
    const hi = to ?? Number.MAX_SAFE_INTEGER;
    let q;
    if (farmId !== undefined && status !== undefined) {
      q = ctx.db
        .query("orders")
        .withIndex("by_farmId_and_status", (r) =>
          r.eq("farmId", farmId).eq("status", status).gte("_creationTime", lo).lte("_creationTime", hi),
        );
    } else if (farmId !== undefined) {
      q = ctx.db
        .query("orders")
        .withIndex("by_farmId_and_status", (r) => r.eq("farmId", farmId))
        .filter((f) => f.and(f.gte(f.field("_creationTime"), lo), f.lte(f.field("_creationTime"), hi)));
    } else if (status !== undefined) {
      q = ctx.db
        .query("orders")
        .withIndex("by_status", (r) => r.eq("status", status).gte("_creationTime", lo).lte("_creationTime", hi));
    } else {
      q = ctx.db.query("orders").withIndex("by_creation_time", (r) => r.gte("_creationTime", lo).lte("_creationTime", hi));
    }
    if (args.fulfilment !== undefined) {
      const want = args.fulfilment;
      q = q.filter((f) => f.eq(f.field("fulfilment"), want));
    }
    const result = await q.order("desc").paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((o) => adminRow(ctx, o))) };
  },
});

/** A-51: everything about one order. */
export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, [...READERS]);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) return null;
    const consumer = await ctx.db.get("users", order.userId);
    const farm = await ctx.db.get("farms", order.farmId);
    const checkout = await ctx.db.get("checkouts", order.checkoutId);
    const rider = order.riderId ? await ctx.db.get("riders", order.riderId) : null;
    const refunds = await ctx.db
      .query("refunds")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);
    const payoutItems = await ctx.db
      .query("payoutItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(10);
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .unique();
    const events = await ctx.db
      .query("orderEvents")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(200);
    const actorNames = new Map<string, string>();
    for (const e of events) {
      if (e.actorId && !actorNames.has(e.actorId)) {
        const u = await ctx.db.get("users", e.actorId);
        actorNames.set(e.actorId, u?.name ?? u?.email ?? "");
      }
    }
    return {
      ...(await orderCore(ctx, order)),
      escrowHold: order.escrowHold === true,
      holdReason: order.holdReason ?? null,
      pickupCode: order.pickupCode ?? null,
      contact: order.contact,
      street: order.address?.street ?? null,
      landmark: order.address?.landmark ?? null,
      consumer: {
        userId: order.userId,
        name: consumer?.name ?? order.contact.name,
        email: consumer?.email ?? order.contact.email ?? null,
        isGuest: consumer?.isAnonymous === true,
      },
      farmDetail: farm === null ? null : { _id: farm._id, name: farm.name, phone: farm.phone, collectionAddress: farm.collectionAddress },
      payment: checkout === null ? null : { checkoutReference: checkout.reference, reference: checkout.paymentReference ?? null, provider: checkout.paymentProvider ?? null },
      riderDetail: rider === null ? null : { _id: rider._id, name: rider.name, phone: rider.phone },
      unconfirmedFlaggedAt: order.unconfirmedFlaggedAt ?? null,
      refunds: refunds.map((r) => ({ _id: r._id, amountKobo: r.amountKobo, kind: r.kind, status: r.status, reason: r.reason, at: r._creationTime })),
      payoutIds: payoutItems.map((p) => p.payoutId),
      conversationId: conversation?._id ?? null,
      timeline: events.map((e) => ({
        _id: e._id,
        kind: e.kind,
        at: e._creationTime,
        actorKind: e.actorKind,
        actorName: e.actorId ? (actorNames.get(e.actorId) ?? null) : null,
        note: e.note ?? null,
      })),
      notes: events
        .filter((e) => e.kind === "staff_note")
        .map((e) => ({ _id: e._id, at: e._creationTime, note: e.note ?? "", authorName: e.actorId ? (actorNames.get(e.actorId) ?? null) : null })),
    };
  },
});

/** A-51 internal note (kept on the timeline as "staff_note"). */
export const addNote = mutation({
  args: { note: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, [...READERS]);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    const note = args.note.trim();
    if (note.length === 0) throw new ConvexError({ code: "NOTE_REQUIRED" });
    if (note.length > 4000) throw new ConvexError({ code: "NOTE_TOO_LONG" });
    await logOrderEvent(ctx, order._id, "staff_note", { kind: "staff", id: staff._id }, note);
  },
});

/** A-52: staff cancel. Paid money is refunded in full, delivery fee included. */
export const cancel = mutation({
  args: { orderId: v.id("orders"), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, [...OPERATORS]);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (!CANCELLABLE.includes(order.status)) throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    const reason = args.reason.trim();
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "order.cancel",
      targetTable: "orders",
      targetId: order._id,
      reason,
      details: { number: order.number, status: order.status, refundKobo: order.escrow === "held" ? order.totalKobo : 0 },
    });
    const actor = { kind: "staff" as const, id: staff._id };
    if (order.status === "awaiting_payment") {
      await transition(ctx, order, "cancelled", actor, { endedAt: Date.now(), cancelReason: reason }, reason);
      await restoreStock(ctx, order);
      return;
    }
    const ended = await endWithFullRefund(ctx, order, "cancelled", actor, { cancelReason: reason }, reason, AT_FARM.includes(order.status));
    await notifyConsumer(
      ctx,
      ended,
      "order_cancelled",
      `Order ${order.number} was cancelled`,
      "Farmkeke cancelled this order. You'll get a full refund to your original payment method.",
    );
    await notifyFarm(ctx, ended, "order_cancelled", `Order ${order.number} was cancelled`, `Farmkeke cancelled this order: ${reason}`);
  },
});

/** A-52: more time for the farm to accept. expireOne reschedules itself to the new deadline. */
export const extendDeadline = mutation({
  args: { hours: v.number(), orderId: v.id("orders"), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, [...OPERATORS]);
    if (!Number.isInteger(args.hours) || args.hours < 1 || args.hours > 72) throw new ConvexError({ code: "INVALID_HOURS" });
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.status !== "paid") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    const now = Date.now();
    const respondBy = Math.max(now, order.respondBy ?? now) + args.hours * HOUR;
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "order.extend_deadline",
      targetTable: "orders",
      targetId: order._id,
      reason: args.reason,
      details: { number: order.number, hours: args.hours, from: order.respondBy ?? null, to: respondBy },
    });
    await ctx.db.patch("orders", order._id, { respondBy, respondReminderAt: undefined });
    await logOrderEvent(ctx, order._id, "deadline_extended", { kind: "staff", id: staff._id }, `+${args.hours}h: ${args.reason.trim()}`);
    await notifyFarm(
      ctx,
      { ...order, respondBy },
      "deadline_extended",
      `More time for order ${order.number}`,
      `Farmkeke gave you ${args.hours} more hours to accept or decline.`,
    );
    return { respondBy };
  },
});

/** A-52: give the delivery to another rider. */
export const reassignRider = mutation({
  args: { collectAt: v.optional(v.number()), orderId: v.id("orders"), reason: v.string(), riderId: v.id("riders") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, [...OPERATORS]);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (!RIDER_STAGES.includes(order.status)) throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    const rider = await ctx.db.get("riders", args.riderId);
    if (rider === null || !rider.active) throw new ConvexError({ code: "RIDER_UNAVAILABLE" });
    const previous = order.riderId ? await ctx.db.get("riders", order.riderId) : null;
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "order.reassign_rider",
      targetTable: "orders",
      targetId: order._id,
      reason: args.reason,
      details: { number: order.number, from: previous?.name ?? null, to: rider.name },
    });
    await ctx.db.patch("orders", order._id, { riderId: rider._id, riderCollectAt: args.collectAt ?? order.riderCollectAt });
    await logOrderEvent(ctx, order._id, "rider_reassigned", { kind: "staff", id: staff._id }, `${rider.name}: ${args.reason.trim()}`);
    if (AT_FARM.includes(order.status)) {
      await notifyFarm(ctx, order, "rider_assigned", `New rider for order ${order.number}`, `${rider.name} (${rider.phone}) will collect it.`);
    }
  },
});

/** A-50 saved view: orders that need a person to look at them. `now` comes from the client. */
export const stuck = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, [...READERS]);
    const now = args.now;
    const out: { order: Doc<"orders">; reason: string }[] = [];
    const scan = async (status: OrderStatus, test: (o: Doc<"orders">) => string | null) => {
      const rows = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(300);
      for (const o of rows) {
        const reason = test(o);
        if (reason) out.push({ order: o, reason });
      }
    };
    await scan("paid", (o) => (o.respondBy !== undefined && o.respondBy < now ? "deadline_passed" : null));
    await scan("accepted", (o) => ((o.acceptedAt ?? o._creationTime) < now - 48 * HOUR ? "not_preparing" : null));
    await scan("preparing", (o) => ((o.preparingAt ?? o._creationTime) < now - 48 * HOUR ? "not_ready" : null));
    await scan("ready_for_rider", (o) =>
      o.riderId === undefined
        ? "no_rider"
        : o.riderCollectAt !== undefined && o.riderCollectAt < now - 2 * HOUR
          ? "not_collected_from_farm"
          : null,
    );
    await scan("out_for_delivery", (o) => {
      const end = windowEnd(o.window);
      return end !== null && end < now - 2 * HOUR ? "delivery_late" : null;
    });
    await scan("with_rider", (o) => ((o.handedOverAt ?? o._creationTime) < now - 24 * HOUR ? "not_at_pickup_point" : null));
    await scan("at_pickup_point", (o) => (o.collectBy !== undefined && o.collectBy < now ? "not_collected" : null));
    await scan("delivered", (o) => (o.unconfirmedFlaggedAt !== undefined ? "unconfirmed" : null));
    await scan("collected", (o) => (o.unconfirmedFlaggedAt !== undefined ? "unconfirmed" : null));
    return await Promise.all(out.map(async ({ order, reason }) => ({ ...(await adminRow(ctx, order)), reason })));
  },
});
