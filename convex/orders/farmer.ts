// Farmer mode: orders (F-10, F-40 to F-49). Since 22 Nov 2026 the farm only
// accepts or declines (owner's decision, APK corrections #11):
//  - delivery: Farmkeke staff send the rider and mark it out for delivery and
//    delivered from Dispatch (the shopper can also say "It's arrived");
//  - pickup at the farm: ready to collect as soon as it's accepted; scanning
//    the shopper's code (confirmCollection) is the farm's one optional step,
//    and the shopper (or staff) can confirm "Collected" instead.
// Orders arrive unpaid (Paystack split, 17 Nov 2026): the farm accepts, then
// the shopper is billed (for delivery, once Farmkeke has priced it). Paystack
// sends the farm its share at payment, so no money waits on a farm click.
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { getViewer, requireFarmer } from "../lib/auth";
import { checkBill } from "../lib/bill";
import { notifyConsumer, notifyStaff } from "../lib/notify";
import {
  endWithFullRefund,
  isActive,
  orderCore,
  orderRow,
  readyAtFarm,
  transition,
  type OrderStatus,
} from "../lib/orders";
import { hitLimit } from "../lib/rateLimit";
import { commissionOn, DAY, getRules, HOUR } from "../lib/settings";
import { recordResponseTime } from "../lib/shop";

// Accepted and not yet closed: with Farmkeke or the shopper now. The old
// "preparing" / "ready" stages only hold orders from before 22 Nov 2026.
const ACCEPTED: OrderStatus[] = [
  "accepted",
  "preparing",
  "ready_for_rider",
  "ready_for_collection",
  "out_for_delivery",
  "with_rider",
  "at_pickup_point",
  "delivered",
  "collected",
];
const TABS = {
  new: ["paid", "placed"],
  accepted: ACCEPTED,
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

/**
 * What the farm earns from an order: product total minus commission, and
 * minus anything taken to pay back a refund (or plus a credit). Paid orders
 * (Paystack split) carry the exact share Paystack sent.
 */
async function money(ctx: QueryCtx, order: Doc<"orders">) {
  if (order.farmShareKobo !== undefined) {
    return {
      productKobo: order.itemsTotalKobo,
      feeKobo: order.commissionKobo ?? 0,
      recoveredKobo: order.recoveredKobo ?? 0,
      netKobo: order.farmShareKobo,
      final: true,
    };
  }
  const entries = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(50);
  const released = entries.find((e) => e.kind === "release");
  const commission = entries.find((e) => e.kind === "commission");
  if (released) {
    return { productKobo: order.itemsTotalKobo, feeKobo: commission?.amountKobo ?? 0, recoveredKobo: 0, netKobo: released.amountKobo, final: true };
  }
  const rules = await getRules(ctx);
  const feeKobo = commissionOn(order.itemsTotalKobo, rules.commissionBps);
  return { productKobo: order.itemsTotalKobo, feeKobo, recoveredKobo: 0, netKobo: order.itemsTotalKobo - feeKobo, final: false };
}

/** F-40 tabs. */
export const list = query({
  args: {
    tab: v.union(
      v.literal("new"),
      v.literal("accepted"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("disputed"),
      // Tabs of app builds from before 22 Nov 2026: both show the accepted orders
      v.literal("to_prepare"),
      v.literal("with_rider"),
    ),
  },
  handler: async (ctx, args) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return [];
    const tab: Tab = args.tab === "to_prepare" || args.tab === "with_rider" ? "accepted" : args.tab;
    const orders = await ordersIn(ctx, farm._id, TABS[tab]);
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

/** F-10 dashboard: what needs doing now, and what Paystack has sent the farm lately. */
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return null;
    const waiting = await ordersIn(ctx, farm._id, TABS.new, 50);
    const accepted = await ordersIn(ctx, farm._id, TABS.accepted, 50);
    const disputed = await ordersIn(ctx, farm._id, TABS.disputed, 50);
    const rules = await getRules(ctx);
    // The farm's shares from the last 30 days (Paystack sends each when the shopper pays)
    const since = Date.now() - 30 * DAY;
    const recent = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id).gte("_creationTime", since))
      .take(1000);
    return {
      farm: { _id: farm._id, name: farm.name, status: farm.status, holidayMode: farm.holidayMode },
      // The farm only answers new orders; the rest is Farmkeke's and the shopper's
      counts: {
        new: waiting.length,
        accepted: accepted.length,
        disputed: disputed.length,
      },
      newOrders: await Promise.all(waiting.slice(0, 5).map((o) => orderRow(ctx, o))),
      paid30dKobo: recent.reduce((s, e) => s + (e.kind === "farm_share" && e.status === "done" ? e.amountKobo : 0), 0),
      // Refunds Farmkeke paid that this farm still owes back
      owedKobo: Math.max(farm.owedKobo ?? 0, 0),
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
    // Orders are the farm's business from the moment they're placed, unpaid:
    // the farm accepts and packs them before the bill. Older pickup checkouts
    // that were never paid (and never reached the farm) stay hidden.
    if (order.status === "awaiting_payment") return null;
    if (order.fulfilment === "pickup" && order.paidAt === undefined && order.status === "cancelled" && order.respondBy === undefined) return null;
    const core = await orderCore(ctx, order);
    return {
      ...core,
      // F-44: consumer first name and phone; pickup code stays with the consumer
      consumer: { firstName: order.contact.name.split(/\s+/)[0] ?? "", phone: order.contact.phone },
      declineNote: order.declineNote ?? null,
      money: await money(ctx, order),
      next: nextStep(order),
      // "Not paid yet": the rider collects, or the shopper collects, once they pay
      paymentPending: order.escrow === "none" && isActive(order),
    };
  },
});

/**
 * What the farm can do on F-44: accept (or decline) a new order; for pickup at
 * the farm, optionally scan the shopper's code once it's paid. Everything
 * else is Farmkeke's: "waiting_for_payment" until the bill is paid, then
 * "rider_collecting" while a delivery waits for the Farmkeke rider.
 */
function nextStep(order: Doc<"orders">) {
  switch (order.status) {
    case "paid":
    case "placed":
      return "accept" as const;
    case "ready_for_collection":
      // Pickup: hand it over only once the bill is paid
      return order.escrow === "none" ? ("waiting_for_payment" as const) : ("confirm_collection" as const);
    case "accepted":
    case "preparing":
    case "ready_for_rider":
      return order.escrow === "none" ? ("waiting_for_payment" as const) : ("rider_collecting" as const);
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
    if (farm === null || order === null || order.farmId !== farm._id) return null;
    // Orders are packed before they're paid (they're paid once the bill comes)
    if (order.paidAt === undefined && !(isActive(order) && order.status !== "placed")) return null;
    const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
    return {
      number: order.number,
      farmName: farm.name,
      placedAt: order._creationTime,
      paidAt: order.paidAt ?? null,
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
    if (order.status !== "paid" && order.status !== "placed") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    if (order.respondBy !== undefined && Date.now() > order.respondBy) throw new ConvexError({ code: "EXPIRED" });
    const acceptedAt = Date.now();
    let accepted = await transition(ctx, order, "accepted", actor, { acceptedAt });
    // Pickup at the farm: ready to collect straight away; there's no "ready" step
    // for the farm. (Older pickup-point orders still go with a Farmkeke rider.)
    if (order.fulfilment === "pickup" && order.pickupPointId === undefined) {
      accepted = await readyAtFarm(ctx, accepted, actor, "Ready to collect once accepted");
    }
    // "Usually accepts within…" on the shop's farm and product pages
    await recordResponseTime(ctx, farm._id, (acceptedAt - (order.paidAt ?? order._creationTime)) / HOUR);
    if (order.expiryJobId) {
      const job = await ctx.db.system.get("_scheduled_functions", order.expiryJobId);
      if (job !== null && job.state.kind === "pending") await ctx.scheduler.cancel(order.expiryJobId);
    }
    await notifyConsumer(
      ctx,
      accepted,
      "order_accepted",
      `Order ${order.number} accepted`,
      order.status === "placed"
        ? order.fulfilment === "delivery"
          ? `${farm.name} accepted your order. We're arranging a rider and will send your bill, delivery included.`
          : `${farm.name} accepted your order. We'll send your bill to pay, then you can collect it from the farm with your code.`
        : order.fulfilment === "delivery"
          ? `${farm.name} accepted your order. A Farmkeke rider will bring it.`
          : `${farm.name} accepted your order.`,
    );
    // Dispatch: brief a rider and price the delivery, so the shopper gets their bill
    if (order.status === "placed" && order.fulfilment === "delivery") {
      await notifyStaff(
        ctx,
        {
          kind: "delivery_to_price",
          title: `Price the delivery for ${order.number}`,
          body: `${farm.name} accepted it. Assign and brief a rider, then set the delivery price.`,
          href: `/admin/orders/${order._id}`,
          orderId: order._id,
        },
        "dispatch.manage",
      );
    }
    await checkBill(ctx, order.checkoutId);
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
    if (order.status !== "paid" && order.status !== "placed") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
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
      order.status === "placed"
        ? `${farm.name} couldn't take your order. You haven't been charged for it.`
        : `${farm.name} couldn't take your order. Farmkeke is refunding you in full.`,
    );
    await checkBill(ctx, order.checkoutId);
  },
});

/** Pickup at the farm: the farmer enters the shopper's 4-digit code to hand the order over. */
export const confirmCollection = mutation({
  args: { orderId: v.id("orders"), code: v.string() },
  handler: async (ctx, args) => {
    const { order, actor } = await ownOrder(ctx, args.orderId);
    if (order.status !== "ready_for_collection") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    // The shopper collects only once they've paid the bill
    if (order.escrow === "none") throw new ConvexError({ code: "NOT_PAID_YET" });
    // Four digits are guessable: a few tries per order each hour
    await hitLimit(ctx, `collect:${order._id}`, 5, HOUR);
    const code = args.code.replace(/\D/g, "");
    if (!order.pickupCode || code !== order.pickupCode) throw new ConvexError({ code: "WRONG_PICKUP_CODE" });
    const collected = await transition(ctx, order, "collected", actor, { deliveredAt: Date.now() });
    await notifyConsumer(
      ctx,
      collected,
      "order_collected",
      `Order ${order.number} was collected`,
      "Check everything. Something wrong? Report it from your order page within 24 hours.",
    );
  },
});
