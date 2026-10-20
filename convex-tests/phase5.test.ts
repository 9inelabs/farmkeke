// Phase 5 gaps: the rider note, partial-quantity
// problem amounts and the farm's stance, guest orders linked by email only,
// back in stock + Notify me, per-item ratings, the reset link's returnTo, and
// the smaller read additions. Resend is mocked (fetch).
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { resetLink } from "../convex/lib/passwordProvider";
import schema from "../convex/schema";
import { modules } from "./modules";
import { billDelivery, deliver, payTest, placeDelivery, type DeliveryOpts } from "./orderFlow";
import { grantStaff } from "./staff";

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.WEBSITE_URL;
  process.env.AUTH_RESEND_KEY = "re_test";
  process.env.CONVEX_SITE_URL = "https://happy-otter-123.convex.site";
});
afterEach(() => {
  delete process.env.AUTH_RESEND_KEY;
  delete process.env.CONVEX_SITE_URL;
  delete process.env.SITE_URL;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));
type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
type Mail = { to: string[]; subject: string; html: string; text: string };

function mailbox() {
  const sent: Mail[] = [];
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    if (String(url).includes("resend")) sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "x", data: [] }));
  });
  return { sent, to: (a: string) => sent.filter((m) => m.to[0] === a) };
}

const flush = (t: T) => t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1));
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = async (fields: Record<string, unknown>) => {
      const id = await ctx.db.insert("users", fields as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      if (typeof fields.staffRole === "string") await grantStaff(ctx, { id, sessionId }, fields.staffRole);
      return { id, sessionId };
    };
    const guest = await user({ isAnonymous: true });
    const guest2 = await user({ isAnonymous: true });
    const account = await user({ name: "Ada Obi", email: "ada@example.com", phone: "+2348031112222" });
    await ctx.db.insert("authAccounts", { userId: account.id, provider: "password", providerAccountId: "ada@example.com" } as any);
    const farmerA = await user({ name: "Musa Bello", email: "a@example.com", phone: "+2348030000001" });
    const admin = await user({ name: "Sam Admin", email: "sam@example.com", staffRole: "super_admin" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, active: true, sortOrder: 1 });
    const pointId = await ctx.db.insert("pickupPoints", {
      name: "Ikenegbu Point", address: "Douglas Rd", state: "Imo", lga: "Owerri Municipal", latitude: 5.48, longitude: 7.03,
      // Closed on Sundays
      hours: hours.filter((h) => h.day !== 0), phone: "+2348035550144", collectWithinDays: 3, active: true,
    });
    const appId = await ctx.db.insert("farmerApplications", { userId: farmerA.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farmA = await ctx.db.insert("farms", {
      userId: farmerA.id, applicationId: appId, name: "Ada Greens", phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
      farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
      openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
      accountName: "Ada Greens", status: "active", trusted: true,
    });
    const tomatoes = await ctx.db.insert("listings", {
      farmId: farmA, status: "live", name: "Tomatoes", photoIds: [],
      units: [{ unitId, priceKobo: 450000, stock: 50, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now(),
    });
    return { guest, guest2, account, farmerA, admin, unitId, areaId, pointId, farmA, tomatoes };
  });
}
type S = Awaited<ReturnType<typeof seed>>;

/** A delivery order (unpaid until its bill), or one already billed and paid. */
const place = (t: T, s: S, who: U, opts: DeliveryOpts = {}) => placeDelivery(t, s, who, opts);

async function paid(t: T, s: S, who: U, opts: DeliveryOpts = {}) {
  const placed = await placeDelivery(t, s, who, opts);
  for (const o of placed.orders) await billDelivery(t, s, o.orderId);
  await payTest(t, who, placed.checkoutId);
  return placed;
}

const delivered = (t: T, s: S, orderId: any) => deliver(t, s, orderId, { packed: true });

test("the rider note reaches the farm, dispatch and the confirmation page", async () => {
  process.env.PAYMENTS_TEST_STEP = "true";
  const t = convexTest(schema, modules);
  const s = await seed(t);
  mailbox();
  const placed = await paid(t, s, s.guest, { note: "Blue gate. Call when you arrive." });
  const orderId = placed.orders[0].orderId;
  const farm = await as(t, s.farmerA).query(api.orders.farmer.get, { orderId });
  expect(farm.address.note).toBe("Blue gate. Call when you arrive.");
  const farmer = as(t, s.farmerA);
  await farmer.mutation(api.orders.farmer.startPreparing, { orderId });
  await farmer.mutation(api.orders.farmer.markPacked, { orderId });
  await farmer.mutation(api.orders.farmer.readyForRider, { orderId });
  const board = await as(t, s.admin).query(api.admin.dispatch.board, { now: Date.now() });
  const row = Object.values(board).flat().find((r: any) => r?.orderId === orderId) as any;
  expect(row?.dropOff.note).toBe("Blue gate. Call when you arrive.");
  const summary = await as(t, s.guest).query(api.orders.consumer.placedSummary, { checkoutId: placed.checkoutId });
  expect(summary.address).toMatchObject({ street: "53b Nob Oluwa", areaName: "New Owerri", note: "Blue gate. Call when you arrive." });
  expect(summary.pickupPoint).toBeNull();
  await expect(place(t, s, s.guest2, { note: "x".repeat(201) })).rejects.toThrow(/NOTE_TOO_LONG/);
  delete process.env.PAYMENTS_TEST_STEP;
});

test("problem reports: partial quantities set the amount (never the delivery fee); the farm's stance shows", async () => {
  process.env.PAYMENTS_TEST_STEP = "true";
  const t = convexTest(schema, modules);
  const s = await seed(t);
  mailbox();
  const placed = await paid(t, s, s.guest, { quantity: 2 });
  const orderId = placed.orders[0].orderId;
  await delivered(t, s, orderId);
  const shopper = as(t, s.guest);
  await expect(
    shopper.mutation(api.disputes.open, { orderId, reason: "short", itemIndexes: [0], itemQuantities: [3], note: "One basket short", photoIds: [] }),
  ).rejects.toThrow(/INVALID_QUANTITY/);
  const { disputeId } = await shopper.mutation(api.disputes.open, {
    orderId, reason: "short", itemIndexes: [0], itemQuantities: [1], note: "One basket short", photoIds: [],
  });
  const view = await shopper.query(api.disputes.get, { disputeId });
  // 1 of 2 baskets at ₦4,500, no ₦1,000 delivery fee
  expect(view.amountKobo).toBe(450000);
  expect(view.reasonLabel).toBe("Less than I ordered");
  expect(view.items[0]).toMatchObject({ quantity: 2, affectedQuantity: 1, affectedUnitLabel: "basket", affectedKobo: 450000 });

  await as(t, s.farmerA).mutation(api.disputes.respond, { disputeId, note: "Sorry, we packed one short.", photoIds: [], stance: "agrees" });
  const farmView = await as(t, s.farmerA).query(api.disputes.forFarmOrder, { orderId });
  expect(farmView.farmResponse).toMatchObject({ stance: "agrees", stanceLabel: "Agrees to refund" });
  const again = await shopper.query(api.disputes.get, { disputeId });
  expect(again.farmResponse.stanceLabel).toBe("Agrees to refund");
  const url = await shopper.mutation(api.disputes.generateUploadUrl, {});
  expect(typeof url).toBe("string");
  delete process.env.PAYMENTS_TEST_STEP;
});

test("guest orders are linked by the account's email only, after the emailed link", async () => {
  process.env.PAYMENTS_TEST_STEP = "true";
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const mail = mailbox();
  // Guest 1 used the account's email; guest 2 used the account's phone but another email
  const byEmail = await paid(t, s, s.guest, { email: "ADA@example.com" });
  const byPhone = await paid(t, s, s.guest2, { phone: "08031112222", email: "someone@else.com" });
  await flush(t);
  mail.sent.length = 0;

  const account = as(t, s.account);
  expect(await account.query(api.orders.consumer.linkableGuestOrders, {})).toMatchObject({ count: 1, verified: false });
  const started = await account.mutation(api.orders.consumer.linkGuestOrdersByEmail, {});
  expect(started).toMatchObject({ status: "email_sent", count: 1 });
  // Nothing moves until the link is opened
  expect((await account.query(api.orders.consumer.list, {})).length).toBe(0);
  await flush(t);
  const email = mail.to("ada@example.com").find((m) => m.subject === "Add your guest order to your account")!;
  const token = /link=([0-9a-f]+)/.exec(email.text)![1]!;
  await expect(account.mutation(api.orders.consumer.confirmGuestOrdersLink, { token: "f".repeat(48) })).rejects.toThrow(/INVALID_TOKEN/);
  expect(await account.mutation(api.orders.consumer.confirmGuestOrdersLink, { token })).toEqual({ linked: 1 });

  const mine = await account.query(api.orders.consumer.list, {});
  expect(mine.map((o: any) => o._id)).toEqual([byEmail.orders[0].orderId]);
  // The phone-matched order stays with its guest
  const other = await as(t, s.guest2).query(api.orders.consumer.get, { orderId: byPhone.orders[0].orderId });
  expect(other).not.toBeNull();
  // Now verified: a later guest order with the email links straight away
  const later = await paid(t, s, s.guest2, { email: "ada@example.com" });
  expect(await account.mutation(api.orders.consumer.linkGuestOrdersByEmail, {})).toMatchObject({ status: "linked", linked: 1 });
  expect((await account.query(api.orders.consumer.list, {})).map((o: any) => o._id)).toContain(later.orders[0].orderId);
  delete process.env.PAYMENTS_TEST_STEP;
});

test("back in stock: the tag, and Notify me emails once", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const mail = mailbox();
  const account = as(t, s.account);
  const farmer = as(t, s.farmerA);
  await account.mutation(api.favorites.toggle, { listingId: s.tomatoes });
  await farmer.mutation(api.listings.quickUpdate, { listingId: s.tomatoes, units: [{ unitId: s.unitId, priceKobo: 450000, stock: 0 }] });
  let saved = await account.query(api.favorites.list, {});
  expect(saved[0]).toMatchObject({ available: false, unavailableReason: "sold_out", backInStock: false, notify: false });
  expect(await account.mutation(api.favorites.setNotify, { listingId: s.tomatoes, on: true })).toMatchObject({ notify: true });
  await flush(t);

  vi.advanceTimersByTime(60_000);
  await farmer.mutation(api.listings.quickUpdate, { listingId: s.tomatoes, units: [{ unitId: s.unitId, priceKobo: 450000, stock: 8 }] });
  await flush(t);
  expect(mail.to("ada@example.com").map((m) => m.subject)).toEqual(["Tomatoes is back in stock"]);
  saved = await account.query(api.favorites.list, {});
  expect(saved[0]).toMatchObject({ available: true, backInStock: true, notify: false });

  // Seen: the tag goes; selling out and back again doesn't email (Notify me was used up)
  vi.advanceTimersByTime(1000);
  await account.mutation(api.favorites.markSeen, {});
  expect((await account.query(api.favorites.list, {}))[0].backInStock).toBe(false);
  await farmer.mutation(api.listings.quickUpdate, { listingId: s.tomatoes, units: [{ unitId: s.unitId, priceKobo: 450000, stock: 0 }] });
  await farmer.mutation(api.listings.quickUpdate, { listingId: s.tomatoes, units: [{ unitId: s.unitId, priceKobo: 450000, stock: 5 }] });
  await flush(t);
  expect(mail.to("ada@example.com").length).toBe(1);
});

test("reviews keep per-item ratings", async () => {
  process.env.PAYMENTS_TEST_STEP = "true";
  const t = convexTest(schema, modules);
  const s = await seed(t);
  mailbox();
  const placed = await paid(t, s, s.guest);
  const orderId = placed.orders[0].orderId;
  await delivered(t, s, orderId);
  const shopper = as(t, s.guest);
  await shopper.mutation(api.orders.consumer.confirmReceipt, { orderId });
  await expect(
    shopper.mutation(api.reviews.submit, { orderId, rating: 5, tags: [], itemRatings: [{ index: 3, rating: 4 }] }),
  ).rejects.toThrow(/INVALID_ITEM/);
  await shopper.mutation(api.reviews.submit, { orderId, rating: 5, tags: ["Fresh"], itemRatings: [{ index: 0, rating: 4 }] });
  const r = await shopper.query(api.reviews.forOrder, { orderId });
  expect(r.review.itemRatings).toEqual([{ index: 0, rating: 4 }]);
  delete process.env.PAYMENTS_TEST_STEP;
});

test("reset link: the website's page for returnTo web, the app bridge otherwise; the bridge falls back to the website", async () => {
  expect(resetLink("ada@example.com", "abc", "web")).toBe("https://farmkeke.com/reset-password?email=ada%40example.com&code=abc");
  process.env.WEBSITE_URL = "https://staging.farmkeke.com/";
  expect(resetLink("ada@example.com", "abc", "web")).toBe("https://staging.farmkeke.com/reset-password?email=ada%40example.com&code=abc");
  expect(resetLink("ada@example.com", "abc", "app")).toBe("https://happy-otter-123.convex.site/reset-password?email=ada%40example.com&code=abc");

  // Through the real reset flow
  process.env.SITE_URL = "http://localhost:3000";
  const t = convexTest(schema, modules);
  await seed(t);
  const mail = mailbox();
  await t.action(api.auth.signIn, { provider: "password", params: { flow: "reset", email: "ada@example.com", returnTo: "web" } });
  await t.action(api.auth.signIn, { provider: "password", params: { flow: "reset", email: "ada@example.com" } });
  const [web, app] = mail.to("ada@example.com");
  expect(web!.text).toContain("https://staging.farmkeke.com/reset-password?email=ada%40example.com&code=");
  expect(app!.text).toContain("https://happy-otter-123.convex.site/reset-password?email=ada%40example.com&code=");

  const page = await (await t.fetch("/reset-password?email=ada%40example.com&code=abc", { method: "GET" })).text();
  expect(page).toContain("farmkeke://reset-password?email=ada%40example.com&code=abc");
  expect(page).toContain("https://staging.farmkeke.com/reset-password?email=ada%40example.com&code=abc");
  expect(page).toContain("1500");
});

test("reads: quote response times, per-point ready day, card and start time, recent items, reply note, subtypes, support about", async () => {
  process.env.PAYMENTS_TEST_STEP = "true";
  const t = convexTest(schema, modules);
  const s = await seed(t);
  mailbox();
  const shopper = as(t, s.guest);
  const items = [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1 }];
  const quote = await shopper.query(api.checkout.quote, { items });
  expect(quote.farms[0]).toMatchObject({ responseTimeHours: null, acceptsWithinHours: 24 });

  const placed = await paid(t, s, s.guest);
  const pay = await shopper.query(api.payments.checkout.get, { checkoutId: placed.checkoutId });
  expect(typeof pay.lastAttempt.startedAt).toBe("number");
  expect(pay.lastAttempt.cardLast4).toBeNull();

  const recent = await shopper.query(api.orders.consumer.recentItems, {});
  expect(recent).toMatchObject([{ listingId: s.tomatoes, name: "Tomatoes", farmName: "Ada Greens", unitSingular: "basket" }]);

  // Chat: shopper writes, farm answers 30 minutes later
  const orderId = placed.orders[0].orderId;
  await shopper.mutation(api.chat.send, { orderId, body: "Hello", photoIds: [] });
  expect((await shopper.query(api.chat.thread, { orderId })).replyNote).toBeNull();
  vi.advanceTimersByTime(30 * 60_000);
  await as(t, s.farmerA).mutation(api.chat.send, { orderId, body: "Hi!", photoIds: [] });
  expect(await shopper.query(api.chat.thread, { orderId })).toMatchObject({ replyNote: "Usually replies within an hour", replyTimeMinutes: 30 });

  // Subtypes (several at once)
  const catId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("categories", {
      slug: "veg", name: "Vegetables", illustration: "veg", sortOrder: 1, hidden: false,
      subtypes: [{ slug: "tomatoes", name: "Tomatoes" }, { slug: "peppers", name: "Peppers" }, { slug: "greens", name: "Greens" }],
    });
    await ctx.db.patch("listings", s.tomatoes, { categoryId: id, subtype: "tomatoes" });
    await ctx.db.insert("listings", { farmId: s.farmA, status: "live", name: "Pepper", categoryId: id, subtype: "peppers", photoIds: [], units: [{ unitId: s.unitId, priceKobo: 100000, stock: 5, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    await ctx.db.insert("listings", { farmId: s.farmA, status: "live", name: "Ugu", categoryId: id, subtype: "greens", photoIds: [], units: [{ unitId: s.unitId, priceKobo: 100000, stock: 5, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    return id;
  });
  expect(catId).toBeTruthy();
  const two = await shopper.query(api.storefront.categoryListings, { slug: "veg", subtypes: ["tomatoes", "peppers"] });
  expect(two.items.map((i: any) => i.name).sort()).toEqual(["Pepper", "Tomatoes"]);
  const one = await shopper.query(api.storefront.categoryListings, { slug: "veg", subtype: "greens" });
  expect(one.items.map((i: any) => i.name)).toEqual(["Ugu"]);

  // Support ticket about a product
  const ticket = await shopper.mutation(api.support.open, {
    body: "Are these tomatoes organic?", photoIds: [], side: "shop", listingId: s.tomatoes, farmId: s.farmA,
  });
  const row = await t.run(async (ctx) => await ctx.db.get("supportTickets", ticket.ticketId));
  expect(row).toMatchObject({ listingId: s.tomatoes, farmId: s.farmA });
  delete process.env.PAYMENTS_TEST_STEP;
});

test("profile phone: validated, and a farmer's number can't be taken", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const account = as(t, s.account);
  await expect(account.mutation(api.account.updateProfile, { name: "Ada Obi", phone: "12345" })).rejects.toThrow(/INVALID_PHONE/);
  await expect(account.mutation(api.account.updateProfile, { name: "Ada Obi", phone: "0803 000 0001" })).rejects.toThrow(/PHONE_TAKEN/);
  await account.mutation(api.account.updateProfile, { name: "Ada Obi", phone: "0809 123 4567" });
  const me = await t.run(async (ctx) => await ctx.db.get("users", s.account.id));
  expect(me!.phone).toBe("+2348091234567");
  // Name-only (the app's call) leaves the phone alone
  await account.mutation(api.account.updateProfile, { name: "Ada O." });
  expect((await t.run(async (ctx) => await ctx.db.get("users", s.account.id)))!.phone).toBe("+2348091234567");
});
