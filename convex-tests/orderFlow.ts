// Test helper: drives an order through the current flow.
// Delivery: placed unpaid → the farm accepts → staff assign a rider and set
// the delivery price → the bill goes out → the shopper pays → the rider
// collects and delivers. Pickup: placed and paid → the farm accepts and
// gets it ready at the farm → the farmer hands it over with the shopper's code.
import type { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";

type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
// What every test seed provides
type S = { tomatoes: any; unitId: any; areaId: any; farmerA: U; admin: U };

export const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

// The delivery price staff set in these tests (the old fixed fee)
export const FEE = 100000;

const riders = new WeakMap<T, any>();

/** One approved rider per test deployment, created on first use. */
export async function riderFor(t: T, s: S) {
  const known = riders.get(t);
  if (known) return known;
  const riderId = await as(t, s.admin).mutation(api.admin.riders.create, {
    name: "Emeka Eze",
    phone: "08035550000",
    reason: "New rider",
    serviceAreaIds: [s.areaId],
    vehicleType: "motorbike",
    plateNumber: "OWR-123-AA",
    bikeModel: "Bajaj Boxer",
  });
  riders.set(t, riderId);
  return riderId;
}

export type DeliveryOpts = { quantity?: number; email?: string; phone?: string; note?: string; name?: string };

/** Places a delivery order (unpaid; products only). */
export async function placeDelivery(t: T, s: S, who: U, opts: DeliveryOpts = {}) {
  const quantity = opts.quantity ?? 2;
  return await as(t, who).mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity, priceKobo: 450000 }],
    fulfilment: "delivery",
    expectedTotalKobo: quantity * 450000,
    address: { street: "53b Nob Oluwa", landmark: "Church", serviceAreaId: s.areaId, note: opts.note },
    contact: {
      name: opts.name ?? "Chidi Okeke",
      phone: opts.phone ?? "0803 111 2222",
      email: opts.email ?? "chidi@example.com",
    },
  });
}

/** The farm accepts, staff assign a rider and set the price: the bill goes out. */
export async function billDelivery(t: T, s: S, orderId: any, feeKobo = FEE) {
  const order = await t.run(async (ctx) => (await ctx.db.get(orderId))!);
  if (order.status === "placed") await as(t, s.farmerA).mutation(api.orders.farmer.accept, { orderId });
  const admin = as(t, s.admin);
  const riderId = await riderFor(t, s);
  if (order.riderId === undefined) {
    await admin.mutation(api.admin.dispatch.assignRider, { orderId, riderId, collectAt: Date.now() + 3600_000 });
  }
  return await admin.mutation(api.admin.dispatch.setDeliveryPrice, { orderId, feeKobo });
}

/** Pays a checkout with the test step (the owner, or a pay-link holder with `payToken`). */
export async function payTest(t: T, who: U, checkoutId: any, payToken?: string) {
  await as(t, who).mutation(api.payments.checkout.markPaidTest, { checkoutId, payToken });
}

/**
 * A paid order of `quantity` baskets of tomatoes from farm A. Delivery
 * orders are accepted and priced first (that's how they get a bill);
 * pickup orders are paid straight away and wait for the farm.
 */
export async function paidOrder(t: T, s: S, who: U, fulfilment: "delivery" | "pickup", quantity = 2, email?: string) {
  if (fulfilment === "delivery") {
    const placed = await placeDelivery(t, s, who, { quantity, email });
    for (const o of placed.orders) await billDelivery(t, s, o.orderId);
    await payTest(t, who, placed.checkoutId);
    return placed.orders[0]!.orderId as any;
  }
  const placed = await as(t, who).mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity, priceKobo: 450000 }],
    fulfilment,
    expectedTotalKobo: quantity * 450000,
    contact: { name: "Chidi Okeke", phone: "0803 111 2222", ...(email ? { email } : {}) },
  });
  await payTest(t, who, placed.checkoutId);
  return placed.orders[0]!.orderId as any;
}

/**
 * Takes a paid order to the hand-over: delivery orders are collected by the
 * rider (out for delivery); pickup orders wait at the farm (ready to collect).
 */
export async function handOver(t: T, s: S, orderId: any, opts: { packed?: boolean } = {}) {
  const farmer = as(t, s.farmerA);
  const status = async () => (await t.run(async (ctx) => (await ctx.db.get(orderId))!)).status;
  if ((await status()) === "paid" || (await status()) === "placed") await farmer.mutation(api.orders.farmer.accept, { orderId });
  if ((await status()) === "accepted") await farmer.mutation(api.orders.farmer.startPreparing, { orderId });
  if (opts.packed) await farmer.mutation(api.orders.farmer.markPacked, { orderId });
  if ((await status()) === "preparing") await farmer.mutation(api.orders.farmer.readyForRider, { orderId });
  const order = await t.run(async (ctx) => (await ctx.db.get(orderId))!);
  if (order.fulfilment !== "delivery") return;
  const admin = as(t, s.admin);
  if (order.riderId === undefined) {
    await admin.mutation(api.admin.dispatch.assignRider, { orderId, riderId: await riderFor(t, s), collectAt: Date.now() + 3600_000 });
  }
  await admin.mutation(api.admin.dispatch.recordStep, { orderId, step: "collected_from_farm" });
}

/** All the way: delivered by the rider, or collected at the farm with the code. */
export async function deliver(t: T, s: S, orderId: any, opts: { packed?: boolean } = {}) {
  await handOver(t, s, orderId, opts);
  const order = await t.run(async (ctx) => (await ctx.db.get(orderId))!);
  if (order.fulfilment === "delivery") {
    await as(t, s.admin).mutation(api.admin.dispatch.recordStep, { orderId, step: "delivered" });
  } else {
    await as(t, s.farmerA).mutation(api.orders.farmer.confirmCollection, { orderId, code: order.pickupCode! });
  }
}
