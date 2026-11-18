// Paystack split payments (17 Nov 2026): farms are Paystack subaccounts,
// every payment is split the moment it's made, refunds come from Farmkeke and
// the farm's part is recovered from its next orders, and problems can only be
// reported until the order closes a day after delivery.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { as, deliver, paidOrder } from "./orderFlow";
import { grantStaff } from "./staff";

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.PAYSTACK_SECRET_KEY;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.PAYSTACK_SECRET_KEY;
});

const HOUR = 3_600_000;
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
    const admin = await user({ name: "Sam Admin", email: "sam@example.com", staffRole: "super_admin" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, active: true, sortOrder: 1 });
    const appId = await ctx.db.insert("farmerApplications", { userId: farmerA.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] });
    const farm = async (userId: any, name: string, code?: string) =>
      await ctx.db.insert("farms", {
        userId, applicationId: appId, name, phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
        farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
        openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
        accountName: name, status: "active", trusted: true, paystackSubaccountCode: code,
      });
    const farmA = await farm(farmerA.id, "Ada Greens", "ACCT_A");
    const farmB = await farm(farmerB.id, "Okafor Farms", "ACCT_B");
    const listing = async (farmId: any, name: string, priceKobo: number) =>
      await ctx.db.insert("listings", { farmId, status: "live", name, photoIds: [], units: [{ unitId, priceKobo, stock: 50, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    const tomatoes = await listing(farmA, "Tomatoes", 450000);
    const yams = await listing(farmB, "Yams", 300000);
    return { guest, account, farmerA, farmerB, admin, unitId, areaId, farmA, farmB, tomatoes, yams };
  });
}

test("one payment for two farms: each farm's flat share, one with a debt and one with a credit", async () => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  const calls: { url: string; body: any }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    const ok = (data: unknown) => new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
    if (url.endsWith("/split")) return ok({ split_code: "SPL_1" });
    if (url.endsWith("/transaction/initialize")) return ok({ authorization_url: "https://checkout.paystack.com/x", access_code: "x", reference: body.reference });
    return new Response(JSON.stringify({ status: false, message: "unexpected" }), { status: 400 });
  });
  const t = convexTest(schema, modules);
  const s = await seed(t);
  // Farm A owes ₦1,000 from an earlier refund; farm B has a ₦100 credit
  await t.run(async (ctx) => {
    await ctx.db.patch(s.farmA, { owedKobo: 100000 });
    await ctx.db.patch(s.farmB, { owedKobo: -10000 });
  });
  const shopper = as(t, s.account);
  const placed = await shopper.mutation(api.checkout.place, {
    items: [
      { listingId: s.tomatoes, unitId: s.unitId, quantity: 2, priceKobo: 450000 },
      { listingId: s.yams, unitId: s.unitId, quantity: 1, priceKobo: 300000 },
    ],
    fulfilment: "pickup", expectedTotalKobo: 1200000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  const [a, b] = placed.orders;
  await expect(shopper.action(api.payments.checkout.start, { checkoutId: placed.checkoutId, method: "card" })).rejects.toThrow(/BILL_NOT_READY/);
  await as(t, s.farmerA).mutation(api.orders.farmer.accept, { orderId: a.orderId });
  // One bill for the checkout: it waits for every farm to answer
  await expect(shopper.action(api.payments.checkout.start, { checkoutId: placed.checkoutId, method: "card" })).rejects.toThrow(/BILL_NOT_READY/);
  await as(t, s.farmerB).mutation(api.orders.farmer.accept, { orderId: b.orderId });
  await shopper.action(api.payments.checkout.start, { checkoutId: placed.checkoutId, method: "card" });
  // A: 900,000 - 5% (45,000) - 100,000 owed = 755,000. B: 300,000 - 15,000 + 10,000 credit = 295,000
  expect(calls.find((c) => c.url.endsWith("/split"))!.body.subaccounts).toEqual([
    { subaccount: "ACCT_A", share: 755000 },
    { subaccount: "ACCT_B", share: 295000 },
  ]);
  expect(calls.find((c) => c.url.endsWith("/transaction/initialize"))!.body).toMatchObject({ amount: 1200000, split_code: "SPL_1" });
  const attempt = await t.run(async (ctx) => (await ctx.db.query("paymentAttempts").collect())[0]!);
  expect(attempt.split!.map((p) => [p.shareKobo, p.commissionKobo, p.recoveredKobo])).toEqual([[755000, 45000, 100000], [295000, 15000, -10000]]);
});

test("a debt bigger than the order takes the whole share; the share never goes past the order's total", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.run(async (ctx) => {
    await ctx.db.patch(s.farmA, { owedKobo: 2_000_000 });
    await ctx.db.patch(s.farmB, { owedKobo: -5_000_000 });
  });
  await paidOrder(t, s, s.account, "pickup", 1);
  const farmA = await t.run(async (ctx) => (await ctx.db.get(s.farmA))!);
  expect(farmA.owedKobo).toBe(2_000_000 - 427500);
  const order = await t.run(async (ctx) => (await ctx.db.query("orders").collect())[0]!);
  expect(order).toMatchObject({ farmShareKobo: 0, recoveredKobo: 427500 });

  // A huge credit can't make Paystack send more than the order brought in
  const placed = await as(t, s.account).mutation(api.checkout.place, {
    items: [{ listingId: s.yams, unitId: s.unitId, quantity: 1, priceKobo: 300000 }],
    fulfilment: "pickup", expectedTotalKobo: 300000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  await as(t, s.farmerB).mutation(api.orders.farmer.accept, { orderId: placed.orders[0].orderId });
  await as(t, s.account).mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  const yamOrder = await t.run(async (ctx) => (await ctx.db.get(placed.orders[0].orderId))!);
  expect(yamOrder).toMatchObject({ farmShareKobo: 300000, recoveredKobo: 285000 - 300000 });
  expect(await t.run(async (ctx) => (await ctx.db.get(s.farmB))!.owedKobo)).toBe(-5_000_000 + 15000);
});

test("subaccounts: created, updated on a bank change, failures told to staff once, retried by the cron", async () => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  const calls: { url: string; method: string; body: any }[] = [];
  let fail: string | null = null;
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string; method?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init?.method ?? "GET", body });
    if (fail) return new Response(JSON.stringify({ status: false, message: fail }), { status: 400 });
    return new Response(JSON.stringify({ status: true, message: "ok", data: { subaccount_code: "ACCT_NEW" } }), { status: 200 });
  });
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.run(async (ctx) => await ctx.db.patch(s.farmA, { paystackSubaccountCode: undefined }));

  await t.action(internal.payments.subaccounts.sync, { farmId: s.farmA });
  expect(calls[0]).toMatchObject({
    method: "POST",
    body: { business_name: "Ada Greens", settlement_bank: "058", account_number: "0123456789", percentage_charge: 5, primary_contact_phone: "+2348030000009" },
  });
  expect(calls[0]!.url.endsWith("/subaccount")).toBe(true);
  let farm = await t.run(async (ctx) => (await ctx.db.get(s.farmA))!);
  expect(farm.paystackSubaccountCode).toBe("ACCT_NEW");
  expect(farm.subaccountSyncedAt).toBeDefined();

  // A new bank account updates the same subaccount
  await t.run(async (ctx) => await ctx.db.patch(s.farmA, { accountNumber: "9876543210" }));
  await t.action(internal.payments.subaccounts.sync, { farmId: s.farmA });
  expect(calls[1]).toMatchObject({ method: "PUT", body: { account_number: "9876543210" } });
  expect(calls[1]!.url.endsWith("/subaccount/ACCT_NEW")).toBe(true);

  // Paystack refuses: staff hear once, not on every retry
  fail = "Account details are invalid";
  await t.action(internal.payments.subaccounts.sync, { farmId: s.farmA });
  await t.action(internal.payments.subaccounts.sync, { farmId: s.farmA });
  farm = await t.run(async (ctx) => (await ctx.db.get(s.farmA))!);
  expect(farm.subaccountError).toBe("Account details are invalid");
  const alerts = await t.run(async (ctx) => (await ctx.db.query("notifications").collect()).filter((n) => n.kind === "subaccount_failed"));
  expect(alerts).toHaveLength(1);
  expect(alerts[0]).toMatchObject({ side: "staff", title: "Ada Greens can't be paid yet" });

  // The hourly sweep retries farms with a problem or no subaccount
  expect(await t.mutation(internal.payments.subaccounts.syncMissing, {})).toEqual({ scheduled: 1 });
  fail = null;
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  farm = await t.run(async (ctx) => (await ctx.db.get(s.farmA))!);
  expect(farm.subaccountError).toBeUndefined();
  expect(await t.mutation(internal.payments.subaccounts.syncMissing, {})).toEqual({ scheduled: 0 });

  // Without a Paystack key nothing is sent
  delete process.env.PAYSTACK_SECRET_KEY;
  calls.length = 0;
  await t.action(internal.payments.subaccounts.sync, { farmId: s.farmB });
  expect(calls).toHaveLength(0);
});

test("problems can be reported until the order closes a day after delivery; a full refund the farm isn't charged for", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const late = await paidOrder(t, s, s.guest, "delivery", 1, "g@example.com");
  await deliver(t, s, late);
  vi.advanceTimersByTime(25 * HOUR);
  await expect(guest.mutation(api.disputes.open, { orderId: late, itemIndexes: [0], note: "Soft", photoIds: [], reason: "damaged" })).rejects.toThrow(/REPORT_WINDOW_CLOSED/);
  await t.mutation(internal.orders.system.flagUnconfirmed, {});
  expect(await t.run(async (ctx) => (await ctx.db.get(late))!.status)).toBe("completed");

  // Reported in time, refunded in full; the rider was at fault, so the farm isn't charged
  const orderId = await paidOrder(t, s, s.guest, "delivery", 1, "g@example.com");
  await deliver(t, s, orderId);
  vi.advanceTimersByTime(20 * HOUR);
  const { disputeId } = await guest.mutation(api.disputes.open, { orderId, itemIndexes: [], note: "Never came", photoIds: [], reason: "not_received" });
  // An open problem keeps the order from closing
  vi.advanceTimersByTime(10 * HOUR);
  await t.mutation(internal.orders.system.flagUnconfirmed, {});
  expect(await t.run(async (ctx) => (await ctx.db.get(orderId))!.status)).toBe("disputed");
  await as(t, s.admin).mutation(api.admin.disputes.resolve, { disputeId, outcome: "refunded", note: "Refunded", reason: "Rider lost it", chargeFarm: false });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const r = await t.run(async (ctx) => ({
    order: (await ctx.db.get(orderId))!,
    refund: (await ctx.db.query("refunds").collect())[0]!,
    farm: (await ctx.db.get(s.farmA))!,
  }));
  expect(r.order).toMatchObject({ status: "cancelled", escrow: "refunded" });
  expect(r.refund).toMatchObject({ kind: "full", amountKobo: 550000, status: "processed" });
  expect(r.refund.farmDebtKobo ?? 0).toBe(0);
  expect(r.farm.owedKobo ?? 0).toBe(0);
});

test("farmer earnings: shares paid, the fee, refunds owed and paid back; the dashboard's last 30 days", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const farmer = as(t, s.farmerA);
  // Two paid orders, one refunded by Farmkeke (the farm owes its share back)
  const first = await paidOrder(t, s, s.account, "pickup", 1);
  const second = await paidOrder(t, s, s.account, "pickup", 1);
  await as(t, s.admin).mutation(api.admin.orders.cancel, { orderId: second, reason: "Farm can't supply" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  // A third order pays some of the debt back
  await paidOrder(t, s, s.account, "pickup", 1);

  const summary = (await farmer.query(api.earnings.summary, {}))!;
  // 427,500 + 427,500 shares sent; the third share was taken for the debt
  expect(summary).toMatchObject({ earnedKobo: 855000, paidOrders: 3, commissionKobo: 67500, owedKobo: 0, creditKobo: 0, recoveredKobo: 427500, paystack: "test" });
  const tx = await farmer.query(api.earnings.transactions, { paginationOpts: { numItems: 20, cursor: null } });
  expect(tx.page.map((e: any) => e.direction).sort()).toEqual(["fee", "fee", "fee", "in", "in", "in", "owed", "recovered"]);
  const dash = (await farmer.query(api.orders.farmer.dashboard, {}))!;
  expect(dash).toMatchObject({ paid30dKobo: 855000, owedKobo: 0 });
  // The farm's own view of an order shows what Paystack sent, and the fee
  const view = (await farmer.query(api.orders.farmer.get, { orderId: first }))!;
  expect(view.money).toMatchObject({ productKobo: 450000, feeKobo: 22500, recoveredKobo: 0, netKobo: 427500, final: true });
  // Another farm sees none of it
  expect(await as(t, s.farmerB).query(api.earnings.summary, {})).toMatchObject({ earnedKobo: 0, paidOrders: 0 });
});

test("a farm's order cancelled after the bill went out: the bill is re-totalled; with nothing left it closes", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const shopper = as(t, s.account);
  const admin = as(t, s.admin);
  const placed = await shopper.mutation(api.checkout.place, {
    items: [
      { listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 },
      { listingId: s.yams, unitId: s.unitId, quantity: 1, priceKobo: 300000 },
    ],
    fulfilment: "pickup", expectedTotalKobo: 750000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  const [a, b] = placed.orders;
  await as(t, s.farmerA).mutation(api.orders.farmer.accept, { orderId: a.orderId });
  await as(t, s.farmerB).mutation(api.orders.farmer.accept, { orderId: b.orderId });
  const checkout = async () => (await t.run(async (ctx) => await ctx.db.get(placed.checkoutId)))!;
  expect(await checkout()).toMatchObject({ status: "awaiting_payment", totalKobo: 750000 });

  // Farmkeke cancels farm B's order before the shopper pays: the bill drops to farm A's order
  await admin.mutation(api.admin.orders.cancel, { orderId: b.orderId, reason: "Farm B ran out" });
  expect(await checkout()).toMatchObject({ status: "awaiting_payment", totalKobo: 450000, itemsTotalKobo: 450000 });
  const changed = await t.run(async (ctx) => (await ctx.db.query("notifications").collect()).filter((n) => n.title.includes("changed")));
  expect(changed).toHaveLength(1);
  expect(changed[0]!.body).toContain("₦4,500");
  const bill = await shopper.query(api.payments.checkout.get, { checkoutId: placed.checkoutId });
  expect(bill).toMatchObject({ totalKobo: 450000 });
  await shopper.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  const after = await t.run(async (ctx) => ({ a: (await ctx.db.get(a.orderId))!, b: (await ctx.db.get(b.orderId))!, refunds: await ctx.db.query("refunds").collect() }));
  expect(after.a).toMatchObject({ escrow: "released", farmShareKobo: 427500 });
  expect(after.b).toMatchObject({ status: "cancelled", escrow: "none" });
  expect(after.refunds).toHaveLength(0);

  // Every order cancelled after the bill: the checkout closes and can't be paid
  const second = await shopper.mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
    fulfilment: "pickup", expectedTotalKobo: 450000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  await as(t, s.farmerA).mutation(api.orders.farmer.accept, { orderId: second.orders[0].orderId });
  await admin.mutation(api.admin.orders.cancel, { orderId: second.orders[0].orderId, reason: "Gone bad" });
  expect((await t.run(async (ctx) => await ctx.db.get(second.checkoutId)))!).toMatchObject({ status: "abandoned", abandonReason: "no_orders_left" });
  await expect(shopper.mutation(api.payments.checkout.markPaidTest, { checkoutId: second.checkoutId })).rejects.toThrow(/CHECKOUT_EXPIRED/);
});

test("paid on Paystack after one farm's order was cancelled: that farm's share is owed back and the shopper refunded for it", async () => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  const calls: { url: string; body: any }[] = [];
  let txAmount = 0;
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    const ok = (data: unknown) => new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
    if (url.endsWith("/split")) return ok({ split_code: "SPL_1" });
    if (url.endsWith("/transaction/initialize")) {
      txAmount = body.amount;
      return ok({ authorization_url: "https://checkout.paystack.com/x", access_code: "x", reference: body.reference });
    }
    if (url.includes("/transaction/verify/")) {
      const reference = decodeURIComponent(url.split("/transaction/verify/")[1]!);
      return ok({ reference, status: "success", amount: txAmount, currency: "NGN", channel: "card", paid_at: new Date().toISOString(), customer: { email: "x@y.z" } });
    }
    if (url.endsWith("/refund")) return ok({ id: 91, status: "pending" });
    return new Response(JSON.stringify({ status: false, message: "unexpected" }), { status: 400 });
  });
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const shopper = as(t, s.account);
  const placed = await shopper.mutation(api.checkout.place, {
    items: [
      { listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 },
      { listingId: s.yams, unitId: s.unitId, quantity: 1, priceKobo: 300000 },
    ],
    fulfilment: "pickup", expectedTotalKobo: 750000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  const [a, b] = placed.orders;
  await as(t, s.farmerA).mutation(api.orders.farmer.accept, { orderId: a.orderId });
  await as(t, s.farmerB).mutation(api.orders.farmer.accept, { orderId: b.orderId });
  // The shopper opens Paystack: the split covers both farms
  await shopper.action(api.payments.checkout.start, { checkoutId: placed.checkoutId, method: "card" });
  expect(calls.find((c) => c.url.endsWith("/split"))!.body.subaccounts).toEqual([
    { subaccount: "ACCT_A", share: 427500 },
    { subaccount: "ACCT_B", share: 285000 },
  ]);
  // Farmkeke cancels farm B's order while the payment page is open, then the shopper pays the old total
  await as(t, s.admin).mutation(api.admin.orders.cancel, { orderId: b.orderId, reason: "Farm B ran out" });
  expect(await shopper.action(api.payments.checkout.verify, { checkoutId: placed.checkoutId })).toEqual({ status: "paid", paid: true });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const r = await t.run(async (ctx) => ({
    a: (await ctx.db.get(a.orderId))!,
    b: (await ctx.db.get(b.orderId))!,
    farmB: (await ctx.db.get(s.farmB))!,
    refunds: await ctx.db.query("refunds").collect(),
    ledgerB: (await ctx.db.query("ledgerEntries").withIndex("by_orderId", (q) => q.eq("orderId", b.orderId)).collect()).map((e) => [e.kind, e.amountKobo]),
  }));
  expect(r.a).toMatchObject({ status: "accepted", escrow: "released", farmShareKobo: 427500 });
  // Farm B got its share from Paystack anyway: it owes it back; the shopper gets farm B's whole order back
  expect(r.b).toMatchObject({ status: "cancelled", escrow: "refunded", farmShareKobo: 285000 });
  expect(r.farmB.owedKobo).toBe(285000);
  expect(r.refunds).toHaveLength(1);
  expect(r.refunds[0]).toMatchObject({ orderId: b.orderId, kind: "full", amountKobo: 300000, farmDebtKobo: 285000 });
  expect(calls.find((c) => c.url.endsWith("/refund"))!.body).toMatchObject({ amount: 300000 });
  expect(r.ledgerB).toEqual([["farm_share", 285000], ["commission", 15000], ["farm_debt", 285000], ["refund", 300000]]);
});

test("approving a farm sets it up with Paystack; a saved-card payment carries the split too", async () => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  const calls: { url: string; method: string; body: any }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string; method?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init?.method ?? "GET", body });
    const ok = (data: unknown) => new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
    if (url.endsWith("/subaccount")) return ok({ subaccount_code: "ACCT_GREEN" });
    if (url.endsWith("/split")) return ok({ split_code: "SPL_9" });
    if (url.endsWith("/transaction/charge_authorization")) {
      return ok({ reference: body.reference, status: "success", amount: body.amount, currency: "NGN", channel: "card", paid_at: new Date().toISOString(),
        authorization: { authorization_code: body.authorization_code, card_type: "visa", last4: "4081", exp_month: "12", exp_year: "2030", reusable: true, signature: "SIG_1" },
        customer: { email: "ada@example.com" } });
    }
    // Emails and texts: accepted, not checked here
    return new Response(JSON.stringify({ id: "x" }), { status: 200 });
  });
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const app = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Bola Ade", email: "bola@example.com" });
    const appId = await ctx.db.insert("farmerApplications", {
      userId: id, status: "submitted", reference: "FA-10001", farmName: "Green Acres", nin: "12345678901", phone: "+2348030000044", state: "Imo", lga: "Owerri North",
      address: "12 Ring Road", farmSize: "1_to_5", farmType: "crops", categoryIds: [await ctx.db.insert("categories", { name: "Vegetables", slug: "veg", illustration: "veg", sortOrder: 1, hidden: false })],
      mainCrops: "Peppers", seasons: ["all_year"], collectionAddress: "12 Ring Road", collectionHours: hours, leadTimeHours: 4,
      bankCode: "058", bankName: "GTBank", accountNumber: "0123456780", accountName: "Bola Ade", submittedAt: Date.now(),
    } as any);
    for (const kind of ["government_id", "farm_photo", "farm_photo", "farm_photo", "proof_of_address", "association_letter"] as const) {
      const storageId = await ctx.storage.store(new Blob(["x"]));
      await ctx.db.insert("farmerDocuments", { userId: id, applicationId: appId, kind, storageId, status: "pending" });
    }
    return { id, appId };
  });
  await as(t, s.admin).mutation(api.admin.farmerRequests.approve, { applicationId: app.appId, reason: "All checks passed" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const farm = await t.run(async (ctx) => await ctx.db.query("farms").withIndex("by_userId", (q) => q.eq("userId", app.id)).unique());
  expect(farm).toMatchObject({ name: "Green Acres", paystackSubaccountCode: "ACCT_GREEN" });
  expect(calls.find((c) => c.url.endsWith("/subaccount"))).toMatchObject({ method: "POST", body: { business_name: "Green Acres", settlement_bank: "058", account_number: "0123456780" } });

  // A saved card: charge_authorization with the same split_code, paid at once
  const cardId = await t.run(async (ctx) =>
    await ctx.db.insert("savedCards", { userId: s.account.id, authorizationCode: "AUTH_SAVED", email: "ada@example.com", brand: "visa", last4: "4081", expMonth: "12", expYear: "2030" }),
  );
  const shopper = as(t, s.account);
  const placed = await shopper.mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
    fulfilment: "pickup", expectedTotalKobo: 450000, contact: { name: "Ada Obi", phone: "08031112222" },
  });
  await as(t, s.farmerA).mutation(api.orders.farmer.accept, { orderId: placed.orders[0].orderId });
  await shopper.action(api.payments.checkout.start, { checkoutId: placed.checkoutId, method: "saved_card", savedCardId: cardId });
  expect(calls.find((c) => c.url.endsWith("/transaction/charge_authorization"))!.body).toMatchObject({
    amount: 450000, authorization_code: "AUTH_SAVED", split_code: "SPL_9",
  });
  expect(await t.run(async (ctx) => (await ctx.db.get(placed.orders[0].orderId))!)).toMatchObject({ escrow: "released", farmShareKobo: 427500 });
});

test("the report window: still open just before a day after delivery, closed just after; pickup can't be marked arrived", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const report = (orderId: any) => guest.mutation(api.disputes.open, { orderId, itemIndexes: [0], note: "Soft", photoIds: [], reason: "damaged" });
  const late = await paidOrder(t, s, s.guest, "pickup", 1, "g@example.com");
  await deliver(t, s, late);
  await expect(guest.mutation(api.orders.consumer.markArrived, { orderId: late })).rejects.toThrow(/NOT_OUT_FOR_DELIVERY/);
  vi.advanceTimersByTime(24 * HOUR + 60_000);
  await expect(report(late)).rejects.toThrow(/REPORT_WINDOW_CLOSED/);

  const inTime = await paidOrder(t, s, s.guest, "pickup", 1, "g@example.com");
  await deliver(t, s, inTime);
  vi.advanceTimersByTime(24 * HOUR - 60_000);
  const view = (await guest.query(api.orders.consumer.get, { orderId: inTime }))!;
  expect(view.canReport).toBe(true);
  expect(view.reportBy! - Date.now()).toBe(60_000);
  await report(inTime);
  expect((await t.run(async (ctx) => (await ctx.db.get(inTime))!)).status).toBe("disputed");
});
