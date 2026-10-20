// The order state machine, timeline, escrow ledger, refunds and release.
// Every status change goes through `transition`, which writes an orderEvents
// row with its actor. Every money movement writes a ledgerEntries row.
import { ConvexError, type Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { actorKind, orderStatus } from "../schema";
import { nextCounter } from "./counters";
import { claimSlot, naira, notify, notifyConsumer, notifyFarm } from "./notify";
import { paymentsLive } from "./paystack";
import { noteStockChange } from "./restock";
import { commissionOn, DAY, getRules, HOUR } from "./settings";

export type OrderStatus = Infer<typeof orderStatus>;
export type Actor = { kind: Infer<typeof actorKind>; id?: Id<"users"> };
export const SYSTEM: Actor = { kind: "system" };

/** Allowed moves. Anything else is a WRONG_STATUS error. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  // Delivery: unpaid until the bill (lib/bill.ts); the farm answers first
  placed: ["accepted", "declined", "expired", "cancelled"],
  paid: ["accepted", "declined", "expired", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_rider", "ready_for_collection", "cancelled"],
  ready_for_rider: ["out_for_delivery", "with_rider", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  // Pickup through a Farmkeke pickup point (orders from before pickup moved to the farm)
  with_rider: ["at_pickup_point", "cancelled"],
  at_pickup_point: ["collected", "cancelled"],
  // Pickup at the farm: the shopper collects with their code
  ready_for_collection: ["collected", "cancelled"],
  delivered: ["completed", "disputed"],
  collected: ["completed", "disputed"],
  // Resolved by staff (Phase 3b): released or split → completed, refunded → cancelled
  disputed: ["completed", "cancelled"],
  completed: [],
  declined: [],
  expired: [],
  cancelled: [],
};

export const ENDED: OrderStatus[] = ["completed", "declined", "expired", "cancelled"];

export const canMove = (from: OrderStatus, to: OrderStatus) => NEXT[from].includes(to);

export async function logOrderEvent(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  kind: string,
  actor: Actor,
  note?: string,
) {
  await ctx.db.insert("orderEvents", { orderId, kind, actorKind: actor.kind, actorId: actor.id, note });
}

/** Moves an order to `to`, recording the event. Returns the updated order. */
export async function transition(
  ctx: MutationCtx,
  order: Doc<"orders">,
  to: OrderStatus,
  actor: Actor,
  patch: Partial<Omit<Doc<"orders">, "_id" | "_creationTime" | "status">> = {},
  note?: string,
): Promise<Doc<"orders">> {
  if (!canMove(order.status, to)) {
    throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
  }
  await ctx.db.patch("orders", order._id, { ...patch, status: to });
  await logOrderEvent(ctx, order._id, to, actor, note);
  return { ...order, ...patch, status: to };
}

export async function ledger(
  ctx: MutationCtx,
  order: Doc<"orders">,
  entry: Pick<Doc<"ledgerEntries">, "kind" | "amountKobo" | "status"> &
    Partial<Pick<Doc<"ledgerEntries">, "note" | "refundId" | "payoutId" | "simulated" | "actorId">>,
) {
  return await ctx.db.insert("ledgerEntries", {
    orderId: order._id,
    checkoutId: order.checkoutId,
    farmId: order.farmId,
    ...entry,
  });
}

export const orderNumber = async (ctx: MutationCtx) => `FK-${await nextCounter(ctx, "order", 10001)}`;
export const checkoutReference = async (ctx: MutationCtx) => `CK-${await nextCounter(ctx, "checkout", 10001)}`;

/** Four digits the shopper shows at the farm; the farmer enters them to hand over the order. */
export const newPickupCode = () => String(Math.floor(1000 + Math.random() * 9000));

// ---------------------------------------------------------------------------
// Stock

/** Takes stock for every line; throws OUT_OF_STOCK if any unit is short. */
export async function takeStock(ctx: MutationCtx, items: Doc<"orders">["items"]) {
  for (const item of items) {
    const listing = await ctx.db.get("listings", item.listingId);
    const unit = listing?.units.find((u) => u.unitId === item.unitId);
    if (listing === null || unit === undefined || unit.stock < item.quantity) {
      throw new ConvexError({ code: "OUT_OF_STOCK", listingId: item.listingId });
    }
    const units = listing.units.map((u) => (u.unitId === item.unitId ? { ...u, stock: u.stock - item.quantity } : u));
    await ctx.db.patch("listings", listing._id, { units });
    await noteStockChange(ctx, listing, listing, { ...listing, units });
  }
}

/** Puts an order's stock back (unpaid, expired, declined other than out of stock). */
export async function restoreStock(ctx: MutationCtx, order: Doc<"orders">) {
  for (const item of order.items) {
    const listing = await ctx.db.get("listings", item.listingId);
    if (listing === null || listing.deletedAt !== undefined) continue;
    if (!listing.units.some((u) => u.unitId === item.unitId)) continue;
    const units = listing.units.map((u) => (u.unitId === item.unitId ? { ...u, stock: u.stock + item.quantity } : u));
    await ctx.db.patch("listings", listing._id, { units });
    // W-47: an unpaid or cancelled order can bring a sold-out item back
    await noteStockChange(ctx, listing, listing, { ...listing, units });
  }
}

// A unit is "running low" at this many or fewer (or below its minimum order).
export const LOW_STOCK_AT = 3;

/**
 * F-28 "Running low": after a paid order, tells the farm about each ordered
 * unit now low or sold out. At most once a day per listing unit.
 */
async function alertLowStock(ctx: MutationCtx, order: Doc<"orders">) {
  const farm = await ctx.db.get("farms", order.farmId);
  if (farm === null) return;
  for (const item of order.items) {
    const listing = await ctx.db.get("listings", item.listingId);
    if (listing === null || listing.deletedAt !== undefined) continue;
    const unit = listing.units.find((u) => u.unitId === item.unitId);
    if (unit === undefined || unit.stock > Math.max(LOW_STOCK_AT, unit.minOrder - 1)) continue;
    if (!(await claimSlot(ctx, `low_stock:${listing._id}:${unit.unitId}`, DAY))) continue;
    await notify(ctx, {
      userId: farm.userId,
      side: "farm",
      kind: "low_stock",
      title: unit.stock <= 0 ? `${listing.name} is sold out` : `${listing.name} is running low`,
      body: unit.stock <= 0 ? "Add stock so shoppers can order it again." : `${unit.stock} left. Add stock so shoppers can keep ordering.`,
      href: `/listing/${listing._id}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Payment success

/**
 * Marks a checkout paid and moves its money into escrow. Pickup orders then
 * wait for their farm (24h, scheduled expiry). Delivery orders were accepted
 * before the bill, so their farms just hear it's paid and the rider can
 * collect. Returns false if already handled.
 */
export async function markCheckoutPaid(
  ctx: MutationCtx,
  checkoutId: Id<"checkouts">,
  payment: { provider: "paystack" | "simulated"; reference: string; paidAt: number },
): Promise<boolean> {
  const checkout = await ctx.db.get("checkouts", checkoutId);
  if (checkout === null || checkout.status !== "awaiting_payment") return false;
  const now = Date.now();
  await ctx.db.patch("checkouts", checkoutId, {
    status: "paid",
    paidAt: payment.paidAt,
    paymentProvider: payment.provider,
    paymentReference: payment.reference,
  });
  const rules = await getRules(ctx);
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkoutId))
    .take(50);
  for (const order of orders) {
    if (order.fulfilment === "delivery" && order.status !== "awaiting_payment") {
      // A bill: accepted, packed or ready, priced, and now paid
      if (ENDED.includes(order.status) || order.escrow !== "none") continue;
      await ctx.db.patch("orders", order._id, { escrow: "held", paidAt: payment.paidAt });
      const paid = { ...order, escrow: "held" as const, paidAt: payment.paidAt };
      await logOrderEvent(ctx, order._id, "paid", SYSTEM);
      await ledger(ctx, paid, {
        kind: "hold",
        amountKobo: order.totalKobo,
        status: "done",
        simulated: payment.provider === "simulated" ? true : undefined,
      });
      await notifyFarm(
        ctx,
        paid,
        "order_paid",
        `Order ${order.number} is paid`,
        "The shopper has paid. Hand it to the Farmkeke rider when they arrive.",
      );
      await notifyConsumer(
        ctx,
        paid,
        "order_placed",
        `Order ${order.number} is paid`,
        "Thank you. Your money is held safely until you confirm you received it.",
      );
      continue;
    }
    if (order.status !== "awaiting_payment") continue;
    const respondBy = now + rules.farmerResponseHours * HOUR;
    const expiryJobId = await ctx.scheduler.runAt(respondBy, internal.orders.system.expireOne, {
      orderId: order._id,
    });
    const paid = await transition(ctx, order, "paid", SYSTEM, {
      escrow: "held",
      paidAt: payment.paidAt,
      respondBy,
      expiryJobId,
    });
    await ledger(ctx, paid, {
      kind: "hold",
      amountKobo: order.totalKobo,
      status: "done",
      simulated: payment.provider === "simulated" ? true : undefined,
    });
    await notifyFarm(
      ctx,
      paid,
      "order_new",
      "New order",
      `Order ${order.number} is paid and waiting. Accept or decline within ${rules.farmerResponseHours} hours.`,
    );
    await alertLowStock(ctx, paid);
    await notifyConsumer(
      ctx,
      paid,
      "order_placed",
      `Order ${order.number} placed`,
      "Your money is held safely until you confirm you received it.",
    );
  }
  return true;
}

// ---------------------------------------------------------------------------
// Refunds

/**
 * Queues a refund to the original payment method and sends it. Full refunds
 * include the delivery fee; part refunds never do (PRD).
 */
export async function refundOrder(
  ctx: MutationCtx,
  order: Doc<"orders">,
  opts: {
    kind: "full" | "part";
    reason: string;
    actor: Actor;
    // Part refunds only: product amount to refund
    amountKobo?: number;
    disputeId?: Id<"disputes">;
  },
): Promise<Id<"refunds"> | null> {
  const checkout = await ctx.db.get("checkouts", order.checkoutId);
  if (checkout === null) return null;
  const amountKobo = opts.kind === "full" ? order.totalKobo : Math.min(opts.amountKobo ?? 0, order.itemsTotalKobo);
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) throw new ConvexError({ code: "INVALID_AMOUNT" });
  const provider = checkout.paymentProvider === "paystack" ? "paystack" : "simulated";
  const refundId = await ctx.db.insert("refunds", {
    orderId: order._id,
    checkoutId: order.checkoutId,
    userId: order.userId,
    farmId: order.farmId,
    amountKobo,
    kind: opts.kind,
    reason: opts.reason,
    status: "queued",
    provider,
    transactionReference: checkout.paymentReference ?? checkout.reference,
    attempts: 0,
    disputeId: opts.disputeId,
    actorId: opts.actor.id,
  });
  await ledger(ctx, order, {
    kind: "refund",
    amountKobo,
    status: "pending",
    note: opts.reason,
    refundId,
    simulated: provider === "simulated" ? true : undefined,
    actorId: opts.actor.id,
  });
  await ctx.scheduler.runAfter(0, internal.payments.refunds.send, { refundId });
  return refundId;
}

/** Ends an order before it was fulfilled and refunds it in full. */
export async function endWithFullRefund(
  ctx: MutationCtx,
  order: Doc<"orders">,
  to: "declined" | "expired" | "cancelled",
  actor: Actor,
  patch: Partial<Omit<Doc<"orders">, "_id" | "_creationTime" | "status">>,
  reason: string,
  putStockBack: boolean,
) {
  const wasHeld = order.escrow === "held";
  const ended = await transition(
    ctx,
    order,
    to,
    actor,
    { ...patch, endedAt: Date.now(), escrow: wasHeld ? "refunded" : order.escrow },
    reason,
  );
  if (order.expiryJobId) await cancelJob(ctx, order.expiryJobId);
  if (putStockBack) await restoreStock(ctx, order);
  if (wasHeld) await refundOrder(ctx, ended, { kind: "full", reason: to, actor });
  return ended;
}

async function cancelJob(ctx: MutationCtx, jobId: Id<"_scheduled_functions">) {
  const job = await ctx.db.system.get("_scheduled_functions", jobId);
  if (job !== null && job.state.kind === "pending") await ctx.scheduler.cancel(jobId);
}

// ---------------------------------------------------------------------------
// Release

/**
 * Releases an order's money to the farm: product total (or the part staff
 * release in a split) minus Farmkeke's commission, paid out automatically
 * by Paystack Transfer. The delivery fee stays with Farmkeke for the rider.
 */
export async function releaseOrder(
  ctx: MutationCtx,
  order: Doc<"orders">,
  actor: Actor,
  opts: { releaseItemsKobo?: number; split?: boolean; note?: string } = {},
) {
  if (order.escrow !== "held") throw new ConvexError({ code: "NOT_HELD", escrow: order.escrow });
  if (order.escrowHold) throw new ConvexError({ code: "ESCROW_ON_HOLD" });
  const farm = await ctx.db.get("farms", order.farmId);
  const checkout = await ctx.db.get("checkouts", order.checkoutId);
  if (farm === null || checkout === null) throw new ConvexError({ code: "NOT_FOUND" });
  const rules = await getRules(ctx);
  const itemsKobo = Math.min(opts.releaseItemsKobo ?? order.itemsTotalKobo, order.itemsTotalKobo);
  const commissionKobo = commissionOn(itemsKobo, rules.commissionBps);
  const farmKobo = itemsKobo - commissionKobo;
  const simulated = checkout.paymentProvider !== "paystack" || !paymentsLive();
  const sim = simulated ? true : undefined;
  const now = Date.now();

  await ledger(ctx, order, { kind: "release", amountKobo: farmKobo, status: "done", note: opts.note, simulated: sim, actorId: actor.id });
  if (commissionKobo > 0) {
    await ledger(ctx, order, {
      kind: "commission",
      amountKobo: commissionKobo,
      status: "done",
      note: `${rules.commissionBps / 100}%`,
      simulated: sim,
    });
  }
  if (order.deliveryFeeKobo > 0) {
    await ledger(ctx, order, { kind: "delivery_fee", amountKobo: order.deliveryFeeKobo, status: "done", simulated: sim });
  }
  await ctx.db.patch("orders", order._id, { escrow: opts.split ? "split" : "released", releasedAt: now });
  await logOrderEvent(ctx, order._id, "released", actor, opts.note);

  if (farmKobo > 0) {
    const payoutId = await ctx.db.insert("payouts", {
      farmId: farm._id,
      amountKobo: farmKobo,
      status: "pending",
      reference: `PO-${order.number}-1`,
      provider: simulated ? "simulated" : "paystack",
      bankName: farm.bankName,
      accountLast4: farm.accountNumber.slice(-4),
      attempts: 0,
    });
    await ctx.db.insert("payoutItems", {
      payoutId,
      orderId: order._id,
      farmId: farm._id,
      itemsTotalKobo: itemsKobo,
      commissionKobo,
      amountKobo: farmKobo,
    });
    await ledger(ctx, order, { kind: "payout", amountKobo: farmKobo, status: "pending", payoutId, simulated: sim });
    await ctx.scheduler.runAfter(0, internal.payments.payouts.send, { payoutId });
  }
  await notifyFarm(
    ctx,
    order,
    "payment_released",
    "Payment released",
    `${naira(farmKobo)} for order ${order.number} is on its way to your bank.`,
  );
  // The shopper confirmed: thank them and ask for a review (W-52b / M-66).
  if (order.confirmedAt !== undefined && !opts.split) {
    await notifyConsumer(
      ctx,
      order,
      "order_completed",
      `Thanks for confirming order ${order.number}`,
      `Payment released to ${farm.name}. How was your order? Leave a review.`,
    );
  }
}

/** Starts the pickup clock when an order is ready at the farm (or, before the change, at a pickup point). */
export async function pickupDeadline(ctx: MutationCtx, order: Doc<"orders">, now: number) {
  const rules = await getRules(ctx);
  const point = order.pickupPointId ? await ctx.db.get("pickupPoints", order.pickupPointId) : null;
  const days = Math.max(rules.pickupHoldDays, point?.collectWithinDays ?? 0);
  const collectBy = now + days * DAY;
  await ctx.scheduler.runAt(collectBy, internal.orders.system.pickupWindowEnded, { orderId: order._id });
  // A reminder a day before the window ends (only when the hold is longer than a day)
  if (collectBy - DAY > now) {
    await ctx.scheduler.runAt(collectBy - DAY, internal.orders.system.pickupReminder, { orderId: order._id });
  }
  return collectBy;
}

// ---------------------------------------------------------------------------
// Views

/** An order id from a URL; null when it isn't one. */
export const orderIdFrom = (ctx: QueryCtx, id: string) => ctx.db.normalizeId("orders", id);

export const isActive = (order: Doc<"orders">) => !ENDED.includes(order.status);

export async function itemsView(ctx: QueryCtx, order: Doc<"orders">) {
  return await Promise.all(
    order.items.map(async (item, index) => ({
      index,
      listingId: item.listingId,
      unitId: item.unitId,
      name: item.name,
      quantity: item.quantity,
      priceKobo: item.priceKobo,
      unitSingular: item.unitSingular,
      unitPlural: item.unitPlural,
      unitLabel: item.quantity === 1 ? item.unitSingular : item.unitPlural,
      lineTotalKobo: item.priceKobo * item.quantity,
      imageUrl: item.photoId ? await ctx.storage.getUrl(item.photoId) : null,
    })),
  );
}

export async function pickupPointView(ctx: QueryCtx, pointId: Id<"pickupPoints"> | undefined) {
  if (pointId === undefined) return null;
  const p = await ctx.db.get("pickupPoints", pointId);
  if (p === null) return null;
  const rules = await getRules(ctx);
  return {
    _id: p._id,
    name: p.name,
    address: p.address,
    state: p.state,
    lga: p.lga,
    latitude: p.latitude,
    longitude: p.longitude,
    hours: p.hours,
    phone: p.phone,
    collectWithinDays: Math.max(rules.pickupHoldDays, p.collectWithinDays),
    photoUrl: p.photoStorageId ? await ctx.storage.getUrl(p.photoStorageId) : null,
  };
}

/** Pickup at the farm: where and when to collect (the farm's collection details). */
export async function collectFromView(ctx: QueryCtx, order: Doc<"orders">) {
  if (order.fulfilment !== "pickup" || order.pickupPointId !== undefined) return null;
  const farm = await ctx.db.get("farms", order.farmId);
  if (farm === null) return null;
  const rules = await getRules(ctx);
  return {
    farmName: farm.name,
    address: farm.collectionAddress,
    lga: farm.lga,
    state: farm.state,
    hours: farm.collectionHours,
    phone: farm.phone,
    collectWithinDays: rules.pickupHoldDays,
  };
}

export async function eventsView(ctx: QueryCtx, orderId: Id<"orders">) {
  const events = await ctx.db
    .query("orderEvents")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(100);
  return events.map((e) => ({ kind: e.kind, status: e.kind, at: e._creationTime, actorKind: e.actorKind, note: e.note ?? null }));
}

/** The fields every order view shares (W-51 / M-63 / F-44). */
export async function orderCore(ctx: QueryCtx, order: Doc<"orders">) {
  const farm = await ctx.db.get("farms", order.farmId);
  const rider = order.riderId ? await ctx.db.get("riders", order.riderId) : null;
  const refund = await ctx.db
    .query("refunds")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .first();
  return {
    _id: order._id,
    number: order.number,
    status: order.status,
    escrow: order.escrow,
    escrowHold: order.escrowHold === true,
    fulfilment: order.fulfilment,
    farm: farm === null ? null : { _id: farm._id, name: farm.name, area: farm.lga },
    farmName: farm?.name ?? "Farm",
    farmId: order.farmId,
    items: await itemsView(ctx, order),
    itemsTotalKobo: order.itemsTotalKobo,
    deliveryFeeKobo: order.deliveryFeeKobo,
    totalKobo: order.totalKobo,
    placedAt: order._creationTime,
    paidAt: order.paidAt ?? null,
    respondBy: order.respondBy ?? null,
    acceptedAt: order.acceptedAt ?? null,
    preparingAt: order.preparingAt ?? null,
    packedAt: order.packedAt ?? null,
    readyAt: order.readyAt ?? null,
    outForDeliveryAt: order.handedOverAt ?? null,
    arrivedAt: order.arrivedAt ?? null,
    collectBy: order.collectBy ?? null,
    deliveredAt: order.deliveredAt ?? null,
    confirmedAt: order.confirmedAt ?? null,
    releasedAt: order.releasedAt ?? null,
    endedAt: order.endedAt ?? null,
    declineReason: order.declineReason ?? null,
    cancelReason: order.cancelReason ?? null,
    window: order.window ?? null,
    address: order.address
      ? {
          street: order.address.street,
          landmark: order.address.landmark,
          areaName: order.address.areaName,
          lga: order.address.lga,
          state: order.address.state,
          // Phase 5 (W-23): the shopper's note for the rider
          note: order.address.note ?? null,
        }
      : null,
    pickupPoint: await pickupPointView(ctx, order.pickupPointId),
    collectFrom: await collectFromView(ctx, order),
    // Delivery: staff price the delivery after the farm accepts; the shopper pays after
    deliveryPricedAt: order.deliveryPricedAt ?? null,
    paid: order.escrow !== "none",
    rider:
      rider === null || !["out_for_delivery", "with_rider", "ready_for_rider"].includes(order.status)
        ? null
        : { name: rider.name, phone: rider.phone },
    riderCollectAt: order.riderCollectAt ?? null,
    disputeId: order.disputeId ?? null,
    hasRefund: refund !== null,
    reviewed: order.reviewedAt !== undefined,
    isActive: isActive(order),
    events: await eventsView(ctx, order._id),
  };
}

/** Short row for lists. */
export async function orderRow(ctx: QueryCtx, order: Doc<"orders">) {
  const farm = await ctx.db.get("farms", order.farmId);
  const first = order.items[0];
  return {
    _id: order._id,
    number: order.number,
    status: order.status,
    escrow: order.escrow,
    fulfilment: order.fulfilment,
    farmId: order.farmId,
    farmName: farm?.name ?? "Farm",
    placedAt: order._creationTime,
    paidAt: order.paidAt ?? null,
    respondBy: order.respondBy ?? null,
    deliveredAt: order.deliveredAt ?? null,
    itemCount: order.items.length,
    summary: first ? `${first.quantity} × ${first.name}${order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}` : "",
    imageUrl: first?.photoId ? await ctx.storage.getUrl(first.photoId) : null,
    itemsTotalKobo: order.itemsTotalKobo,
    deliveryFeeKobo: order.deliveryFeeKobo,
    totalKobo: order.totalKobo,
    window: order.window ?? null,
    isActive: isActive(order),
    checkoutId: order.checkoutId,
    deliveryPricedAt: order.deliveryPricedAt ?? null,
    paid: order.escrow !== "none",
  };
}
