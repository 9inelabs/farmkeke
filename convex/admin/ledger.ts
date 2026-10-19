// A-60 Escrow ledger, A-61 Release queue, A-62 Manual release or hold.
// Money never releases on its own: consumers confirm, or staff release here.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { logOrderEvent, releaseOrder, transition } from "../lib/orders";
import { escrowState } from "../schema";


async function ledgerRow(ctx: QueryCtx, order: Doc<"orders">) {
  const farm = await ctx.db.get("farms", order.farmId);
  return {
    orderId: order._id,
    number: order.number,
    status: order.status,
    escrow: order.escrow,
    escrowHold: order.escrowHold === true,
    holdReason: order.holdReason ?? null,
    farmId: order.farmId,
    farmName: farm?.name ?? "Farm",
    consumerName: order.contact.name,
    amountKobo: order.totalKobo,
    itemsTotalKobo: order.itemsTotalKobo,
    deliveryFeeKobo: order.deliveryFeeKobo,
    // "Held since" and "days since delivery" are worked out on the client from these
    heldSince: order.paidAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    confirmedAt: order.confirmedAt ?? null,
    releasedAt: order.releasedAt ?? null,
    unconfirmedFlaggedAt: order.unconfirmedFlaggedAt ?? null,
    disputeId: order.disputeId ?? null,
  };
}

/** A-51 / A-60: every money movement on one order. */
export const entries = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const rows = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .take(100);
    return await Promise.all(
      rows.map(async (e) => {
        const actor = e.actorId ? await ctx.db.get("users", e.actorId) : null;
        return {
          _id: e._id,
          at: e._creationTime,
          kind: e.kind,
          amountKobo: e.amountKobo,
          status: e.status,
          note: e.note ?? null,
          simulated: e.simulated === true,
          refundId: e.refundId ?? null,
          payoutId: e.payoutId ?? null,
          actorName: actor?.name ?? null,
        };
      }),
    );
  },
});

/** A-60: orders by escrow state, newest first. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator, state: v.optional(escrowState) },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    const state = args.state;
    const result =
      state === undefined
        ? await ctx.db.query("orders").order("desc").paginate(args.paginationOpts)
        : await ctx.db
            .query("orders")
            .withIndex("by_escrow", (q) => q.eq("escrow", state))
            .order("desc")
            .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((o) => ledgerRow(ctx, o))) };
  },
});

/**
 * A-61: confirmed but held back, unconfirmed a day after delivery (staff
 * contact the consumer, then decide), and blocked by a dispute.
 */
export const releaseQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "money.view");
    const held = await ctx.db
      .query("orders")
      .withIndex("by_escrow", (q) => q.eq("escrow", "held"))
      .order("desc")
      .take(500);
    const confirmed: Doc<"orders">[] = [];
    const unconfirmed: Doc<"orders">[] = [];
    const disputed: Doc<"orders">[] = [];
    for (const o of held) {
      if (o.status === "completed") confirmed.push(o);
      else if ((o.status === "delivered" || o.status === "collected") && o.unconfirmedFlaggedAt !== undefined) {
        unconfirmed.push(o);
      } else if (o.status === "disputed") disputed.push(o);
    }
    const rows = (list: Doc<"orders">[]) => Promise.all(list.map((o) => ledgerRow(ctx, o)));
    return { confirmed: await rows(confirmed), unconfirmed: await rows(unconfirmed), disputed: await rows(disputed) };
  },
});

/** A-62 Release by hand: after a delivered order is checked with the consumer. */
export const release = mutation({
  args: { orderId: v.id("orders"), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.escrow !== "held") throw new ConvexError({ code: "NOT_HELD", escrow: order.escrow });
    if (order.escrowHold) throw new ConvexError({ code: "ESCROW_ON_HOLD" });
    if (order.status === "disputed") throw new ConvexError({ code: "DISPUTED", message: "Resolve the dispute instead" });
    if (!["delivered", "collected", "completed"].includes(order.status)) {
      throw new ConvexError({ code: "NOT_DELIVERED_YET", status: order.status });
    }
    const actor = { kind: "staff" as const, id: staff._id };
    const now = Date.now();
    const done =
      order.status === "completed"
        ? order
        : await transition(ctx, order, "completed", actor, { endedAt: now }, `Released by staff: ${args.reason}`);
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "ledger.release",
      targetTable: "orders",
      targetId: order._id,
      reason: args.reason,
      details: { number: order.number, amountKobo: order.totalKobo },
    });
    await releaseOrder(ctx, done, actor, { note: args.reason });
  },
});

/** A-62 Hold or lift: freezes an order's money until lifted. */
export const setHold = mutation({
  args: { orderId: v.id("orders"), hold: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "money.manage");
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.escrow !== "held") throw new ConvexError({ code: "NOT_HELD", escrow: order.escrow });
    if ((order.escrowHold === true) === args.hold) return;
    const actor = { kind: "staff" as const, id: staff._id };
    await ctx.db.patch("orders", order._id, {
      escrowHold: args.hold ? true : undefined,
      holdReason: args.hold ? args.reason.trim() : undefined,
    });
    await logOrderEvent(ctx, order._id, args.hold ? "escrow_held_by_staff" : "escrow_hold_lifted", actor, args.reason);
    await writeAudit(ctx, {
      actorId: staff._id,
      action: args.hold ? "ledger.hold" : "ledger.unhold",
      targetTable: "orders",
      targetId: order._id,
      reason: args.reason,
      details: { number: order.number },
    });
    // The consumer already confirmed: lifting the hold pays the farm now.
    if (!args.hold && order.status === "completed") {
      await releaseOrder(ctx, { ...order, escrowHold: undefined }, actor, { note: args.reason });
    }
  },
});

/** A-60 header: money Farmkeke holds now, and what needs a person (first 1,000 held orders). */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "money.view");
    const held = await ctx.db
      .query("orders")
      .withIndex("by_escrow", (q) => q.eq("escrow", "held"))
      .take(1000);
    const failedPayouts = await ctx.db.query("payouts").withIndex("by_status", (q) => q.eq("status", "failed")).take(100);
    const failedRefunds = await ctx.db.query("refunds").withIndex("by_status", (q) => q.eq("status", "failed")).take(100);
    const pendingPayouts = await ctx.db.query("payouts").withIndex("by_status", (q) => q.eq("status", "pending")).take(500);
    return {
      heldKobo: held.reduce((sum, o) => sum + o.totalKobo, 0),
      heldOrders: held.length,
      onHold: held.filter((o) => o.escrowHold === true).length,
      toRelease: held.filter((o) => o.status === "completed").length,
      unconfirmed: held.filter((o) => (o.status === "delivered" || o.status === "collected") && o.unconfirmedFlaggedAt !== undefined).length,
      pendingPayoutKobo: pendingPayouts.reduce((sum, p) => sum + p.amountKobo, 0),
      failedPayouts: failedPayouts.length,
      failedRefunds: failedRefunds.length,
      capped: held.length === 1000,
    };
  },
});
