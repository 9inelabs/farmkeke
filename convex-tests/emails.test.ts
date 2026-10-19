// Phase 9 emails: every shop status change sends the right email, message
// emails are throttled per thread, account security emails, farm emails and
// their default channels, and the wordmark route. Resend is mocked (fetch).
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { grantStaff } from "./staff";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.CONVEX_SITE_URL;
  delete process.env.EMAIL_ASSETS_URL;
  delete process.env.WEBSITE_URL;
  process.env.AUTH_RESEND_KEY = "re_test";
});
afterEach(() => {
  delete process.env.AUTH_RESEND_KEY;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));
type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
type Mail = { to: string[]; subject: string; html: string; text: string };

/** Captures every email sent to Resend. */
function mailbox() {
  const sent: Mail[] = [];
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    if (String(url).includes("resend")) sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ id: "x", data: [] }));
  });
  const to = (address: string) => sent.filter((m) => m.to[0] === address).map((m) => m.subject);
  return { sent, to, clear: () => (sent.length = 0) };
}

/** Runs the scheduled jobs that are due now (and what they schedule), not future ones. */
const flush = (t: T) => t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1));
/** Moves the clock on, then runs whatever came due. */
async function later(t: T, ms: number) {
  vi.advanceTimersByTime(ms);
  await flush(t);
}

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
    const farmerA = await user({ name: "Musa Bello", email: "a@example.com", phone: "+2348030000001" });
    const admin = await user({ name: "Sam Admin", email: "sam@example.com", staffRole: "super_admin" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, active: true, sortOrder: 1 });
    const pointId = await ctx.db.insert("pickupPoints", { name: "Ikenegbu Point", address: "Douglas Rd", state: "Imo", lga: "Owerri Municipal", latitude: 5.48, longitude: 7.03, hours, phone: "+2348035550144", collectWithinDays: 2, active: true });
    const appId = await ctx.db.insert("farmerApplications", { userId: farmerA.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farmA = await ctx.db.insert("farms", {
      userId: farmerA.id, applicationId: appId, name: "Ada Greens", phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
      farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
      openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
      accountName: "Ada Greens", status: "active", trusted: true,
    });
    const tomatoes = await ctx.db.insert("listings", { farmId: farmA, status: "live", name: "Tomatoes", photoIds: [], units: [{ unitId, priceKobo: 450000, stock: 50, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    return { guest, account, farmerA, admin, unitId, areaId, pointId, farmA, tomatoes };
  });
}
type S = Awaited<ReturnType<typeof seed>>;

const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

async function paidOrder(t: T, s: S, who: U, fulfilment: "delivery" | "pickup", quantity = 2, email?: string) {
  const buyer = as(t, who);
  const items = [{ listingId: s.tomatoes, unitId: s.unitId, quantity, priceKobo: 450000 }];
  const contact = { name: "Chidi Okeke", phone: "0803 111 2222", ...(email ? { email } : {}) };
  let placed;
  if (fulfilment === "delivery") {
    const windows = await buyer.query(api.checkout.deliveryWindows, { farmIds: [s.farmA], now: Date.now() });
    const day = windows.days[0];
    placed = await buyer.mutation(api.checkout.place, {
      items, fulfilment, expectedTotalKobo: quantity * 450000 + 100000,
      address: { street: "53b Nob Oluwa", landmark: "Church", serviceAreaId: s.areaId },
      window: { day: day.day, ...day.slots[0] }, contact,
    });
  } else {
    placed = await buyer.mutation(api.checkout.place, { items, fulfilment, expectedTotalKobo: quantity * 450000, pickupPointId: s.pointId, contact });
  }
  await buyer.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  return placed.orders[0].orderId as any;
}

/** Accept, prepare, pack, ready, rider assigned, collected from the farm. */
async function toRider(t: T, s: S, orderId: any) {
  const farmer = as(t, s.farmerA);
  const admin = as(t, s.admin);
  await farmer.mutation(api.orders.farmer.accept, { orderId });
  await farmer.mutation(api.orders.farmer.startPreparing, { orderId });
  await farmer.mutation(api.orders.farmer.markPacked, { orderId });
  await farmer.mutation(api.orders.farmer.readyForRider, { orderId });
  const riderId = await admin.mutation(api.admin.riders.create, { name: "Emeka Eze", phone: "08035550000", reason: "New rider", serviceAreaIds: [s.areaId] });
  await admin.mutation(api.admin.dispatch.assignRider, { orderId, riderId, collectAt: Date.now() + 3600_000 });
  await admin.mutation(api.admin.dispatch.recordStep, { orderId, step: "collected_from_farm" });
}

test("each shop status change sends the right email (delivery)", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const mail = mailbox();
  const shopper = "ada@example.com";
  const farmer = "a@example.com";

  const orderId = await paidOrder(t, s, s.account, "delivery");
  await flush(t);
  expect(mail.to(shopper)).toEqual(["Order placed: FK-10001"]);
  expect(mail.to(farmer)).toEqual(["New order FK-10001: accept within 24 hours"]);

  mail.clear();
  await toRider(t, s, orderId);
  await flush(t);
  // Packed is push only; out for delivery follows the rider's collection
  expect(mail.to(shopper)).toEqual([
    "Ada Greens accepted order FK-10001",
    "Ada Greens is preparing order FK-10001",
    "Your order FK-10001 is on its way",
  ]);
  expect(mail.to(farmer)).toEqual(["Rider for order FK-10001"]);
  const kinds = await t.run(async (ctx) => (await ctx.db.query("notifications").collect()).map((n) => n.kind));
  expect(kinds).toContain("order_packed");

  mail.clear();
  await as(t, s.admin).mutation(api.admin.dispatch.recordStep, { orderId, step: "delivered" });
  await flush(t);
  expect(mail.to(shopper)).toEqual(["Order FK-10001 delivered. Please check and confirm"]);

  // A day later, still unconfirmed: the reminder
  mail.clear();
  vi.advanceTimersByTime(25 * HOUR);
  await t.mutation(internal.orders.system.flagUnconfirmed, {});
  await flush(t);
  expect(mail.to(shopper)).toEqual(["Did order FK-10001 arrive?"]);

  mail.clear();
  await as(t, s.account).mutation(api.orders.consumer.confirmReceipt, { orderId });
  await flush(t);
  expect(mail.to(shopper)).toEqual(["Thanks for confirming order FK-10001"]);
  // Locked money emails reach the farm: released, then the payout
  expect(mail.to(farmer)).toEqual(["Payment released: ₦8,550 for order FK-10001", "Payout sent: ₦8,550"]);

  mail.clear();
  await later(t, DAY + 1000);
  expect(mail.to(shopper)).toEqual(["How was your order from Ada Greens?"]);

  // Every email has a text part, one button and the footer reason
  const review = mail.sent[0]!;
  expect(review.text).toContain("Leave a review: https://farmkeke.com/orders/");
  expect(review.html.match(/target="_blank" style="display:inline-block;padding:15px 28px/g)).toHaveLength(1);
  expect(review.text).toContain("You're getting this email because you placed order FK-10001");
});

test("pickup, cancel and decline emails; guests only with an email", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const mail = mailbox();
  const guestEmail = "chidi@example.com";

  // Pickup order by a guest who gave an email
  const pickup = await paidOrder(t, s, s.guest, "pickup", 1, guestEmail);
  await toRider(t, s, pickup);
  await as(t, s.admin).mutation(api.admin.dispatch.recordStep, { orderId: pickup, step: "dropped_at_pickup_point" });
  await flush(t);
  expect(mail.to(guestEmail)).toEqual([
    "Order placed: FK-10001",
    "Ada Greens accepted order FK-10001",
    "Ada Greens is preparing order FK-10001",
    "Ready for pickup: order FK-10001",
  ]);
  // A day before collect-by (3 days), then the window ends
  mail.clear();
  await later(t, 2 * DAY + 1000);
  expect(mail.to(guestEmail)).toHaveLength(1);
  expect(mail.to(guestEmail)[0]).toMatch(/^Reminder: collect order FK-10001 by /);
  expect(mail.sent.find((m) => m.to[0] === guestEmail)!.text).toContain("YOUR PICKUP CODE:");
  mail.clear();
  await later(t, DAY);
  expect(mail.to(guestEmail)).toEqual(["Order FK-10001 is still at the pickup point"]);

  // Staff cancel: notification, cancel email with the refund line, then the refund
  mail.clear();
  const cancelled = await paidOrder(t, s, s.account, "delivery", 2);
  await as(t, s.admin).mutation(api.admin.orders.cancel, { orderId: cancelled, reason: "Farm flooded" });
  await flush(t);
  const shop = mail.to("ada@example.com");
  expect(shop).toContain("Order FK-10002 was cancelled. Full refund on the way");
  expect(shop).toContain("Your refund of ₦10,000 is on its way");
  const cancelMail = mail.sent.find((m) => m.subject.startsWith("Order FK-10002 was cancelled"))!;
  expect(cancelMail.text).toContain("You'll get a full refund of ₦10,000, delivery fee included.");
  expect(mail.to("a@example.com")).toContain("Order FK-10002 was cancelled");

  // A guest without an email gets none
  mail.clear();
  const noEmail = await paidOrder(t, s, s.guest, "pickup", 1);
  await as(t, s.farmerA).mutation(api.orders.farmer.decline, { orderId: noEmail, reason: "out_of_stock" });
  await flush(t);
  expect(mail.sent.filter((m) => m.to[0] !== "a@example.com")).toEqual([]);
});

test("message emails: at most one per thread every 30 minutes", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const mail = mailbox();
  const orderId = await paidOrder(t, s, s.account, "pickup", 1);
  await flush(t);
  mail.clear();
  const send = async (kind: string, extra: Record<string, unknown> = {}) => {
    const notificationId = await t.mutation(internal.notifications.store.create, {
      userId: s.account.id, side: "shop", kind, title: "Ada Greens replied", body: "Your <tomatoes> are packed", href: `/order/${orderId}/chat`, orderId, ...extra,
    } as any);
    await t.action(internal.notifications.deliver.send, { notificationId });
  };
  await send("chat_message");
  await send("chat_message");
  vi.advanceTimersByTime(20 * 60_000);
  await send("chat_message");
  expect(mail.to("ada@example.com")).toEqual(["Ada Greens sent you a message about order FK-10001"]);
  // User text is escaped
  expect(mail.sent[0]!.html).toContain("Your &lt;tomatoes&gt; are packed");
  expect(mail.sent[0]!.html).toContain("https://farmkeke.com/orders/" + orderId + "/chat");

  // Another thread (support, no order) has its own window
  const ticketId = await t.run(async (ctx) =>
    await ctx.db.insert("supportTickets", { userId: s.account.id, side: "shop", number: "SUP-1001", status: "open", lastMessageAt: Date.now() }),
  );
  const support = await t.mutation(internal.notifications.store.create, {
    userId: s.account.id, side: "shop", kind: "support_reply", title: "Farmkeke support replied", body: "We're on it", href: `/support/${ticketId}`,
  });
  await t.action(internal.notifications.deliver.send, { notificationId: support });
  expect(mail.to("ada@example.com")).toEqual(["Ada Greens sent you a message about order FK-10001", "Farmkeke support replied (SUP-1001)"]);

  // After 30 minutes the chat can email again
  vi.advanceTimersByTime(11 * 60_000);
  await send("chat_message");
  expect(mail.to("ada@example.com").filter((x) => x.includes("sent you a message"))).toHaveLength(2);

  // Turning message emails off stops them
  await as(t, s.account).mutation(api.notifications.setPreference, { side: "shop", alert: "messages", channel: "email", on: false });
  vi.advanceTimersByTime(31 * 60_000);
  await send("chat_message");
  expect(mail.to("ada@example.com").filter((x) => x.includes("sent you a message"))).toHaveLength(2);
});

test("account emails: password changed, email changed, deletion, guest orders", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const mail = mailbox();

  await t.action(internal.notifications.deliver.accountEmail, { email: { kind: "password_changed", userId: s.account.id, how: "changed" } });
  await t.action(internal.notifications.deliver.accountEmail, { email: { kind: "password_changed", userId: s.account.id, how: "reset" } });
  expect(mail.to("ada@example.com")).toEqual(["Your Farmkeke password was changed", "Your Farmkeke password was changed"]);
  expect(mail.sent[1]!.text).toContain("was reset with an email link");
  expect(mail.sent[0]!.text).toContain("Didn't change your password?");

  // Even with every shop email turned off (security emails ignore preferences)
  await as(t, s.account).mutation(api.notifications.setPreference, { side: "shop", alert: "order_updates", on: false });
  mail.clear();
  await t.run(async (ctx) => await ctx.db.insert("authAccounts", { userId: s.account.id, provider: "password", providerAccountId: "ada@example.com" }));
  expect(await t.mutation(internal.accountsInternal.replaceEmail, { userId: s.account.id, newEmail: "ada.obi@example.com" })).toBe("OK");
  await t.action(internal.notifications.deliver.accountEmail, {
    email: { kind: "email_changed", userId: s.account.id, oldEmail: "ada@example.com", newEmail: "ada.obi@example.com" },
  });
  expect(mail.to("ada@example.com")).toEqual(["Your Farmkeke email address was changed"]);
  expect(mail.to("ada.obi@example.com")).toEqual(["This is now your Farmkeke email address"]);
  expect(mail.sent[0]!.text).toContain("New address: ada.obi@example.com");

  // Deletion with an order in progress: "waiting for 1 order", then "deleted"
  mail.clear();
  const orderId = await paidOrder(t, s, s.account, "pickup", 1);
  await flush(t);
  mail.clear();
  expect(await t.mutation(internal.accountsInternal.deleteUserData, { userId: s.account.id })).toBe("waiting_for_orders");
  await flush(t);
  expect(mail.to("ada.obi@example.com")).toEqual(["Your Farmkeke account will be deleted soon"]);
  expect(mail.sent[0]!.text).toContain("You have 1 order in progress.");
  await t.run(async (ctx) => await ctx.db.patch(orderId, { status: "completed", escrow: "released" }));
  mail.clear();
  expect(await t.mutation(internal.accountsInternal.finishWaitingDeletions, {})).toEqual({ finished: 1 });
  await flush(t);
  expect(mail.to("ada.obi@example.com")).toEqual(["Your Farmkeke account is deleted"]);

  // Guest orders added to an account
  mail.clear();
  const buyer = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Ngozi Eze", email: "ngozi@example.com" });
    const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
    return { id, sessionId };
  });
  await paidOrder(t, s, s.guest, "pickup", 1);
  const token = "t".repeat(40);
  await t.run(async (ctx) => await ctx.db.patch(s.guest.id, { guestClaimToken: token, guestClaimExpiresAt: Date.now() + HOUR } as any));
  await flush(t);
  mail.clear();
  expect(await as(t, buyer).mutation(api.orders.consumer.claimGuestOrders, { token })).toEqual({ claimed: 1 });
  await flush(t);
  expect(mail.to("ngozi@example.com")).toEqual(["Your guest order is now in your account"]);

  // Welcome: accounts only, never anonymous guests
  mail.clear();
  await t.action(internal.notifications.deliver.welcome, { userId: s.guest.id });
  await t.action(internal.notifications.deliver.welcome, { userId: buyer.id });
  expect(mail.sent.map((m) => m.to[0])).toEqual(["ngozi@example.com"]);
});

test("farm application approved email", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const mail = mailbox();
  const applicant = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Bola Ade", email: "bola@example.com" });
    const appId = await ctx.db.insert("farmerApplications", {
      userId: id, status: "submitted", reference: "FA-10001", farmName: "Green Acres", phone: "+2348030000044", state: "Oyo", lga: "Ibadan North",
      address: "12 Ring Road", farmSize: "1_to_5", farmType: "crops", categoryIds: [await ctx.db.insert("categories", { name: "Vegetables", slug: "veg", illustration: "veg", sortOrder: 1, hidden: false })],
      mainCrops: "Peppers", seasons: ["all_year"], collectionAddress: "12 Ring Road", collectionHours: hours, leadTimeHours: 4,
      bankCode: "058", bankName: "GTBank", accountNumber: "0123456780", accountName: "Bola Ade", submittedAt: Date.now(),
    } as any);
    const kinds = ["government_id", "farm_photo", "farm_photo", "farm_photo", "proof_of_address", "association_letter"] as const;
    for (const kind of kinds) {
      const storageId = await ctx.storage.store(new Blob(["x"]));
      await ctx.db.insert("farmerDocuments", { userId: id, applicationId: appId, kind, storageId, status: "pending" });
    }
    return { id, appId };
  });
  await as(t, s.admin).mutation(api.admin.farmerRequests.approve, { applicationId: applicant.appId, reason: "All checks passed" });
  await flush(t);
  expect(mail.to("bola@example.com")).toEqual(["You're approved: Green Acres can now sell on Farmkeke"]);
  const approved = mail.sent[0]!;
  expect(approved.text).toContain("Switch to farmer mode");
  expect(approved.text).toContain("Open the Farmkeke app: https://farmkeke.com/get-the-app");
  // The application alert isn't in the farm preference list, and can't be switched off
  const prefs = await as(t, s.farmerA).query(api.notifications.preferences, { side: "farm" });
  expect(prefs!.alerts.map((a: any) => a.alert)).not.toContain("application");
});

test("farm emails: orders on by default, messages and reviews off", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.account, "delivery");
  const plan = async (kind: string, title = "T") =>
    (await t.query(internal.notifications.store.plan, {
      notificationId: await t.mutation(internal.notifications.store.create, {
        userId: s.farmerA.id, side: "farm", kind, title, body: "Is it fresh?", href: `/farm-order/${orderId}`, orderId,
      }),
    }))!;
  const order = await plan("order_new");
  expect(order.email).toMatchObject({ to: "a@example.com", subject: "New order FK-10001: accept within 24 hours" });
  expect(order.email!.text).toContain("In the Farmkeke app: Switch to farmer mode > Orders > Order FK-10001");
  expect((await plan("chat_message")).email).toBeNull();
  expect((await plan("review_received")).email).toBeNull();
  expect((await plan("order_deadline")).email?.subject).toMatch(/left to accept order FK-10001$/);

  const prefs = await as(t, s.farmerA).query(api.notifications.preferences, { side: "farm" });
  const row = (alert: string) => prefs!.alerts.find((a: any) => a.alert === alert);
  expect(row("orders")).toMatchObject({ email: true });
  expect(row("problems")).toMatchObject({ email: true });
  expect(row("payments")).toMatchObject({ email: true, locked: true });
  expect(row("listings")).toMatchObject({ email: true });
  expect(row("messages")).toMatchObject({ email: false });
  expect(row("reviews")).toMatchObject({ email: false });

  // A farmer can turn message emails on
  await as(t, s.farmerA).mutation(api.notifications.setPreference, { side: "farm", alert: "messages", channel: "email", on: true });
  const chat = await plan("chat_message");
  expect(chat.email?.subject).toBe("New message about order FK-10001");
  expect(chat.emailThrottleKey).toBeDefined();
});

test("wordmark route serves the PNG, and emails point to it", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const res = await t.fetch("/email/wordmark.png", { method: "GET" });
  expect(res.status).toBe(200);
  expect(res.headers.get("Content-Type")).toBe("image/png");
  expect(res.headers.get("Cache-Control")).toContain("max-age=31536000");
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.length).toBe(33876);
  const app = await t.fetch("/open-app", { method: "GET" });
  expect(await app.text()).toContain("farmkeke://");

  const orderId = await paidOrder(t, s, s.account, "pickup", 1);
  const html = async () =>
    (await t.query(internal.notifications.store.plan, {
      notificationId: await t.mutation(internal.notifications.store.create, {
        userId: s.account.id, side: "shop", kind: "order_accepted", title: "T", body: "B", href: "/x", orderId,
      }),
    }))!.email!.html;
  process.env.CONVEX_SITE_URL = "https://happy-otter-123.convex.site";
  process.env.WEBSITE_URL = "https://staging.farmkeke.com/";
  const viaRoute = await html();
  expect(viaRoute).toContain('src="https://happy-otter-123.convex.site/email/wordmark.png"');
  expect(viaRoute).toContain(`https://staging.farmkeke.com/orders/${orderId}`);
  process.env.EMAIL_ASSETS_URL = "https://cdn.farmkeke.com/email";
  expect(await html()).toContain('src="https://cdn.farmkeke.com/email/wordmark.png"');
});
