// Phase 3b flows: chat permissions, dispute with part refund, reviews and
// stats, notification preferences, guest support ticket, account deletion
// waiting for orders. Runs against the repo's convex/ code.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { deliver, handOver, paidOrder } from "./orderFlow";
import { grantStaff } from "./staff";

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.AUTH_RESEND_KEY;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));
type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };

async function seed(t: T) {
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
    const support = await user({ name: "Sue Support", email: "sue@example.com", staffRole: "support" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, active: true, sortOrder: 1 });
    const pointId = await ctx.db.insert("pickupPoints", { name: "Point", address: "Douglas Rd", state: "Imo", lga: "Owerri Municipal", latitude: 5.48, longitude: 7.03, hours, phone: "+2348035550144", collectWithinDays: 2, active: true });
    const appId = await ctx.db.insert("farmerApplications", { userId: farmerA.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farm = async (userId: any, name: string) =>
      await ctx.db.insert("farms", {
        userId, applicationId: appId, name, phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
        farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
        openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
        accountName: name, status: "active", trusted: true,
      });
    const farmA = await farm(farmerA.id, "Ada Greens");
    const farmB = await farm(farmerB.id, "Okafor Farms");
    const tomatoes = await ctx.db.insert("listings", { farmId: farmA, status: "live", name: "Tomatoes", photoIds: [], units: [{ unitId, priceKobo: 450000, stock: 50, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    return { guest, account, farmerA, farmerB, admin, support, unitId, areaId, pointId, farmA, farmB, tomatoes };
  });
}

const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

const page = { cursor: null, numItems: 50 };

test("chat: only the shopper and the farm, unread counts, throttle", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.guest, "pickup");
  const guest = as(t, s.guest);
  const farmer = as(t, s.farmerA);

  await guest.mutation(api.chat.send, { orderId, body: "Are these fresh?", photoIds: [] });
  expect(await farmer.query(api.chat.unread, { side: "farm" })).toBe(1);
  const thread = await farmer.query(api.chat.thread, { orderId });
  expect(thread).toMatchObject({ side: "farm", canSend: true, unread: 1, counterpart: { name: "Chidi" } });
  await farmer.mutation(api.chat.send, { orderId, body: "Picked this morning", photoIds: [] });
  expect(await farmer.query(api.chat.unread, { side: "farm" })).toBe(0);
  expect(await guest.query(api.chat.unread, { side: "shop" })).toBe(1);
  const msgs = await guest.query(api.chat.messages, { orderId, paginationOpts: page });
  expect(msgs.page.map((m: any) => [m.body, m.mine])).toEqual([["Picked this morning", false], ["Are these fresh?", true]]);
  await guest.mutation(api.chat.markRead, { orderId });
  expect(await guest.query(api.chat.unread, { side: "shop" })).toBe(0);
  expect((await guest.query(api.chat.listMine, { paginationOpts: page })).page[0]).toMatchObject({ name: "Ada Greens", unread: 0 });
  expect((await farmer.query(api.chat.listForFarm, { paginationOpts: page })).page).toHaveLength(1);

  // Not a party: another farm, another shopper, a farm posing as the shop side
  for (const outsider of [as(t, s.farmerB), as(t, s.account)]) {
    expect(await outsider.query(api.chat.thread, { orderId })).toBeNull();
    expect((await outsider.query(api.chat.messages, { orderId, paginationOpts: page })).page).toEqual([]);
    await expect(outsider.mutation(api.chat.send, { orderId, body: "hi", photoIds: [] })).rejects.toThrow(/NOT_FOUND/);
  }
  await expect(farmer.mutation(api.chat.send, { orderId, body: "hi", photoIds: [], side: "shop" })).rejects.toThrow(/NOT_FOUND/);
  // Staff can read it (A-51)
  expect((await as(t, s.support).query(api.admin.chat.messages, { orderId, paginationOpts: page })).page).toHaveLength(2);
  await expect(guest.query(api.admin.chat.get, { orderId })).rejects.toThrow(/FORBIDDEN|ACCOUNT_REQUIRED/);

  // Throttle: 20 a minute
  for (let i = 0; i < 19; i++) await guest.mutation(api.chat.send, { orderId, body: `m${i}`, photoIds: [] });
  await expect(guest.mutation(api.chat.send, { orderId, body: "one too many", photoIds: [] })).rejects.toThrow(/RATE_LIMITED/);
  vi.advanceTimersByTime(61_000);
  await guest.mutation(api.chat.send, { orderId, body: "after a minute", photoIds: [] });

  // One nudge per burst: the farm gets a single chat alert
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const alerts = await t.run(async (ctx) => (await ctx.db.query("notifications").collect()).filter((n) => n.kind === "chat_message"));
  expect(alerts.length).toBeGreaterThanOrEqual(1);
  expect(alerts.filter((n) => n.side === "farm").length).toBe(1);
});

test("dispute: open before confirm, money held, split resolves with a part refund excluding delivery", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.guest, "delivery", 2);
  const guest = as(t, s.guest);
  await expect(guest.mutation(api.disputes.open, { orderId, itemIndexes: [0], note: "Soft", photoIds: [], reason: "damaged" })).rejects.toThrow(/NOT_DELIVERED_YET/);
  await deliver(t, s, orderId);

  // Only the device that ordered can report
  await expect(as(t, s.account).mutation(api.disputes.open, { orderId, itemIndexes: [0], note: "x", photoIds: [], reason: "damaged" })).rejects.toThrow(/NOT_FOUND/);
  const { disputeId, number } = await guest.mutation(api.disputes.open, { orderId, itemIndexes: [0], note: "One basket was soft", photoIds: [], reason: "damaged" });
  expect(number).toBe("DSP-1001");
  await expect(guest.mutation(api.disputes.open, { orderId, itemIndexes: [0], note: "again", photoIds: [], reason: "damaged" })).rejects.toThrow(/ALREADY_REPORTED/);
  await expect(guest.mutation(api.orders.consumer.confirmReceipt, { orderId })).rejects.toThrow();

  const view = await guest.query(api.disputes.forOrder, { orderId });
  expect(view).toMatchObject({ status: "open", amountKobo: 900000, heldKobo: 1000000, reasonLabel: "Damaged or spoiled" });
  expect(Math.round((view!.farmReplyBy - view!.reportedAt) / 1000)).toBe(12 * 3600);

  const farmer = as(t, s.farmerA);
  expect(await as(t, s.farmerB).query(api.disputes.forFarmOrder, { orderId })).toBeNull();
  await farmer.mutation(api.disputes.respond, { disputeId, note: "Happy to refund one basket", photoIds: [] });
  await expect(farmer.mutation(api.disputes.respond, { disputeId, note: "again", photoIds: [] })).rejects.toThrow(/ALREADY_RESPONDED/);
  await guest.mutation(api.disputes.sendMessage, { as: "consumer", disputeId, body: "Thanks", photoIds: [] });
  await expect(guest.mutation(api.disputes.sendMessage, { as: "farmer", disputeId, body: "x", photoIds: [] })).rejects.toThrow(/NOT_FOUND/);
  const support = as(t, s.support);
  await support.mutation(api.admin.disputes.sendMessage, { audience: "farmer", disputeId, body: "Farm only note", photoIds: [] });
  await support.mutation(api.admin.disputes.addNote, { disputeId, body: "Internal" });
  await support.mutation(api.admin.disputes.assign, { disputeId, assigneeId: s.support.id });
  const shopSees = (await guest.query(api.disputes.get, { disputeId }))!.messages.map((m: any) => m.body);
  expect(shopSees).toEqual(["One basket was soft", "Happy to refund one basket", "Thanks"]);
  expect((await farmer.query(api.disputes.get, { disputeId }))!.messages).toHaveLength(4);
  expect((await support.query(api.admin.disputes.list, { paginationOpts: page, status: "farmer_responded" })).page).toHaveLength(1);

  // Amounts must add up to the product total; the delivery fee is never in a part refund
  await expect(support.mutation(api.admin.disputes.resolve, { disputeId, outcome: "split", refundKobo: 450000, releaseKobo: 550000, note: "n", reason: "r" })).rejects.toThrow(/AMOUNTS_DONT_ADD_UP/);
  await expect(support.mutation(api.admin.disputes.resolve, { disputeId, outcome: "split", refundKobo: 450000, note: "n", reason: "  " })).rejects.toThrow();
  await support.mutation(api.admin.disputes.resolve, { disputeId, outcome: "split", refundKobo: 450000, note: "One basket refunded", reason: "Photos show damage" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);

  const r = await t.run(async (ctx) => ({
    order: (await ctx.db.get(orderId))!,
    dispute: (await ctx.db.get(disputeId))!,
    refunds: await ctx.db.query("refunds").collect(),
    ledger: await ctx.db.query("ledgerEntries").withIndex("by_orderId", (q) => q.eq("orderId", orderId)).collect(),
    payouts: await ctx.db.query("payouts").collect(),
    audit: await ctx.db.query("auditLog").collect(),
  }));
  expect(r.order).toMatchObject({ status: "completed", escrow: "split" });
  expect(r.dispute).toMatchObject({ status: "resolved", outcome: "split", refundKobo: 450000, releaseKobo: 450000 });
  expect(r.refunds).toHaveLength(1);
  expect(r.refunds[0]).toMatchObject({ kind: "part", amountKobo: 450000, status: "processed", disputeId });
  const sum = (kind: string) => r.ledger.filter((e) => e.kind === kind).reduce((a, e) => a + e.amountKobo, 0);
  expect(sum("refund")).toBe(450000);
  expect(sum("release")).toBe(450000 - 22500);
  expect(sum("commission")).toBe(22500);
  expect(sum("delivery_fee")).toBe(100000);
  expect(r.payouts[0]).toMatchObject({ amountKobo: 427500, status: "sent" });
  expect(r.audit.find((a) => a.action === "dispute.resolve")).toMatchObject({ reason: "Photos show damage" });
  expect((await guest.query(api.disputes.mine, {}))[0]).toMatchObject({ status: "resolved", outcome: "split" });
});

test("reviews: once per completed order, stats kept per farm", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const account = as(t, s.account);
  const first = await paidOrder(t, s, s.account, "pickup", 1);
  await expect(account.mutation(api.reviews.submit, { orderId: first, rating: 5, tags: [] })).rejects.toThrow(/NOT_COMPLETED/);
  await deliver(t, s, first);
  await account.mutation(api.orders.consumer.confirmReceipt, { orderId: first });
  expect(await account.query(api.reviews.forOrder, { orderId: first })).toMatchObject({ canReview: true, review: null });
  await expect(account.mutation(api.reviews.submit, { orderId: first, rating: 6, tags: [] })).rejects.toThrow(/INVALID_RATING/);
  await expect(as(t, s.guest).mutation(api.reviews.submit, { orderId: first, rating: 5, tags: [] })).rejects.toThrow(/NOT_FOUND/);
  await account.mutation(api.reviews.submit, { orderId: first, rating: 5, tags: ["Fresh", "Fresh", "On time"], comment: " Lovely " });
  await expect(account.mutation(api.reviews.submit, { orderId: first, rating: 4, tags: [] })).rejects.toThrow(/ALREADY_REVIEWED/);

  const second = await paidOrder(t, s, s.account, "pickup", 1);
  await deliver(t, s, second);
  await account.mutation(api.orders.consumer.confirmReceipt, { orderId: second });
  await account.mutation(api.reviews.submit, { orderId: second, rating: 2, tags: [] });

  expect(await t.query(api.reviews.summary, { farmId: s.farmA })).toEqual({ average: 3.5, count: 2, stars: [0, 1, 0, 0, 1] });
  expect(await t.query(api.reviews.summary, { farmId: s.farmB })).toEqual({ average: null, count: 0, stars: [0, 0, 0, 0, 0] });
  const pub = await t.query(api.reviews.listPublic, { farmId: s.farmA, paginationOpts: page });
  expect(pub.page[1]).toMatchObject({ rating: 5, tags: ["Fresh", "On time"], comment: "Lovely", reviewerName: "Ada O." });
  const farmer = as(t, s.farmerA);
  expect(await farmer.query(api.reviews.mySummary, {})).toMatchObject({ count: 2 });
  expect((await farmer.query(api.reviews.listMine, { paginationOpts: page, stars: 2 })).page).toHaveLength(1);
  expect(await account.query(api.reviews.forOrder, { orderId: first })).toMatchObject({ canReview: false, review: { rating: 5 } });
});

test("notifications: preferences decide push, SMS and email; delivery uses Expo and Resend", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const account = as(t, s.account);
  const token = "ExponentPushToken[abc123]";
  await account.mutation(api.notifications.registerPushToken, { platform: "android", token });
  await expect(account.mutation(api.notifications.registerPushToken, { platform: "android", token: "nope" })).rejects.toThrow(/INVALID_TOKEN/);
  await expect(account.mutation(api.notifications.setPreference, { side: "shop", alert: "payments", on: false })).rejects.toThrow(/ALERT_LOCKED/);
  await expect(account.mutation(api.notifications.setPreference, { side: "shop", alert: "nope", on: false })).rejects.toThrow(/UNKNOWN_ALERT/);

  const orderId = await paidOrder(t, s, s.account, "pickup", 1);
  const make = (kind: string) =>
    t.mutation(internal.notifications.store.create, { userId: s.account.id, side: "shop", kind, title: "T", body: "B", href: "/x", orderId, smsTo: "+2348031112222" });
  const plan = async (kind: string) => await t.query(internal.notifications.store.plan, { notificationId: await make(kind) });

  // Defaults: push on (so no SMS for an account with push), email for order emails
  let p = (await plan("order_accepted"))!;
  expect(p.push).toHaveLength(1);
  expect(p.push[0]).toMatchObject({ to: token, data: { kind: "order_accepted", side: "shop" } });
  expect(p.sms).toBeNull();
  expect(p.email).toMatchObject({ to: "ada@example.com", subject: "Ada Greens accepted order FK-10001" });
  expect(p.email!.html).toContain("https://farmkeke.com/brand/wordmark.png");

  // Push off for order updates: SMS steps in
  await account.mutation(api.notifications.setPreference, { side: "shop", alert: "order_updates", channel: "push", on: false });
  p = (await plan("order_accepted"))!;
  expect(p.push).toHaveLength(0);
  // No text fallback for order updates: only lib/alerts SMS_KINDS are texted (cost)
  expect(p.sms).toBeNull();
  expect((await plan("ready_for_pickup"))!.sms).toMatchObject({ to: "+2348031112222" });
  // The whole alert off: nothing at all
  await account.mutation(api.notifications.setPreference, { side: "shop", alert: "order_updates", on: false });
  p = (await plan("order_accepted"))!;
  expect(p).toEqual({ push: [], sms: null, email: null, staleTokenIds: [] });
  const prefs = (await account.query(api.notifications.preferences, { side: "shop" }))!;
  expect(prefs.alerts.find((a: any) => a.alert === "order_updates")).toMatchObject({ push: false, sms: false, email: false });
  expect(prefs.alerts.find((a: any) => a.alert === "payments")).toMatchObject({ locked: true, push: true });
  // Locked payments alerts still go out; reminders default to no SMS
  expect((await plan("refund_issued"))!.push).toHaveLength(1);

  // Guests: always SMS, and no email without one
  const g = (await t.query(internal.notifications.store.plan, {
    notificationId: await t.mutation(internal.notifications.store.create, { userId: s.guest.id, side: "shop", kind: "order_accepted", title: "T", body: "B", href: "/x", smsTo: "+2348030000000" }),
  }))!;
  // Guests aren't texted every update any more, only the chosen events
  expect(g.sms).toBeNull();
  expect(g.email).toBeNull();

  // End to end: deliver.send calls Expo and Resend, and drops a dead token
  process.env.AUTH_RESEND_KEY = "re_test";
  const calls: { url: string; body: any }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (url.includes("exp.host")) return new Response(JSON.stringify({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }] }));
    return new Response(JSON.stringify({ id: "email_1" }));
  });
  await t.action(internal.notifications.deliver.send, { notificationId: await make("refund_issued") });
  expect(calls.some((c) => c.url.includes("exp.host") && c.body[0].to === token)).toBe(true);
  expect(await t.run(async (ctx) => (await ctx.db.query("pushTokens").collect()).length)).toBe(0);
  // refund_issued has no processed refund yet, so no email; order_placed sends the confirmation
  calls.length = 0;
  await t.action(internal.notifications.deliver.send, { notificationId: await make("order_placed") });
  const resend = calls.find((c) => c.url.includes("resend"));
  expect(resend?.body).toMatchObject({ to: ["ada@example.com"], subject: "Order placed: FK-10001" });

  // In-app list and unread
  expect(await account.query(api.notifications.unreadCount, { side: "shop" })).toBeGreaterThan(3);
  await account.mutation(api.notifications.markAllRead, { side: "shop" });
  expect(await account.query(api.notifications.unreadCount, { side: "shop" })).toBe(0);
});

test("support: a guest opens a ticket, staff reply, only the owner can read it", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  await expect(t.mutation(api.support.open, { side: "shop", body: "Hello", photoIds: [] })).rejects.toThrow(/NOT_SIGNED_IN/);
  await expect(guest.mutation(api.support.open, { side: "farm", body: "Hello", photoIds: [] })).rejects.toThrow(/NOT_FARMER/);
  const { ticketId, number } = await guest.mutation(api.support.open, { side: "shop", body: "Message from the website contact form", photoIds: [] });
  expect(number).toBe("SUP-1001");
  expect(await as(t, s.account).query(api.support.get, { ticketId })).toBeNull();
  await expect(as(t, s.account).mutation(api.support.send, { ticketId, body: "x", photoIds: [] })).rejects.toThrow(/NOT_FOUND/);

  const support = as(t, s.support);
  expect((await support.query(api.admin.support.list, { paginationOpts: page, status: "open" })).page[0]).toMatchObject({ number, unread: true, from: { isGuest: true } });
  vi.advanceTimersByTime(1000);
  await support.mutation(api.admin.support.reply, { ticketId, body: "We're on it", photoIds: [] });
  expect(await guest.query(api.support.get, { ticketId })).toMatchObject({ status: "open", unread: true });
  const msgs = await guest.query(api.support.messages, { ticketId, paginationOpts: page });
  expect(msgs.page[0]).toMatchObject({ from: "staff", authorName: "Farmkeke support", body: "We're on it" });
  await guest.mutation(api.support.markRead, { ticketId });
  expect((await guest.query(api.support.mine, { side: "shop" }))[0]).toMatchObject({ unread: false });
  await expect(support.mutation(api.admin.support.resolve, { ticketId, reason: "" })).rejects.toThrow();
  await support.mutation(api.admin.support.resolve, { ticketId, reason: "Answered" });
  await guest.mutation(api.support.send, { ticketId, body: "One more thing", photoIds: [] });
  expect(await guest.query(api.support.get, { ticketId })).toMatchObject({ status: "open" });

  const orderId = await paidOrder(t, s, s.guest, "pickup", 1);
  expect((await guest.query(api.support.orderChoices, { side: "shop" }))[0]).toMatchObject({ orderId, number: "FK-10001" });
  await guest.mutation(api.support.open, { side: "shop", body: "About my order", orderId, photoIds: [] });
  await expect(as(t, s.account).mutation(api.support.open, { side: "shop", body: "Not mine", orderId, photoIds: [] })).rejects.toThrow(/NOT_FOUND/);
});

test("account deletion waits for orders in progress, then finishes", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const account = as(t, s.account);
  const orderId = await paidOrder(t, s, s.account, "pickup", 1);
  await account.mutation(api.favorites.toggle, { listingId: s.tomatoes });
  expect(await account.query(api.favorites.isSaved, { listingId: s.tomatoes })).toBe(true);
  expect(await account.query(api.favorites.isSaved, { listingId: "not-an-id" })).toBe(false);
  expect(await as(t, s.guest).query(api.favorites.isSaved, { listingId: s.tomatoes })).toBe(false);
  await expect(as(t, s.guest).mutation(api.favorites.toggle, { listingId: s.tomatoes })).rejects.toThrow(/ACCOUNT_REQUIRED/);
  expect((await account.query(api.favorites.list, {}))[0]).toMatchObject({ name: "Tomatoes", unit: "basket", farmName: "Ada Greens", available: true });

  expect(await t.mutation(internal.accountsInternal.deleteUserData, { userId: s.account.id })).toBe("waiting_for_orders");
  expect(await t.mutation(internal.accountsInternal.deleteUserData, { userId: s.account.id })).toBe("waiting_for_orders");
  const rows = async () => await t.run(async (ctx) => await ctx.db.query("accountDeletions").collect());
  expect(await rows()).toMatchObject([{ status: "waiting_for_orders" }]);
  expect(await t.mutation(internal.accountsInternal.finishWaitingDeletions, {})).toEqual({ finished: 0 });
  expect(await t.run(async (ctx) => await ctx.db.get(s.account.id))).not.toBeNull();

  // The account still works to finish the order
  await deliver(t, s, orderId);
  await account.mutation(api.orders.consumer.confirmReceipt, { orderId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.mutation(internal.accountsInternal.finishWaitingDeletions, {})).toEqual({ finished: 1 });
  expect(await t.run(async (ctx) => await ctx.db.get(s.account.id))).toBeNull();
  expect(await rows()).toMatchObject([{ status: "completed" }]);
  expect(await t.run(async (ctx) => (await ctx.db.query("favorites").collect()).length)).toBe(0);
  // The order record stays for accounting
  expect(await t.run(async (ctx) => await ctx.db.get(orderId))).not.toBeNull();
});

test("the shopper marks a delivery received while the rider is bringing it, or reports a problem then", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const read = async (id: any) => await t.run(async (ctx) => (await ctx.db.get(id))!);

  // Not before the rider has it
  const orderId = await paidOrder(t, s, s.guest, "delivery");
  expect((await guest.query(api.orders.consumer.get, { orderId }))!.canConfirm).toBe(false);
  await expect(guest.mutation(api.orders.consumer.confirmReceipt, { orderId })).rejects.toThrow(/NOT_DELIVERED_YET/);

  // Out for delivery: confirming marks it delivered and completes it in one go
  await handOver(t, s, orderId);
  expect((await read(orderId)).status).toBe("out_for_delivery");
  const view = (await guest.query(api.orders.consumer.get, { orderId }))!;
  expect(view.canConfirm).toBe(true);
  expect(view.canReport).toBe(true);
  // Someone else still can't
  await expect(as(t, s.account).mutation(api.orders.consumer.confirmReceipt, { orderId })).rejects.toThrow(/NOT_FOUND/);
  await guest.mutation(api.orders.consumer.confirmReceipt, { orderId });
  const done = await read(orderId);
  expect(done.status).toBe("completed");
  expect(done.deliveredAt).toBeDefined();
  expect(done.confirmedAt).toBeDefined();
  expect(done.escrow).toBe("released");
  const events = await t.run(async (ctx) => await ctx.db.query("orderEvents").withIndex("by_orderId", (q) => q.eq("orderId", orderId)).collect());
  const delivered = events.find((e) => e.kind === "delivered")!;
  expect(delivered.actorKind).toBe("guest");
  expect(delivered.note).toBe("The shopper confirmed it arrived");
  // Staff can't mark it delivered after that
  await expect(as(t, s.admin).mutation(api.admin.dispatch.recordStep, { orderId, step: "delivered" })).rejects.toThrow(/WRONG_STATUS/);

  // A problem reported while it's out for delivery: delivered, then disputed, money held
  const second = await paidOrder(t, s, s.guest, "delivery");
  await handOver(t, s, second);
  await guest.mutation(api.disputes.open, { orderId: second, itemIndexes: [], note: "The rider never came", photoIds: [], reason: "not_received" });
  const disputed = await read(second);
  expect(disputed.status).toBe("disputed");
  expect(disputed.deliveredAt).toBeDefined();
  expect(disputed.escrow).toBe("held");
});
