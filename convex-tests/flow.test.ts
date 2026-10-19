// Phase 6 "done when": a guest orders from two farms, farms act, the consumer
// confirms, and the ledger shows the money released. Plus expiry, auth checks,
// admin release queue and guest claim. Runs against the repo's convex/ code.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
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
    return { guest, account, farmerA, farmerB, staff, unitId, areaId, pointId, farmA, farmB, tomatoes, yams };
  });
}

const as = (t: ReturnType<typeof convexTest>, u: { id: string; sessionId: string }) =>
  t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

test("guest orders from two farms; one completes and pays out, one expires and refunds", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const items = [
    { listingId: s.tomatoes, unitId: s.unitId, quantity: 2, priceKobo: 450000 },
    { listingId: s.yams, unitId: s.unitId, quantity: 1, priceKobo: 300000 },
  ];

  const config = await t.query(api.payments.config.get, {});
  expect(config).toEqual({ live: false, testStep: true });

  const quote = await guest.query(api.checkout.quote, { items, fulfilment: "delivery", serviceAreaId: s.areaId });
  expect(quote.changes).toEqual([]);
  expect(quote.farms).toHaveLength(2);
  expect(quote.totalKobo).toBe(900000 + 300000 + 2 * 100000);

  const stale = await guest.query(api.checkout.quote, { items: [{ ...items[0], priceKobo: 1 }] });
  expect(stale.changes[0]).toMatchObject({ kind: "price", priceKobo: 450000 });

  const windows = await guest.query(api.checkout.deliveryWindows, { farmIds: [s.farmA, s.farmB], now: Date.now() });
  expect(windows.days.length).toBeGreaterThan(0);
  const day = windows.days[0];

  const placed = await guest.mutation(api.checkout.place, {
    items,
    fulfilment: "delivery",
    expectedTotalKobo: quote.totalKobo,
    address: { street: "53b Nob Oluwa", landmark: "Opposite the church", serviceAreaId: s.areaId },
    window: { day: day.day, ...day.slots[0] },
    contact: { name: "Guest Shopper", phone: "0803 111 2222" },
  });
  expect(placed.orders.map((o: any) => o.number)).toEqual(["FK-10001", "FK-10002"]);

  // Stock is held at placement
  const afterPlace = await t.run(async (ctx) => (await ctx.db.get(s.tomatoes))!.units[0].stock);
  expect(afterPlace).toBe(8);

  await guest.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  const [orderA, orderB] = placed.orders.map((o: any) => o.orderId);
  const paidA = await guest.query(api.orders.consumer.get, { orderId: orderA });
  expect(paidA).toMatchObject({ status: "paid", escrow: "held", canConfirm: false });
  expect(paidA!.respondBy).toBeGreaterThan(Date.now());

  // Wrong farmer can't act on someone else's order
  await expect(as(t, s.farmerB).mutation(api.orders.farmer.accept, { orderId: orderA })).rejects.toThrow();
  // Consumer can't confirm before delivery
  await expect(guest.mutation(api.orders.consumer.confirmReceipt, { orderId: orderA })).rejects.toThrow(/NOT_DELIVERED_YET/);

  const farmerA = as(t, s.farmerA);
  expect(await farmerA.query(api.orders.farmer.counts, {})).toMatchObject({ new: 1 });
  await farmerA.mutation(api.orders.farmer.accept, { orderId: orderA });
  await farmerA.mutation(api.orders.farmer.startPreparing, { orderId: orderA });
  await farmerA.mutation(api.orders.farmer.markPacked, { orderId: orderA });
  await farmerA.mutation(api.orders.farmer.readyForRider, { orderId: orderA });
  await farmerA.mutation(api.orders.farmer.confirmHandover, { orderId: orderA });
  const farmView = await farmerA.query(api.orders.farmer.get, { orderId: orderA });
  expect(farmView).toMatchObject({ status: "out_for_delivery", consumer: { firstName: "Guest" } });
  expect(farmView!.money).toMatchObject({ productKobo: 900000, feeKobo: 45000, netKobo: 855000 });

  // Dispatch marks it delivered (admin/dispatch arrives in 3b)
  await t.run(async (ctx) => {
    await ctx.db.patch(orderA, { status: "delivered", deliveredAt: Date.now() });
  });

  // Another device (different identity) only gets the view-only Find my order
  const other = as(t, s.account);
  expect(await other.query(api.orders.consumer.get, { orderId: orderA })).toBeNull();
  const found = await other.query(api.orders.consumer.find, { number: "FK-10001", phone: "08031112222" });
  expect(found).toMatchObject({ viewOnly: true, canConfirm: false, pickupCode: null });
  await expect(other.mutation(api.orders.consumer.confirmReceipt, { orderId: orderA })).rejects.toThrow(/NOT_FOUND/);

  await guest.mutation(api.orders.consumer.confirmReceipt, { orderId: orderA });

  // Run everything scheduled: payout send now, farm B's 24h expiry later
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const result = await t.run(async (ctx) => {
    const a = (await ctx.db.get(orderA))!;
    const b = (await ctx.db.get(orderB))!;
    const ledgerA = await ctx.db.query("ledgerEntries").withIndex("by_orderId", (q) => q.eq("orderId", orderA)).collect();
    const ledgerB = await ctx.db.query("ledgerEntries").withIndex("by_orderId", (q) => q.eq("orderId", orderB)).collect();
    const payouts = await ctx.db.query("payouts").collect();
    const refunds = await ctx.db.query("refunds").collect();
    const events = await ctx.db.query("orderEvents").withIndex("by_orderId", (q) => q.eq("orderId", orderA)).collect();
    const stockB = (await ctx.db.get(s.yams))!.units[0].stock;
    const notes = await ctx.db.query("notifications").collect();
    return { a, b, ledgerA, ledgerB, payouts, refunds, events, stockB, notes };
  });
  expect(result.a).toMatchObject({ status: "completed", escrow: "released" });
  expect(result.ledgerA.map((e) => [e.kind, e.amountKobo, e.status])).toEqual([
    ["hold", 1000000, "done"],
    ["release", 855000, "done"],
    ["commission", 45000, "done"],
    ["delivery_fee", 100000, "done"],
    ["payout", 855000, "done"],
  ]);
  expect(result.payouts).toHaveLength(1);
  expect(result.payouts[0]).toMatchObject({ status: "sent", provider: "simulated", amountKobo: 855000 });
  expect(result.events.map((e) => e.kind)).toEqual([
    "awaiting_payment", "paid", "accepted", "preparing", "packed", "ready_for_rider", "out_for_delivery", "completed", "released",
  ]);
  expect(result.events.find((e) => e.kind === "accepted")?.actorKind).toBe("farmer");

  expect(result.b).toMatchObject({ status: "expired", escrow: "refunded" });
  expect(result.refunds).toHaveLength(1);
  expect(result.refunds[0]).toMatchObject({ kind: "full", amountKobo: 400000, status: "processed", provider: "simulated" });
  expect(result.ledgerB.map((e) => [e.kind, e.status])).toEqual([["hold", "done"], ["refund", "done"]]);
  expect(result.stockB).toBe(10);
  expect(result.notes.some((n) => n.kind === "order_expired" && n.side === "shop")).toBe(true);
  expect(result.notes.some((n) => n.kind === "review_reminder")).toBe(true);

  const refundView = await guest.query(api.payments.refunds.forOrder, { orderId: orderB });
  expect(refundView[0]).toMatchObject({ status: "processed", simulated: true, methodLabel: "Test payment" });
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

  const points = await guest.query(api.checkout.pickupPoints, { latitude: 5.5, longitude: 7.0 });
  expect(points[0]).toMatchObject({ collectWithinDays: 3 });
  expect(points[0].distanceKm).not.toBeNull();

  const items = [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }];
  const placed = await guest.mutation(api.checkout.place, {
    items, fulfilment: "pickup", expectedTotalKobo: 450000, pickupPointId: s.pointId,
    contact: { name: "Guest", phone: "08031112222" },
  });
  const orderId = placed.orders[0].orderId;
  await guest.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  const summary = await guest.query(api.orders.consumer.placedSummary, { checkoutId: placed.checkoutId });
  expect(summary!.orders[0].pickupCode).toMatch(/^\d{6}$/);

  const farmer = as(t, s.farmerA);
  await farmer.mutation(api.orders.farmer.accept, { orderId });
  await farmer.mutation(api.orders.farmer.startPreparing, { orderId });
  await farmer.mutation(api.orders.farmer.readyForRider, { orderId });
  await farmer.mutation(api.orders.farmer.confirmHandover, { orderId });
  expect((await guest.query(api.orders.consumer.get, { orderId }))!.status).toBe("with_rider");
  await t.run(async (ctx) => {
    await ctx.db.patch(orderId, { status: "collected", deliveredAt: Date.now() - 2 * 86_400_000 });
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
      items: [{ ...items[0], priceKobo: 1 }], fulfilment: "pickup", expectedTotalKobo: 2, pickupPointId: s.pointId,
      contact: { name: "G", phone: "08031112222" },
    }),
  ).rejects.toThrow(/CART_CHANGED/);
  const placed = await guest.mutation(api.checkout.place, {
    items, fulfilment: "pickup", expectedTotalKobo: 600000, pickupPointId: s.pointId, contact: { name: "G", phone: "08031112222" },
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
    items: [{ ...items[0], quantity: 1 }], fulfilment: "pickup", expectedTotalKobo: 300000, pickupPointId: s.pointId,
    contact: { name: "G", phone: "08031112222" },
  });
  vi.advanceTimersByTime(2 * 3_600_000);
  await t.mutation(internal.checkout.abandonStale, { olderThanMinutes: 60 });
  expect(await t.run(async (ctx) => (await ctx.db.get(again.checkoutId))!.status)).toBe("abandoned");
  expect(await t.run(async (ctx) => (await ctx.db.get(s.yams))!.units[0].stock)).toBe(8);
  expect(await guest.query(api.orders.consumer.list, {})).toHaveLength(1);

  process.env.PAYSTACK_SECRET_KEY = "sk_test_x";
  const third = await guest.mutation(api.checkout.place, {
    items: [{ ...items[0], quantity: 1 }], fulfilment: "pickup", expectedTotalKobo: 300000, pickupPointId: s.pointId,
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
    fulfilment: "pickup", expectedTotalKobo: 450000, pickupPointId: s.pointId, contact: { name: "Ada Obi", phone: "08031112222" },
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
  await farmer.mutation(api.orders.farmer.confirmHandover, { orderId });
  await t.run(async (ctx) => { await ctx.db.patch(orderId, { status: "collected", deliveredAt: Date.now() }); });
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
    fulfilment: "pickup", expectedTotalKobo: 450000, pickupPointId: s.pointId, contact: { name: "Ada Obi", phone: "08031112222" },
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
  vi.unstubAllGlobals();
});
