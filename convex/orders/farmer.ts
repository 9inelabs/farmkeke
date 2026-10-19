// Farmer mode: orders (F-10, F-40 to F-49). One step at a time:
// accept → start preparing → mark packed → ready for rider → handed to rider.
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { getViewer, requireFarmer } from "../lib/auth";
import { notifyConsumer } from "../lib/notify";
import { endWithFullRefund, orderCore, orderRow, transition, type OrderStatus } from "../lib/orders";
import { commissionOn, getRules, HOUR } from "../lib/settings";
import { recordResponseTime } from "../lib/shop";

const TABS = {
  new: ["paid"],
  to_prepare: ["accepted", "preparing", "ready_for_rider"],
  with_rider: ["with_rider", "out_for_delivery", "at_pickup_point", "delivered", "collected"],
  completed: ["completed"],
  cancelled: ["declined", "expired", "cancelled"],
  disputed: ["disputed"],
} satisfies Record<string, OrderStatus[]>;
type Tab = keyof typeof TABS;
const TAB_NAMES = Object.keys(TABS) as Tab[];
const PER_STATUS = 100;

/** The signed-in farmer's farm, or null (queries return empty instead of throwing). */
async function viewerFarm(ctx: QueryCtx) {
  const user = await getViewer(ctx);
  if (user === null || user.isAnonymous) return null;
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
}

async function ordersIn(ctx: QueryCtx, farmId: Id<"farms">, statuses: readonly OrderStatus[], limit = PER_STATUS) {
  const rows: Doc<"orders">[] = [];
  for (const status of statuses) {
    rows.push(
      ...(await ctx.db
        .query("orders")
        .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farmId).eq("status", status))
        .order("desc")
        .take(limit)),
    );
  }
  return rows.sort((a, b) => b._creationTime - a._creationTime);
}

/** The farm's own order, for a step it is taking. */
async function ownOrder(ctx: MutationCtx, orderId: Id<"orders">) {
  const { user, farm } = await requireFarmer(ctx);
  const order = await ctx.db.get("orders", orderId);
  if (order === null || order.farmId !== farm._id) throw new ConvexError({ code: "NOT_FOUND" });
  return { user, farm, order, actor: { kind: "farmer" as const, id: user._id } };
}

/** What the farm earns from an order: product total minus commission. */
async function money(ctx: QueryCtx, order: Doc<"orders">) {
  const entries = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(50);
  const released = entries.find((e) => e.kind === "release");
  const commission = entries.find((e) => e.kind === "commission");
  if (released) {
    return { productKobo: order.itemsTotalKobo, feeKobo: commission?.amountKobo ?? 0, netKobo: released.amountKobo, final: true };
  }
  const rules = await getRules(ctx);
  const feeKobo = commissionOn(order.itemsTotalKobo, rules.commissionBps);
  return { productKobo: order.itemsTotalKobo, feeKobo, netKobo: order.itemsTotalKobo - feeKobo, final: false };
}

/** F-40 tabs. */
export const list = query({
  args: {
    tab: v.union(
      v.literal("new"),
      v.literal("to_prepare"),
      v.literal("with_rider"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("disputed"),
    ),
  },
  handler: async (ctx, args) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return [];
    const orders = await ordersIn(ctx, farm._id, TABS[args.tab]);
    return await Promise.all(
      orders.map(async (o) => ({
        ...(await orderRow(ctx, o)),
        packedAt: o.packedAt ?? null,
        // First name only (F-41)
        consumerFirstName: o.contact.name.split(/\s+/)[0] ?? "",
        area: o.address?.areaName ?? null,
      })),
    );
  },
});

/** Badge counts per tab. */
export const counts = query({
  args: {},
  handler: async (ctx) => {
    const farm = await viewerFarm(ctx);
    const result = Object.fromEntries(TAB_NAMES.map((t) => [t, 0])) as Record<Tab, number>;
    if (farm === null) return result;
    for (const tab of TAB_NAMES) {
      // Ended tabs only need "any?"; active tabs are small.
      result[tab] = (await ordersIn(ctx, farm._id, TABS[tab], PER_STATUS)).length;
    }
    return result;
  },
});

/** F-10 dashboard: what needs doing now, and money held. */
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return null;
    const waiting = await ordersIn(ctx, farm._id, TABS.new, 50);
    const toPrepare = await ordersIn(ctx, farm._id, TABS.to_prepare, 50);
    const withRider = await ordersIn(ctx, farm._id, TABS.with_rider, 50);
    const disputed = await ordersIn(ctx, farm._id, TABS.disputed, 50);
    const rules = await getRules(ctx);
    const net = (o: Doc<"orders">) => o.itemsTotalKobo - commissionOn(o.itemsTotalKobo, rules.commissionBps);
    const held = [...waiting, ...toPrepare, ...withRider, ...disputed].filter((o) => o.escrow === "held");
    return {
      farm: { _id: farm._id, name: farm.name, status: farm.status, holidayMode: farm.holidayMode },
      counts: {
        new: waiting.length,
        to_prepare: toPrepare.length,
        with_rider: withRider.length,
        disputed: disputed.length,
      },
      newOrders: await Promise.all(waiting.slice(0, 5).map((o) => orderRow(ctx, o))),
      toPrepare: await Promise.all(toPrepare.slice(0, 5).map((o) => orderRow(ctx, o))),
      // Expected earnings after commission, still in escrow
      heldKobo: held.reduce((s, o) => s + net(o), 0),
      commissionBps: rules.commissionBps,
    };
  },
});

/** F-41 / F-44 / F-46 / F-47: one order, as the farm sees it. */
export const get = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const farm = await viewerFarm(ctx);
    const id = ctx.db.normalizeId("orders", args.orderId);
    const order = id ? await ctx.db.get("orders", id) : null;
    if (farm === null || order === null || order.farmId !== farm._id) return null;
    // Unpaid orders aren't the farm's business yet.
    if (order.status === "awaiting_payment" || (order.paidAt === undefined && order.status === "cancelled")) return null;
    const core = await orderCore(ctx, order);
    return {
      ...core,
      // F-44: consumer first name and phone; pickup code stays with the consumer
      consumer: { firstName: order.contact.name.split(/\s+/)[0] ?? "", phone: order.contact.phone },
      declineNote: order.declineNote ?? null,
      money: await money(ctx, order),
      next: nextStep(order),
    };
  },
});

/** The one next-step button on F-44. */
function nextStep(order: Doc<"orders">) {
  switch (order.status) {
    case "paid":
      return "accept" as const;
    case "accepted":
      return "start_preparing" as const;
    case "preparing":
      return order.packedAt === undefined ? ("mark_packed" as const) : ("ready_for_rider" as const);
    case "ready_for_rider":
      return "confirm_handover" as const;
    default:
      return null;
  }
}

/** F-49: what to pack. */
export const packingSlip = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const farm = await viewerFarm(ctx);
    const id = ctx.db.normalizeId("orders", args.orderId);
    const order = id ? await ctx.db.get("orders", id) : null;
    if (farm === null || order === null || order.farmId !== farm._id || order.paidAt === undefined) return null;
    const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
    return {
      number: order.number,
      farmName: farm.name,
      placedAt: order._creationTime,
      paidAt: order.paidAt,
      consumerFirstName: order.contact.name.split(/\s+/)[0] ?? "",
      fulfilment: order.fulfilment,
      area: order.address ? `${order.address.areaName}, ${order.address.lga}` : null,
      pickupPointName: point?.name ?? null,
      window: order.window ?? null,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitLabel: i.quantity === 1 ? i.unitSingular : i.unitPlural,
        lineTotalKobo: i.priceKobo * i.quantity,
      })),
      itemsTotalKobo: order.itemsTotalKobo,
    };
  },
});

/** F-41 Accept (within 24 hours). */
export const accept = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { farm, order, actor } = await ownOrder(ctx, args.orderId);
    if (farm.status !== "active") throw new ConvexError({ code: "FARM_SUSPENDED" });
    if (order.status !== "paid") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    if (order.respondBy !== undefined && Date.now() > order.respondBy) throw new ConvexError({ code: "EXPIRED" });
    const acceptedAt = Date.now();
    const accepted = await transition(ctx, order, "accepted", actor, { acceptedAt });
    // "Usually accepts within…" on the shop's farm and product pages
    if (order.paidAt !== undefined) await recordResponseTime(ctx, farm._id, (acceptedAt - order.paidAt) / HOUR);
    if (order.expiryJobId) {
      const job = await ctx.db.system.get("_scheduled_functions", order.expiryJobId);
      if (job !== null && job.state.kind === "pending") await ctx.scheduler.cancel(order.expiryJobId);
    }
    await notifyConsumer(
      ctx,
      accepted,
      "order_accepted",
      `Order ${order.number} accepted`,
      `${farm.name} accepted your order and will start preparing it.`,
    );
  },
});

/** F-42 Decline: the consumer is refunded in full. */
export const decline = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.union(v.literal("out_of_stock"), v.literal("cannot_deliver_in_time"), v.literal("other")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { farm, order, actor } = await ownOrder(ctx, args.orderId);
    if (order.status !== "paid") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    const note = args.note?.trim().slice(0, 500) || undefined;
    if (args.reason === "other" && note === undefined) throw new ConvexError({ code: "NOTE_REQUIRED" });
    // Out of stock: the stock wasn't really there, so don't put it back.
    const ended = await endWithFullRefund(
      ctx,
      order,
      "declined",
      actor,
      { declineReason: args.reason, declineNote: note },
      args.reason,
      args.reason !== "out_of_stock",
    );
    await notifyConsumer(
      ctx,
      ended,
      "order_declined",
      `Order ${order.number} declined`,
      `${farm.name} couldn't take your order. Your money will be refunded in full.`,
    );
  },
});

/** F-43 Start preparing. */
export const startPreparing = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { farm, order, actor } = await ownOrder(ctx, args.orderId);
    const preparing = await transition(ctx, order, "preparing", actor, { preparingAt: Date.now() });
    await notifyConsumer(
      ctx,
      preparing,
      "order_preparing",
      `Order ${order.number} is being prepared`,
      `${farm.name} is preparing your order.`,
    );
  },
});

/** F-44 Mark packed (a step inside preparing). */
export const markPacked = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { order, actor } = await ownOrder(ctx, args.orderId);
    if (order.status !== "preparing") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    if (order.packedAt !== undefined) return;
    await ctx.db.patch("orders", order._id, { packedAt: Date.now() });
    await ctx.db.insert("orderEvents", { orderId: order._id, kind: "packed", actorKind: actor.kind, actorId: actor.id });
    // Push (or SMS) only; the "being prepared" email already went out.
    await notifyConsumer(
      ctx,
      order,
      "order_packed",
      `Order ${order.number} is packed`,
      order.fulfilment === "delivery" ? "It's waiting for a Farmkeke rider." : "It's waiting for a rider to take it to your pickup point.",
    );
  },
});

/** F-44 Ready for rider pickup: staff assign a rider (A-53). */
export const readyForRider = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { order, actor } = await ownOrder(ctx, args.orderId);
    const now = Date.now();
    await transition(ctx, order, "ready_for_rider", actor, { readyAt: now, packedAt: order.packedAt ?? now });
  },
});

/** F-45 Handed to rider. */
export const confirmHandover = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { order, actor } = await ownOrder(ctx, args.orderId);
    const to = order.fulfilment === "delivery" ? "out_for_delivery" : "with_rider";
    const moved = await transition(ctx, order, to, actor, { handedOverAt: Date.now() });
    if (to === "out_for_delivery") {
      const rider = order.riderId ? await ctx.db.get("riders", order.riderId) : null;
      await notifyConsumer(
        ctx,
        moved,
        "out_for_delivery",
        `Order ${order.number} is on its way`,
        rider ? `${rider.name} (${rider.phone}) is bringing your order.` : "A Farmkeke rider is bringing your order.",
      );
    }
  },
});
