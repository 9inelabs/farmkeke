// Phase 6 "done when": a guest orders from two farms, farms act, the consumer
// confirms, and the ledger shows the money released. Plus expiry, auth checks,
// admin release queue and guest claim. Runs against the repo's convex/ code.
// Delivery orders are placed unpaid and paid by bill once staff have priced
// the delivery; pickup orders are paid up front and collected at the farm.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { billDelivery, payTest, placeDelivery } from "./orderFlow";
import { grantStaff } from "./staff";

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.PAYSTACK_SECRET_KEY;
});
afterEach(() => vi.useRealTimers());

const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const user = async (fields: Record<string, unknown>) => {
      const id = await ctx.db.insert("users", fields as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      if (typeof fields.staffRole === "string") await grantStaff(ctx, { id, sessionId }, fields.staffRole);
      return { id, sessionId };
    };
    const guest = await user({ isAnonymous: true });
    const account = await user({ name: "Ada Obi", email: "ada@example.com" });
    const farmerA = await user({ name: "Farmer A", email: "a@example.com", phone: "+2348030000001" });
    const farmerB = await user({ name: "Farmer B", email: "b@example.com", phone: "+2348030000002" });
    const staff = await user({ name: "Fin", email: "fin@example.com", staffRole: "finance" });
    const admin = await user({ name: "Sam Admin", email: "sam@example.com", staffRole: "super_admin" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, active: true, sortOrder: 1 });
    const pointId = await ctx.db.insert("pickupPoints", { name: "Point", address: "Douglas Rd", state: "Imo", lga: "Owerri Municipal", latitude: 5.48, longitude: 7.03, hours, phone: "+2348035550144", collectWithinDays: 2, active: true });
    const appId = await ctx.db.insert("farmerApplications", { userId: farmerA.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] });
    const farm = async (userId: any, name: string) =>
      await ctx.db.insert("farms", {
        userId, applicationId: appId, name, phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
        farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
        openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
        accountName: name, status: "active", trusted: true,
      });
    const farmA = await farm(farmerA.id, "Ada Greens");
    const farmB = await farm(farmerB.id, "Okafor Farms");
    const listing = async (farmId: any, name: string, priceKobo: number) =>
      await ctx.db.insert("listings", { farmId, status: "live", name, photoIds: [], units: [{ unitId, priceKobo, stock: 10, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    const tomatoes = await listing(farmA, "Tomatoes", 450000);
    const yams = await listing(farmB, "Yams", 300000);
    return { guest, account, farmerA, farmerB, staff, admin, unitId, areaId, pointId, farmA, farmB, tomatoes, yams };
  });
}

const as = (t: ReturnType<typeof convexTest>, u: { id: string; sessionId: string }) =>
  t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

const HOUR = 3_600_000;

test("guest delivery from two farms: one farm expires, the bill covers the other, paid by link, delivered and paid out", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const admin = as(t, s.admin);
  const items = [
    { listingId: s.tomatoes, unitId: s.unitId, quantity: 2, priceKobo: 450000 },
    { listingId: s.yams, unitId: s.unitId, quantity: 1, priceKobo: 300000 },
  ];

  const config = await t.query(api.payments.config.get, {});
  expect(config).toEqual({ live: false, testStep: true });

  // The quote is products only: delivery is priced later
  const quote = await guest.query(api.checkout.quote, { items, fulfilment: "delivery", serviceAreaId: s.areaId });
  expect(quote.changes).toEqual([]);
  expect(quote.farms).toHaveLength(2);
  expect(quote).toMatchObject({ totalKobo: 900000 + 300000, deliveryFeeKobo: 0, deliveryFeeLater: true });

  const stale = await guest.query(api.checkout.quote, { items: [{ ...items[0], priceKobo: 1 }] });
  expect(stale.changes[0]).toMatchObject({ kind: "price", priceKobo: 450000 });

  const address = { street: "53b Nob Oluwa", landmark: "Opposite the church", serviceAreaId: s.areaId, note: "Call at the gate" };
  // The bill goes by email, so a guest must give one (until SMS sends)
  await expect(
    guest.mutation(api.checkout.place, {
      items, fulfilment: "delivery", expectedTotalKobo: quote.totalKobo, address, contact: { name: "Guest Shopper", phone: "0803 111 2222" },
    }),
  ).rejects.toThrow(/EMAIL_REQUIRED/);
  const placed = await guest.mutation(api.checkout.place, {
    items, fulfilment: "delivery", expectedTotalKobo: quote.totalKobo, address,
    contact: { name: "Guest Shopper", phone: "0803 111 2222", email: "guest@example.com" },
  });
  expect(placed).toMatchObject({ payNow: false, totalKobo: 1200000 });
  expect(placed.orders.map((o: any) => o.number)).toEqual(["FK-10001", "FK-10002"]);
  const [orderA, orderB] = placed.orders.map((o: any) => o.orderId);

  // Stock is held at placement; nothing to pay yet
  expect(await t.run(async (ctx) => (await ctx.db.get(s.tomatoes))!.units[0].stock)).toBe(8);
  expect(await t.run(async (ctx) => (await ctx.db.get(placed.checkoutId))!.status)).toBe("awaiting_bill");
  await expect(payTest(t, s.guest, placed.checkoutId)).rejects.toThrow(/BILL_NOT_READY/);
  const placedA = await guest.query(api.orders.consumer.get, { orderId: orderA });
  expect(placedA).toMatchObject({ status: "placed", escrow: "none", paid: false, canConfirm: false });
  expect(placedA!.respondBy).toBeGreaterThan(Date.now());

  // Farms see unpaid delivery orders straight away, and say so
  const farmerA = as(t, s.farmerA);
  expect(await farmerA.query(api.orders.farmer.counts, {})).toMatchObject({ new: 1 });
  expect(await farmerA.query(api.orders.farmer.get, { orderId: orderA })).toMatchObject({ next: "accept", paymentPending: true });
  // Wrong farmer can't act on someone else's order
  await expect(as(t, s.farmerB).mutation(api.orders.farmer.accept, { orderId: orderA })).rejects.toThrow();
  await farmerA.mutation(api.orders.farmer.accept, { orderId: orderA });
  await farmerA.mutation(api.orders.farmer.startPreparing, { orderId: orderA });
  await farmerA.mutation(api.orders.farmer.markPacked, { orderId: orderA });
  await farmerA.mutation(api.orders.farmer.readyForRider, { orderId: orderA });
  // Packed, but the rider only collects once the shopper has paid
  expect(await farmerA.query(api.orders.farmer.get, { orderId: orderA })).toMatchObject({ next: "waiting_for_payment" });
  await expect(farmerA.mutation(api.orders.farmer.confirmHandover, { orderId: orderA })).rejects.toThrow(/NOT_PAID_YET/);

  // Staff brief a rider first, then set the price
  await expect(admin.mutation(api.admin.dispatch.setDeliveryPrice, { orderId: orderA, feeKobo: 150000 })).rejects.toThrow(/NO_RIDER/);
  const board = await admin.query(api.admin.dispatch.board, { now: Date.now() });
  expect(board.awaitingBill.map((r: any) => [r.number, r.canPrice])).toEqual([["FK-10001", true]]);
  expect(await admin.query(api.admin.dispatch.needsPriceCount, {})).toBe(1);
  const riderId = await admin.mutation(api.admin.riders.create, {
    name: "Emeka", phone: "08035550000", reason: "New rider", serviceAreaIds: [s.areaId], vehicleType: "motorbike", plateNumber: "owr-1", bikeModel: "Bajaj Boxer",
  });
  await admin.mutation(api.admin.dispatch.assignRider, { orderId: orderA, riderId, collectAt: Date.now() + HOUR });
  // Farm B hasn't answered, so the bill waits
  expect(await admin.mutation(api.admin.dispatch.setDeliveryPrice, { orderId: orderA, feeKobo: 150000, note: "8km" })).toEqual({ billSent: false });
  expect(await admin.query(api.admin.dispatch.needsPriceCount, {})).toBe(0);

  // Farm B's 24 hours run out: it expires (nothing to refund) and the bill goes out for farm A
  vi.advanceTimersByTime(25 * HOUR);
  await t.mutation(internal.orders.system.expireOne, { orderId: orderB });
  const checkout = await t.run(async (ctx) => (await ctx.db.get(placed.checkoutId))!);
  expect(checkout).toMatchObject({ status: "awaiting_payment", itemsTotalKobo: 900000, deliveryFeeKobo: 150000, totalKobo: 1050000 });
  expect(checkout.payBy! - checkout.billedAt!).toBe(12 * HOUR);
  expect(checkout.payToken).toMatch(/^[0-9a-f]{48}$/);
  expect(await t.run(async (ctx) => (await ctx.db.get(orderB))!)).toMatchObject({ status: "expired", escrow: "none" });
  await expect(admin.mutation(api.admin.dispatch.setDeliveryPrice, { orderId: orderA, feeKobo: 1 })).rejects.toThrow(/BILL_ALREADY_SENT/);

  // The bill: in-app, email and SMS (with the pay link)
  await t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1));
  const billNote = await t.run(async (ctx) => (await ctx.db.query("notifications").collect()).find((n) => n.kind === "bill_ready")!);
  expect(billNote).toMatchObject({ side: "shop", href: `/pay/${checkout.payToken}`, smsTo: "+2348031112222" });
  expect(billNote.body).toContain("₦10,500, including ₦1,500 delivery");
  const texts = await t.run(async (ctx) => await ctx.db.query("smsLog").collect());
  expect(texts.some((m) => m.body.includes(`farmkeke.com/pay/${checkout.payToken}`))).toBe(true);

  // Anyone with the link sees the bill (first name only) and can pay it from another phone
  const other = as(t, s.account);
  const viaLink = await other.query(api.payments.checkout.bill, { token: checkout.payToken! });
  expect(viaLink).toMatchObject({ isOwner: false, totalKobo: 1050000, payToken: null, canSaveCard: false, contact: { name: "Guest", phone: "" } });
  expect(viaLink!.orders.map((o: any) => o.number)).toEqual(["FK-10001"]);
  expect(await other.query(api.payments.checkout.bill, { token: "f".repeat(48) })).toBeNull();
  await expect(payTest(t, s.account, placed.checkoutId)).rejects.toThrow(/NOT_FOUND/);
  await payTest(t, s.account, placed.checkoutId, checkout.payToken);
  const paidA = await guest.query(api.orders.consumer.get, { orderId: orderA });
  expect(paidA).toMatchObject({ status: "ready_for_rider", escrow: "held", paid: true, deliveryFeeKobo: 150000, totalKobo: 1050000 });

  // Paid: the rider collects
  await farmerA.mutation(api.orders.farmer.confirmHandover, { orderId: orderA });
  const farmView = await farmerA.query(api.orders.farmer.get, { orderId: orderA });
  expect(farmView).toMatchObject({ status: "out_for_delivery", consumer: { firstName: "Guest" }, paymentPending: false });
  expect(farmView!.money).toMatchObject({ productKobo: 900000, feeKobo: 45000, netKobo: 855000 });
  await admin.mutation(api.admin.dispatch.recordStep, { orderId: orderA, step: "delivered" });

  // Another device (different identity) only gets the view-only Find my order
  expect(await other.query(api.orders.consumer.get, { orderId: orderA })).toBeNull();
  const found = await other.query(api.orders.consumer.find, { number: "FK-10001", phone: "08031112222" });
  expect(found).toMatchObject({ viewOnly: true, canConfirm: false, pickupCode: null });
  await expect(other.mutation(api.orders.consumer.confirmReceipt, { orderId: orderA })).rejects.toThrow(/NOT_FOUND/);

  await guest.mutation(api.orders.consumer.confirmReceipt, { orderId: orderA });
  // Run everything scheduled: the payout now; the bill's reminder and lapse find it paid
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const result = await t.run(async (ctx) => {
    const a = (await ctx.db.get(orderA))!;
    const ledgerA = await ctx.db.query("ledgerEntries").withIndex("by_orderId", (q) => q.eq("orderId", orderA)).collect();
    const ledgerB = await ctx.db.query("ledgerEntries").withIndex("by_orderId", (q) => q.eq("orderId", orderB)).collect();
    const payouts = await ctx.db.query("payouts").collect();
    const refunds = await ctx.db.query("refunds").collect();
    const events = await ctx.db.query("orderEvents").withIndex("by_orderId", (q) => q.eq("orderId", orderA)).collect();
    const stockB = (await ctx.db.get(s.yams))!.units[0].stock;
    const notes = await ctx.db.query("notifications").collect();
    const finalCheckout = (await ctx.db.get(placed.checkoutId))!;
    return { a, ledgerA, ledgerB, payouts, refunds, events, stockB, notes, finalCheckout };
  });
  expect(result.a).toMatchObject({ status: "completed", escrow: "released" });
  expect(result.finalCheckout.status).toBe("paid");
  expect(result.ledgerA.map((e) => [e.kind, e.amountKobo, e.status])).toEqual([
    ["hold", 1050000, "done"],
    ["release", 855000, "done"],
    ["commission", 45000, "done"],
    ["delivery_fee", 150000, "done"],
    ["payout", 855000, "done"],
  ]);
  expect(result.payouts).toHaveLength(1);
  expect(result.payouts[0]).toMatchObject({ status: "sent", provider: "simulated", amountKobo: 855000 });
  expect(result.events.map((e) => e.kind)).toEqual([
    "placed", "accepted", "preparing", "packed", "ready_for_rider", "rider_assigned", "delivery_priced", "bill_sent", "paid",
    "out_for_delivery", "delivered", "completed", "released",
  ]);
  expect(result.events.find((e) => e.kind === "accepted")?.actorKind).toBe("farmer");
  // The farm that expired was never paid, so there's nothing to refund
  expect(result.refunds).toHaveLength(0);
  expect(result.ledgerB).toEqual([]);
  expect(result.stockB).toBe(10);
  expect(result.notes.some((n) => n.kind === "order_expired" && n.side === "shop" && n.body.includes("haven't been charged"))).toBe(true);
  expect(result.notes.some((n) => n.kind === "order_paid" && n.side === "farm")).toBe(true);
  // Paid in time: no reminder lapse
  expect(result.notes.some((n) => n.kind === "bill_expired")).toBe(false);
  expect(result.notes.some((n) => n.kind === "review_reminder")).toBe(true);
});

test("delivery bills: price changes until sent, reminder at 6 hours, cancelled unpaid at 12; caps; all farms decline", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const ctxS = { ...s, farmerA: s.farmerA, admin: s.admin };
  const later = async (ms: number) => {
    vi.advanceTimersByTime(ms);
    await t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1));
  };

  const placed = await placeDelivery(t, ctxS, s.guest, { email: "guest@example.com" });
  const orderId = placed.orders[0]!.orderId;
  await as(t, s.farmerA).mutation(api.orders.farmer.accept, { orderId });
  // Dispatch staff get a portal alert to price it (Finance doesn't handle dispatch)
  const alerts = await t.run(async (ctx) => (await ctx.db.query("notifications").collect()).filter((n) => n.kind === "delivery_to_price"));
  expect(alerts.map((n) => [n.userId, n.side, n.href])).toEqual([[s.admin.id, "staff", `/admin/orders/${orderId}`]]);
  const riderId = await as(t, s.admin).mutation(api.admin.riders.create, { name: "Emeka", phone: "08035550000", reason: "New rider", serviceAreaIds: [s.areaId] });
  await as(t, s.admin).mutation(api.admin.dispatch.assignRider, { orderId, riderId, collectAt: Date.now() + HOUR });
  await expect(as(t, s.admin).mutation(api.admin.dispatch.setDeliveryPrice, { orderId, feeKobo: 10.5 })).rejects.toThrow(/INVALID_AMOUNT/);
  await expect(as(t, s.staff).mutation(api.admin.dispatch.setDeliveryPrice, { orderId, feeKobo: 100000 })).rejects.toThrow(/FORBIDDEN/);
  // One farm: the first price sends the bill
  expect(await as(t, s.admin).mutation(api.admin.dispatch.setDeliveryPrice, { orderId, feeKobo: 120000 })).toEqual({ billSent: true });

  // Six hours in: a reminder (in-app, email and SMS)
  await later(6 * HOUR + 1000);
  const notes = async () => await t.run(async (ctx) => await ctx.db.query("notifications").collect());
  expect((await notes()).filter((n) => n.kind === "bill_reminder")).toHaveLength(1);
  // Twelve hours: cancelled, stock back, farm and shopper told, nothing charged
  await later(6 * HOUR);
  const after = await t.run(async (ctx) => ({
    checkout: (await ctx.db.get(placed.checkoutId))!,
    order: (await ctx.db.get(orderId))!,
    stock: (await ctx.db.get(s.tomatoes))!.units[0].stock,
  }));
  expect(after.checkout).toMatchObject({ status: "abandoned", abandonReason: "bill_not_paid" });
  expect(after.order).toMatchObject({ status: "cancelled", cancelReason: "bill_not_paid", escrow: "none" });
  expect(after.stock).toBe(10);
  expect((await notes()).map((n) => `${n.side}:${n.kind}`)).toEqual(expect.arrayContaining(["farm:order_cancelled", "shop:bill_expired"]));
  await expect(payTest(t, s.guest, placed.checkoutId)).rejects.toThrow(/CHECKOUT_EXPIRED/);

  // Unpaid delivery orders are capped per phone number (farms pack them before payment)
  for (let i = 0; i < 3; i++) await placeDelivery(t, ctxS, s.account, { quantity: 1, phone: "0809 000 0001" });
  await expect(placeDelivery(t, ctxS, s.guest, { quantity: 1, phone: "0809 000 0001" })).rejects.toThrow(/TOO_MANY_UNPAID/);

  // Every farm declines: the checkout closes and nothing is billed
  const lone = await placeDelivery(t, ctxS, s.guest, { quantity: 1, email: "g@example.com", phone: "0807 000 0002" });
  await as(t, s.farmerA).mutation(api.orders.farmer.decline, { orderId: lone.orders[0]!.orderId, reason: "other", note: "Rain" });
  expect(await t.run(async (ctx) => (await ctx.db.get(lone.checkoutId))!)).toMatchObject({ status: "abandoned", abandonReason: "no_orders_left" });
});

test("pickup order gets a code; admin fees, hold and release; guest claim", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const staff = as(t, s.staff);

  const fees = await staff.query(api.admin.fees.get, {});
  expect(fees).toMatchObject({ commissionBps: null, effectiveCommissionBps: 500, farmerResponseHours: 24 });
  await expect(guest.query(api.admin.fees.get, {})).rejects.toThrow();
  await staff.mutation(api.admin.fees.setCommission, { commissionBps: 1000, reason: "Test" });

  // Pickup is at the farm: no pickup point to choose, and the quote says where
  const items = [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }];
  const quote = await guest.query(api.checkout.quote, { items, fulfilment: "pickup" });
  expect(quote.farms[0]).toMatchObject({ collectionArea: "Owerri North, Imo" });
  expect(quote.deliveryFeeLater).toBe(false);
  const placed = await guest.mutation(api.checkout.place, {
    items, fulfilment: "pickup", expectedTotalKobo: 450000, contact: { name: "Guest", phone: "08031112222" },
  });
  expect(placed.payNow).toBe(true);
  const orderId = placed.orders[0].orderId;
  await guest.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  const summary = await guest.query(api.orders.consumer.placedSummary, { checkoutId: placed.checkoutId });
  expect(summary!.orders[0].pickupCode).toMatch(/^\d{4}$/);

  const farmer = as(t, s.farmerA);
  await farmer.mutation(api.orders.farmer.accept, { orderId });
  await farmer.mutation(api.orders.farmer.startPreparing, { orderId });
  await farmer.mutation(api.orders.farmer.readyForRider, { orderId });
  // Ready at the farm: the shopper has 3 days, and sees where to go
  const ready = await guest.query(api.orders.consumer.get, { orderId });
  expect(ready).toMatchObject({ status: "ready_for_collection", collectFrom: { farmName: "Ada Greens", address: "x", collectWithinDays: 3 } });
  expect(ready!.collectBy! - Date.now()).toBe(3 * 86_400_000);
  expect(await farmer.query(api.orders.farmer.get, { orderId })).toMatchObject({ next: "confirm_collection" });
  await expect(farmer.mutation(api.orders.farmer.confirmHandover, { orderId })).rejects.toThrow(/WRONG_STATUS/);
  // The farmer enters the shopper's code to hand it over
  await expect(farmer.mutation(api.orders.farmer.confirmCollection, { orderId, code: "0000" })).rejects.toThrow(/WRONG_PICKUP_CODE/);
  await farmer.mutation(api.orders.farmer.confirmCollection, { orderId, code: ready!.pickupCode! });
  expect((await guest.query(api.orders.consumer.get, { orderId }))!.status).toBe("collected");
  await t.run(async (ctx) => {
    await ctx.db.patch(orderId, { deliveredAt: Date.now() - 2 * 86_400_000 });
  });

  // Unconfirmed a day after collection: flagged for staff
  await t.mutation(internal.orders.system.flagUnconfirmed, {});
  const queue = await staff.query(api.admin.ledger.releaseQueue, {});
  expect(queue.unconfirmed.map((r: any) => r.orderId)).toEqual([orderId]);

  await staff.mutation(api.admin.ledger.setHold, { orderId, hold: true, reason: "Checking" });
  await expect(staff.mutation(api.admin.ledger.release, { orderId, reason: "x" })).rejects.toThrow(/ESCROW_ON_HOLD/);
  // Consumer confirms while held: completed, money stays held
  await guest.mutation(api.orders.consumer.confirmReceipt, { orderId });
  let order = await t.run(async (ctx) => (await ctx.db.get(orderId))!);
  expect(order).toMatchObject({ status: "completed", escrow: "held" });
  // Lifting the hold releases at the new 10% commission
  await staff.mutation(api.admin.ledger.setHold, { orderId, hold: false, reason: "All good" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  order = await t.run(async (ctx) => (await ctx.db.get(orderId))!);
  expect(order.escrow).toBe("released");
  const entries = await staff.query(api.admin.ledger.entries, { orderId });
  expect(entries.find((e: any) => e.kind === "commission")?.amountKobo).toBe(45000);
  const audit = await t.run(async (ctx) => await ctx.db.query("auditLog").collect());
  expect(audit.map((a) => a.action)).toEqual(["fees.setCommission", "ledger.hold", "ledger.unhold"]);

  // Guest saves their details: orders move to the account
  const { token } = await guest.mutation(api.orders.consumer.startGuestClaim, {});
  const account = as(t, s.account);
  expect(await account.mutation(api.orders.consumer.claimGuestOrders, { token })).toEqual({ claimed: 1 });
  expect(await account.query(api.orders.consumer.list, {})).toHaveLength(1);
  expect(await guest.query(api.orders.consumer.list, {})).toHaveLength(0);
  await expect(account.mutation(api.orders.consumer.claimGuestOrders, { token })).rejects.toThrow(/INVALID_TOKEN/);
});

test("decline refunds in full; cart changes block place; markPaidTest off with a key", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const items = [{ listingId: s.yams, unitId: s.unitId, quantity: 2, priceKobo: 300000 }];
  await expect(
    guest.mutation(api.checkout.place, {
      items: [{ ...items[0], priceKobo: 1 }], fulfilment: "pickup", expectedTotalKobo: 2,
      contact: { name: "G", phone: "08031112222" },
    }),
  ).rejects.toThrow(/CART_CHANGED/);
  const placed = await guest.mutation(api.checkout.place, {
    items, fulfilment: "pickup", expectedTotalKobo: 600000, contact: { name: "G", phone: "08031112222" },
  });
  await guest.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  const orderId = placed.orders[0].orderId;
  await as(t, s.farmerB).mutation(api.orders.farmer.decline, { orderId, reason: "out_of_stock" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const view = await guest.query(api.orders.consumer.get, { orderId });
  expect(view).toMatchObject({ status: "declined", escrow: "refunded", hasRefund: true, declineReason: "out_of_stock" });
  // Out of stock: stock not put back
  expect(await t.run(async (ctx) => (await ctx.db.get(s.yams))!.units[0].stock)).toBe(8);

  // Abandoned checkout gives stock back
  const again = await guest.mutation(api.checkout.place, {
    items: [{ ...items[0], quantity: 1 }], fulfilment: "pickup", expectedTotalKobo: 300000,
    contact: { name: "G", phone: "08031112222" },
  });
  vi.advanceTimersByTime(2 * 3_600_000);
  await t.mutation(internal.checkout.abandonStale, { olderThanMinutes: 60 });
  expect(await t.run(async (ctx) => (await ctx.db.get(again.checkoutId))!.status)).toBe("abandoned");
  expect(await t.run(async (ctx) => (await ctx.db.get(s.yams))!.units[0].stock)).toBe(8);
  expect(await guest.query(api.orders.consumer.list, {})).toHaveLength(1);

  process.env.PAYSTACK_SECRET_KEY = "sk_test_x";
  const third = await guest.mutation(api.checkout.place, {
    items: [{ ...items[0], quantity: 1 }], fulfilment: "pickup", expectedTotalKobo: 300000,
    contact: { name: "G", phone: "08031112222" },
  });
  await expect(guest.mutation(api.payments.checkout.markPaidTest, { checkoutId: third.checkoutId })).rejects.toThrow(/TEST_STEP_OFF/);
});

test("live Paystack path: start, signed webhook, payout transfer, refund", async () => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  const calls: { url: string; body: any }[] = [];
  let txAmount = 0;
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    const ok = (data: unknown) => new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
    if (url.endsWith("/transaction/initialize")) {
      txAmount = body.amount;
      return ok({ authorization_url: "https://checkout.paystack.com/abc", access_code: "abc", reference: body.reference });
    }
    if (url.includes("/transaction/verify/")) {
      const reference = decodeURIComponent(url.split("/transaction/verify/")[1]);
      return ok({ reference, status: "success", amount: txAmount, currency: "NGN", channel: "card", paid_at: new Date().toISOString(),
        authorization: { authorization_code: "AUTH_1", card_type: "visa ", last4: "4081", exp_month: "12", exp_year: "2030", reusable: true, signature: "SIG_1" },
        customer: { email: "x@y.z" } });
    }
    if (url.endsWith("/transferrecipient")) return ok({ recipient_code: "RCP_1" });
    if (url.endsWith("/transfer")) return ok({ transfer_code: "TRF_1", status: "pending" });
    if (url.endsWith("/refund")) return ok({ id: 77, status: "pending" });
    return new Response(JSON.stringify({ status: false, message: "unexpected" }), { status: 400 });
  });
  const sign = async (raw: string) => {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode("sk_test_secret"), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(raw))), (b) => b.toString(16).padStart(2, "0")).join("");
  };
  const hook = async (payload: unknown, sig?: string) => {
    const raw = JSON.stringify(payload);
    return await t.fetch("/paystack/webhook", { method: "POST", body: raw, headers: { "x-paystack-signature": sig ?? (await sign(raw)) } });
  };

  const t = convexTest(schema, modules);
  const s = await seed(t);
  const shopper = as(t, s.account);
  expect(await t.query(api.payments.config.get, {})).toEqual({ live: true, testStep: false });
  const placed = await shopper.mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
    fulfilment: "pickup", expectedTotalKobo: 450000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  const started = await shopper.action(api.payments.checkout.start, { checkoutId: placed.checkoutId, method: "card", saveCard: true });
  expect(started).toEqual({ accessCode: "abc", authorizationUrl: "https://checkout.paystack.com/abc", reference: "CK-10001-1" });
  expect(calls[0].body.callback_url).toBe(`https://farmkeke.com/checkout/pay/${placed.checkoutId}`);
  expect(calls[0].body.amount).toBe(450000);

  expect((await hook({ event: "charge.success", data: { reference: "CK-10001-1" } }, "bad")).status).toBe(401);
  expect((await hook({ event: "charge.success", data: { reference: "CK-10001-1" } })).status).toBe(200);
  // A replayed webhook changes nothing
  expect((await hook({ event: "charge.success", data: { reference: "CK-10001-1" } })).status).toBe(200);
  const paid = await shopper.query(api.payments.checkout.get, { checkoutId: placed.checkoutId });
  expect(paid).toMatchObject({ status: "paid", lastAttempt: { status: "success" } });
  expect(await shopper.query(api.payments.cards.list, {})).toMatchObject([{ brand: "visa", last4: "4081" }]);
  const holds = await t.run(async (ctx) => await ctx.db.query("ledgerEntries").collect());
  expect(holds.filter((e) => e.kind === "hold")).toHaveLength(1);

  const orderId = placed.orders[0].orderId;
  const farmer = as(t, s.farmerA);
  await farmer.mutation(api.orders.farmer.accept, { orderId });
  await farmer.mutation(api.orders.farmer.startPreparing, { orderId });
  await farmer.mutation(api.orders.farmer.readyForRider, { orderId });
  const code = await t.run(async (ctx) => (await ctx.db.get(orderId))!.pickupCode!);
  await farmer.mutation(api.orders.farmer.confirmCollection, { orderId, code });
  await shopper.mutation(api.orders.consumer.confirmReceipt, { orderId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  let payout = await t.run(async (ctx) => (await ctx.db.query("payouts").first())!);
  expect(payout).toMatchObject({ status: "pending", provider: "paystack", transferCode: "TRF_1", amountKobo: 427500 });
  expect(calls.find((c) => c.url.endsWith("/transfer"))!.body).toMatchObject({ amount: 427500, recipient: "RCP_1", reference: "PO-FK-10001-1" });
  expect((await hook({ event: "transfer.success", data: { reference: "PO-FK-10001-1", transfer_code: "TRF_1", amount: 427500 } })).status).toBe(200);
  payout = await t.run(async (ctx) => (await ctx.db.query("payouts").first())!);
  expect(payout.status).toBe("sent");
  const farmPayouts = await farmer.query(api.payments.payouts.list, {});
  expect(farmPayouts).toMatchObject([{ status: "sent", amountKobo: 427500 }]);

  // A second order, declined: refund goes to Paystack, settles by webhook
  const second = await shopper.mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
    fulfilment: "pickup", expectedTotalKobo: 450000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  await shopper.action(api.payments.checkout.start, { checkoutId: second.checkoutId, method: "card" });
  const verified = await shopper.action(api.payments.checkout.verify, { checkoutId: second.checkoutId });
  expect(verified).toEqual({ status: "paid", paid: true });
  await farmer.mutation(api.orders.farmer.decline, { orderId: second.orders[0].orderId, reason: "other", note: "Rain" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(calls.find((c) => c.url.endsWith("/refund"))!.body).toMatchObject({ transaction: "CK-10002-1", amount: 450000 });
  let refund = await t.run(async (ctx) => (await ctx.db.query("refunds").first())!);
  expect(refund).toMatchObject({ status: "processing", providerRefundId: "77" });
  await hook({ event: "refund.processed", data: { id: 77, status: "processed", transaction_reference: "CK-10002-1", amount: 450000 } });
  refund = await t.run(async (ctx) => (await ctx.db.query("refunds").first())!);
  expect(refund.status).toBe("processed");
  const unmatched = await hook({ event: "transfer.success", data: { reference: "NOPE" } });
  expect(unmatched.status).toBe(200);
  expect(await t.run(async (ctx) => (await ctx.db.query("unmatchedPaymentEvents").collect()).length)).toBe(1);

  // A delivery bill paid through its link from another phone: Paystack sends the payer back to the pay page
  const bill = await placeDelivery(t, s, s.guest, { quantity: 1, email: "g@example.com" });
  await billDelivery(t, s, bill.orders[0]!.orderId, 120000);
  const token = await t.run(async (ctx) => (await ctx.db.get(bill.checkoutId))!.payToken!);
  await shopper.action(api.payments.checkout.start, { checkoutId: bill.checkoutId, method: "card", saveCard: true, payToken: token });
  const init = calls.filter((c) => c.url.endsWith("/transaction/initialize")).at(-1)!;
  expect(init.body).toMatchObject({ amount: 570000, callback_url: `https://farmkeke.com/pay/${token}` });
  // Someone else's bill is never saved to the payer's cards
  const attempt = await t.run(async (ctx) => (await ctx.db.query("paymentAttempts").collect()).at(-1)!);
  expect(attempt.saveCard).toBeUndefined();
  vi.unstubAllGlobals();
});
