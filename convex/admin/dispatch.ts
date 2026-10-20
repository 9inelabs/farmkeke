// A-53 Dispatch board and A-54 Assign rider / update delivery. Staff give
// accepted delivery orders to riders, brief the rider, and set the delivery
// price, which completes the shopper's bill (lib/bill.ts). Once the bill is
// paid the rider collects; staff record each step: collected from the farm,
// delivered, collected by the shopper (pickup at the farm).
import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { checkBill, MAX_DELIVERY_FEE_KOBO } from "../lib/bill";
import { naira, notifyConsumer, notifyFarm } from "../lib/notify";
import { logOrderEvent, pickupDeadline, transition, type OrderStatus } from "../lib/orders";
import { HOUR } from "../lib/settings";

// Riders can be lined up as soon as the farm accepts
const ASSIGNABLE: OrderStatus[] = ["accepted", "preparing", "ready_for_rider"];

/** End of a delivery window in Nigerian time (UTC+1), as a timestamp. */
export function windowEnd(w: Doc<"orders">["window"]): number | null {
  if (!w) return null;
  const [y, m, d] = w.day.split("-").map(Number);
  const [hh, mm] = w.to.split(":").map(Number);
  if (!y || !m || !d || hh === undefined) return null;
  return Date.UTC(y, m - 1, d, hh, mm ?? 0) - HOUR;
}

async function boardRow(ctx: QueryCtx, o: Doc<"orders">, now: number) {
  const farm = await ctx.db.get("farms", o.farmId);
  const rider = o.riderId ? await ctx.db.get("riders", o.riderId) : null;
  const point = o.pickupPointId ? await ctx.db.get("pickupPoints", o.pickupPointId) : null;
  const checkout = await ctx.db.get("checkouts", o.checkoutId);
  const end = windowEnd(o.window);
  let late: string | null = null;
  if (o.status === "ready_for_rider" && o.riderId === undefined) late = "no_rider";
  else if (o.status === "ready_for_collection" && o.collectBy !== undefined && o.collectBy < now) late = "not_collected";
  else if (o.status === "ready_for_rider" && o.riderCollectAt !== undefined && o.riderCollectAt < now) late = "collection_late";
  else if (o.status === "out_for_delivery" && end !== null && end < now) late = "past_window";
  else if (o.status === "with_rider" && o.handedOverAt !== undefined && o.handedOverAt < now - 24 * HOUR) late = "not_at_point";
  else if (o.status === "at_pickup_point" && o.collectBy !== undefined && o.collectBy < now) late = "not_collected";
  return {
    orderId: o._id,
    number: o.number,
    status: o.status,
    fulfilment: o.fulfilment,
    farm: farm === null ? null : { _id: farm._id, name: farm.name, phone: farm.phone, collectionAddress: farm.collectionAddress, lga: farm.lga },
    dropOff:
      o.fulfilment === "delivery"
        ? {
            kind: "address" as const,
            area: o.address?.areaName ?? "",
            lga: o.address?.lga ?? "",
            street: o.address?.street ?? "",
            landmark: o.address?.landmark ?? "",
            // Phase 5 (W-23): the shopper's note for the rider, and the pin
            note: o.address?.note ?? null,
            latitude: o.address?.latitude ?? null,
            longitude: o.address?.longitude ?? null,
          }
        : point !== null
          ? { kind: "pickup_point" as const, name: point.name, address: point.address }
          : { kind: "farm" as const, name: farm?.name ?? "", address: farm?.collectionAddress ?? "" },
    consumer: { name: o.contact.name, phone: o.contact.phone },
    window: o.window ?? null,
    windowEnd: end,
    rider: rider === null ? null : { _id: rider._id, name: rider.name, phone: rider.phone },
    riderCollectAt: o.riderCollectAt ?? null,
    readyAt: o.readyAt ?? null,
    handedOverAt: o.handedOverAt ?? null,
    arrivedAt: o.arrivedAt ?? null,
    collectBy: o.collectBy ?? null,
    deliveredAt: o.deliveredAt ?? null,
    late,
    // Delivery pricing and the shopper's bill
    itemsTotalKobo: o.itemsTotalKobo,
    deliveryFeeKobo: o.deliveryFeeKobo,
    deliveryPricedAt: o.deliveryPricedAt ?? null,
    paid: o.escrow !== "none",
    bill:
      o.fulfilment !== "delivery" || checkout === null
        ? null
        : {
            status: checkout.status,
            billedAt: checkout.billedAt ?? null,
            payBy: checkout.payBy ?? null,
            totalKobo: checkout.totalKobo,
          },
    // A-53: a rider can be assigned; the delivery can be priced
    canPrice: o.fulfilment === "delivery" && checkout?.status === "awaiting_bill" && ASSIGNABLE.includes(o.status),
  };
}

/** A-53: four columns plus the riders who can take work. `now` comes from the client. */
export const board = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, ["dispatch.manage", "orders.view"]);
    const take = async (status: OrderStatus, n: number, order: "asc" | "desc" = "asc") =>
      await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order(order)
        .take(n);
    const rows = (list: Doc<"orders">[]) => Promise.all(list.map((o) => boardRow(ctx, o, args.now)));
    // Accepted delivery orders: each needs a rider and a delivery price before the bill
    const atFarm = [...(await take("accepted", 200)), ...(await take("preparing", 200))];
    const ready = await take("ready_for_rider", 200);
    const needsPrice = [...atFarm, ...ready].filter((o) => o.fulfilment === "delivery" && o.escrow === "none");
    // Lined up early: accepted or preparing orders that already have a rider
    const upcoming = atFarm.filter((o) => o.riderId !== undefined && !needsPrice.includes(o));
    const readyPaid = ready.filter((o) => !needsPrice.includes(o));
    const withRider = [...(await take("out_for_delivery", 200)), ...(await take("with_rider", 200))];
    const atPoint = [...(await take("ready_for_collection", 200)), ...(await take("at_pickup_point", 200))];
    // Most recent deliveries only
    const delivered = [...(await take("delivered", 50, "desc")), ...(await take("collected", 50, "desc"))].sort(
      (a, b) => (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0),
    );
    const riders = await ctx.db
      .query("riders")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(200);
    const busy = new Map<string, number>();
    for (const o of [...needsPrice, ...upcoming, ...readyPaid, ...withRider]) {
      if (o.riderId) busy.set(o.riderId, (busy.get(o.riderId) ?? 0) + 1);
    }
    return {
      // Unpaid: rider to brief, price to set, or the bill out waiting for payment
      awaitingBill: await rows(needsPrice),
      readyForRider: await rows([...readyPaid, ...upcoming]),
      withRider: await rows(withRider),
      atPickupPoint: await rows(atPoint),
      delivered: await rows(delivered.slice(0, 50)),
      riders: riders.map((r) => ({
        _id: r._id,
        name: r.name,
        phone: r.phone,
        serviceAreaIds: r.serviceAreaIds,
        jobs: busy.get(r._id) ?? 0,
        plateNumber: r.plateNumber ?? null,
        bikeModel: r.bikeModel ?? null,
      })),
    };
  },
});

/**
 * Staff set the delivery price once they've briefed the rider. When every
 * farm in the checkout has answered and every accepted order is priced, the
 * shopper's bill goes out (lib/bill.checkBill). The price can be changed
 * until then.
 */
export const setDeliveryPrice = mutation({
  args: { orderId: v.id("orders"), feeKobo: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "dispatch.manage");
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.fulfilment !== "delivery") throw new ConvexError({ code: "NOT_DELIVERY" });
    if (!ASSIGNABLE.includes(order.status)) throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    const checkout = await ctx.db.get("checkouts", order.checkoutId);
    if (checkout === null || checkout.status !== "awaiting_bill") throw new ConvexError({ code: "BILL_ALREADY_SENT" });
    if (order.riderId === undefined) {
      throw new ConvexError({ code: "NO_RIDER", message: "Assign and brief a rider before setting the price." });
    }
    const fee = args.feeKobo;
    if (!Number.isInteger(fee) || fee < 0 || fee > MAX_DELIVERY_FEE_KOBO) throw new ConvexError({ code: "INVALID_AMOUNT" });
    const note = args.note?.trim().slice(0, 300) || undefined;
    const now = Date.now();
    await ctx.db.patch("orders", order._id, {
      deliveryFeeKobo: fee,
      totalKobo: order.itemsTotalKobo + fee,
      deliveryPricedAt: now,
      deliveryPricedBy: staff._id,
    });
    await logOrderEvent(ctx, order._id, "delivery_priced", { kind: "staff", id: staff._id }, note ? `${naira(fee)}: ${note}` : naira(fee));
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "dispatch.set_delivery_price",
      targetTable: "orders",
      targetId: order._id,
      reason: note ?? `Delivery priced at ${naira(fee)}`,
      details: { number: order.number, from: order.deliveryPricedAt === undefined ? null : order.deliveryFeeKobo, to: fee },
    });
    await checkBill(ctx, order.checkoutId);
    const after = await ctx.db.get("checkouts", order.checkoutId);
    return { billSent: after?.status === "awaiting_payment" };
  },
});

/** Sidebar badge: accepted delivery orders that still need a delivery price. */
export const needsPriceCount = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, ["dispatch.manage", "orders.view"]);
    let count = 0;
    for (const status of ASSIGNABLE) {
      const rows = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(200);
      count += rows.filter((o) => o.fulfilment === "delivery" && o.escrow === "none" && o.deliveryPricedAt === undefined).length;
    }
    return count;
  },
});

/** A-54: give an order to a rider, with the time they'll collect it from the farm. */
export const assignRider = mutation({
  args: { collectAt: v.number(), note: v.optional(v.string()), orderId: v.id("orders"), riderId: v.id("riders") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "dispatch.manage");
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (!ASSIGNABLE.includes(order.status)) throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    const rider = await ctx.db.get("riders", args.riderId);
    if (rider === null || !rider.active) throw new ConvexError({ code: "RIDER_UNAVAILABLE" });
    const note = args.note?.trim() || undefined;
    await ctx.db.patch("orders", order._id, { riderId: rider._id, riderCollectAt: args.collectAt });
    await ctx.db.insert("orderEvents", {
      orderId: order._id,
      kind: "rider_assigned",
      actorKind: "staff",
      actorId: staff._id,
      note: note ?? rider.name,
    });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "dispatch.assign_rider",
      targetTable: "orders",
      targetId: order._id,
      reason: note ?? `Rider ${rider.name} assigned`,
      details: { number: order.number, riderId: rider._id, collectAt: args.collectAt },
    });
    await notifyFarm(
      ctx,
      order,
      "rider_assigned",
      `Rider for order ${order.number}`,
      `${rider.name} (${rider.phone}) will collect it. Have it packed and ready.`,
    );
  },
});

const STEP_FROM: Record<string, OrderStatus[]> = {
  collected_from_farm: ["ready_for_rider"],
  dropped_at_pickup_point: ["with_rider"],
  delivered: ["out_for_delivery"],
  collected_by_consumer: ["at_pickup_point", "ready_for_collection"],
};

/** A-54: record a delivery step. Collecting at the pickup point needs the consumer's code. */
export const recordStep = mutation({
  args: {
    note: v.optional(v.string()),
    orderId: v.id("orders"),
    pickupCode: v.optional(v.string()),
    step: v.union(
      v.literal("collected_from_farm"),
      v.literal("dropped_at_pickup_point"),
      v.literal("delivered"),
      v.literal("collected_by_consumer"),
    ),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "dispatch.manage");
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    const actor = { kind: "staff" as const, id: staff._id };
    const note = args.note?.trim() || undefined;
    const now = Date.now();

    // The farm may already have confirmed the handover (F-45): nothing to do.
    if (args.step === "collected_from_farm" && (order.status === "out_for_delivery" || order.status === "with_rider")) {
      return { status: order.status };
    }
    if (!STEP_FROM[args.step]!.includes(order.status)) throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    // The rider only takes a delivery once the shopper has paid the bill
    if (args.step === "collected_from_farm" && order.fulfilment === "delivery" && order.escrow === "none") {
      throw new ConvexError({ code: "NOT_PAID_YET" });
    }
    if (args.step === "collected_by_consumer") {
      const code = (args.pickupCode ?? "").replace(/\D/g, "");
      if (!order.pickupCode || code !== order.pickupCode) throw new ConvexError({ code: "WRONG_PICKUP_CODE" });
    }

    await writeAudit(ctx, {
      actorId: staff._id,
      action: `dispatch.${args.step}`,
      targetTable: "orders",
      targetId: order._id,
      reason: note ?? args.step.replace(/_/g, " "),
      details: { number: order.number },
    });

    let moved: Doc<"orders">;
    switch (args.step) {
      case "collected_from_farm": {
        const to = order.fulfilment === "delivery" ? "out_for_delivery" : "with_rider";
        moved = await transition(ctx, order, to, actor, { handedOverAt: order.handedOverAt ?? now }, note);
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
        break;
      }
      case "dropped_at_pickup_point": {
        const collectBy = await pickupDeadline(ctx, order, now);
        moved = await transition(ctx, order, "at_pickup_point", actor, { arrivedAt: now, collectBy }, note);
        const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
        await notifyConsumer(
          ctx,
          moved,
          "ready_for_pickup",
          `Order ${order.number} is ready for pickup`,
          `Collect it from ${point?.name ?? "the pickup point"} with code ${order.pickupCode ?? ""}.`,
        );
        break;
      }
      case "delivered": {
        moved = await transition(ctx, order, "delivered", actor, { deliveredAt: now }, note);
        await notifyConsumer(
          ctx,
          moved,
          "order_delivered",
          `Order ${order.number} was delivered`,
          "Check everything, then confirm receipt. Something wrong? Report it before you confirm.",
        );
        break;
      }
      case "collected_by_consumer": {
        moved = await transition(ctx, order, "collected", actor, { deliveredAt: now }, note);
        await notifyConsumer(
          ctx,
          moved,
          "order_collected",
          `Order ${order.number} was collected`,
          "Check everything, then confirm receipt. Something wrong? Report it before you confirm.",
        );
        break;
      }
    }
    return { status: moved.status };
  },
});
