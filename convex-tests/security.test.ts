// Security review (25 Oct 2026): attacks on the backend, run against a
// local test deployment. Each test plays an attacker who is signed out, a
// guest, another shopper, another farm, or staff with too small a role, and
// checks the backend refuses. The functions here are the ones the app, the
// website and the Admin Portal call directly.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { deliver, paidOrder } from "./orderFlow";
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

const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));
type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
const page = { cursor: null, numItems: 50 };

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
    const attacker = await user({ name: "Mallory", email: "mallory@example.com" });
    const farmerA = await user({ name: "Farmer A", email: "a@example.com", phone: "+2348030000001" });
    const farmerB = await user({ name: "Farmer B", email: "b@example.com", phone: "+2348030000002" });
    const admin = await user({ name: "Sam Admin", email: "sam@example.com", staffRole: "super_admin" });
    const support = await user({ name: "Sue Support", email: "sue@example.com", staffRole: "support" });
    // Staff who signed in with the password but never entered the emailed code
    const halfStaff = await user({ name: "Hal", email: "hal@example.com" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, active: true, sortOrder: 1 });
    const categoryId = await ctx.db.insert("categories", { slug: "vegetables", name: "Vegetables", illustration: "vegetables", sortOrder: 1, hidden: false });
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
    // A staff member whose session never passed the emailed code
    const role = await ctx.db.query("staffRoles").withIndex("by_key", (q) => q.eq("key", "founder")).unique();
    await ctx.db.insert("staffMembers", { userId: halfStaff.id, name: "Hal", email: "hal@example.com", jobTitle: "x", status: "approved", roleId: role!._id, appliedAt: Date.now() } as any);
    return { guest, account, attacker, farmerA, farmerB, admin, support, halfStaff, unitId, areaId, categoryId, farmA, farmB, tomatoes };
  });
}

const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

test("admin functions refuse the signed-out, shoppers, farmers, staff without the code, and too-small roles", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.account, "pickup");
  const callers = { anon: t, shopper: as(t, s.account), farmer: as(t, s.farmerA), noCode: as(t, s.halfStaff) };
  for (const [who, c] of Object.entries(callers)) {
    const tries: [string, () => Promise<unknown>][] = [
      ["dashboard", () => c.query(api.admin.dashboard.stats, {} as any)],
      ["customers", () => c.query(api.admin.consumers.list, { paginationOpts: page })],
      ["order", () => c.query(api.admin.orders.get, { orderId })],
      ["cancel order", () => c.mutation(api.admin.orders.cancel, { orderId, reason: "x" })],
      ["block user", () => c.mutation(api.admin.consumers.setBlocked, { userId: s.account.id, blocked: true, reason: "x" })],
      ["commission", () => c.mutation(api.admin.fees.setCommission, { commissionBps: 0, reason: "x" })],
      ["new role", () => c.mutation(api.admin.staff.createRole, { name: "Pwn", description: "x", permissions: ["staff.manage"] })],
      ["audit log", () => c.query(api.admin.staff.listAuditLog, { paginationOpts: page })],
      ["payouts", () => c.query(api.admin.payments.payouts, { paginationOpts: page, status: "pending" } as any)],
    ];
    for (const [what, call] of tries) {
      await expect(call(), `${who}: ${what}`).rejects.toThrow();
    }
  }
  // Support staff can't touch money or roles
  const support = as(t, s.support);
  await expect(support.mutation(api.admin.fees.setCommission, { commissionBps: 0, reason: "x" })).rejects.toThrow();
  await expect(support.mutation(api.admin.staff.createRole, { name: "Pwn", description: "x", permissions: ["staff.manage"] })).rejects.toThrow();
  // (Support may read payouts, by design, to answer "where's my money?": no bank numbers are shown.)
  // Nothing changed
  const user = await t.run(async (ctx) => await ctx.db.get(s.account.id));
  expect(user!.blockedAt).toBeUndefined();
});

test("another shopper can't see or act on someone else's order, checkout, chat, problem or address", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.account, "delivery");
  await deliver(t, s, orderId);
  const victim = as(t, s.account);
  const mallory = as(t, s.attacker);
  const checkoutId = await t.run(async (ctx) => (await ctx.db.get(orderId))!.checkoutId);

  // Reads come back empty, not with the victim's data
  expect(await mallory.query(api.orders.consumer.get, { orderId })).toBeNull();
  expect(await mallory.query(api.payments.checkout.get, { checkoutId })).toBeNull();
  expect(await mallory.query(api.orders.consumer.placedSummary, { checkoutId })).toBeNull();
  // (refused outright, or nothing comes back)
  expect(await mallory.query(api.chat.thread, { orderId }).catch(() => null)).toBeNull();
  expect(await mallory.query(api.disputes.forOrder, { orderId }).catch(() => null)).toBeNull();
  // Writes are refused
  await expect(mallory.mutation(api.orders.consumer.confirmReceipt, { orderId })).rejects.toThrow();
  await expect(mallory.mutation(api.chat.send, { orderId, body: "hi", photoIds: [] })).rejects.toThrow();
  await expect(mallory.mutation(api.disputes.open, { orderId, itemIndexes: [0], note: "fake", photoIds: [], reason: "missing" })).rejects.toThrow();
  await expect(mallory.mutation(api.reviews.submit, { orderId, rating: 1, tags: [], comment: "bad" })).rejects.toThrow();
  await expect(mallory.mutation(api.payments.checkout.markPaidTest, { checkoutId })).rejects.toThrow();
  // The signed-out can't either
  await expect(t.mutation(api.orders.consumer.confirmReceipt, { orderId })).rejects.toThrow();

  // Addresses
  const addressId = await t.run(async (ctx) =>
    await ctx.db.insert("addresses", { userId: s.account.id, label: "home", street: "1 Secret St", landmark: "x", serviceAreaId: s.areaId, isDefault: true }),
  );
  expect(await mallory.query(api.addresses.get, { addressId }).catch(() => null)).toBeNull();
  await expect(mallory.mutation(api.addresses.remove, { addressId })).rejects.toThrow();
  expect(await t.run(async (ctx) => await ctx.db.get(addressId))).not.toBeNull();

  // The victim still can
  await victim.mutation(api.orders.consumer.confirmReceipt, { orderId });
});

test("another farm can't see or act on a farm's orders, listings or payouts", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const placed = await as(t, s.account).mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
    fulfilment: "pickup",
    expectedTotalKobo: 450000,
    contact: { name: "Ada Obi", phone: "0803 111 2222" },
  });
  await as(t, s.account).mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
  const orderId = placed.orders[0]!.orderId;
  const farmB = as(t, s.farmerB);

  expect(await farmB.query(api.orders.farmer.get, { orderId })).toBeNull();
  expect(await farmB.query(api.orders.farmer.packingSlip, { orderId })).toBeNull();
  for (const fn of [api.orders.farmer.accept, api.orders.farmer.startPreparing, api.orders.farmer.readyForRider, api.orders.farmer.confirmHandover]) {
    await expect(farmB.mutation(fn, { orderId })).rejects.toThrow();
  }
  await expect(farmB.mutation(api.orders.farmer.decline, { orderId, reason: "other", note: "x" } as any)).rejects.toThrow();
  await expect(farmB.mutation(api.listings.saveDetails, { listingId: s.tomatoes, name: "Pwned", categoryId: s.categoryId, description: "x" })).rejects.toThrow();
  await expect(farmB.mutation(api.listings.quickUpdate, { listingId: s.tomatoes, units: [{ unitId: s.unitId, priceKobo: 1, stock: 0 }] } as any)).rejects.toThrow();
  // A shopper isn't a farm at all
  await expect(as(t, s.account).mutation(api.orders.farmer.accept, { orderId })).rejects.toThrow();
  // The listing is unchanged
  const listing = await t.run(async (ctx) => await ctx.db.get(s.tomatoes));
  expect(listing!.name).toBe("Tomatoes");
  expect(listing!.units[0]!.priceKobo).toBe(450000);
});

test("tampered carts: the price, quantity and total come from the server", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const shopper = as(t, s.account);
  const place = (item: { quantity: number; priceKobo: number }, expectedTotalKobo: number) =>
    shopper.mutation(api.checkout.place, {
      items: [{ listingId: s.tomatoes, unitId: s.unitId, ...item }],
      fulfilment: "pickup",
      expectedTotalKobo,
      contact: { name: "Ada Obi", phone: "0803 111 2222" },
    });
  // A price of ₦0.01 is refused, not charged
  await expect(place({ quantity: 1, priceKobo: 1 }, 1)).rejects.toThrow();
  // Negative, fractional and absurd quantities
  await expect(place({ quantity: -5, priceKobo: 450000 }, -2250000)).rejects.toThrow();
  await expect(place({ quantity: 0.5, priceKobo: 450000 }, 225000)).rejects.toThrow();
  await expect(place({ quantity: 1_000_000, priceKobo: 450000 }, 450000 * 1_000_000)).rejects.toThrow();
  // No checkout was created by any of those
  expect(await t.run(async (ctx) => (await ctx.db.query("checkouts").collect()).length)).toBe(0);
});

test("payments: test pay is off once Paystack is live, forged webhooks are refused, a short payment isn't accepted", async () => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  let paidAmount = 1; // what Paystack says was paid
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    const ok = (data: unknown) => new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200 });
    if (url.endsWith("/transaction/initialize")) return ok({ authorization_url: "https://checkout.paystack.com/x", access_code: "x", reference: body.reference });
    if (url.includes("/transaction/verify/")) {
      const reference = decodeURIComponent(url.split("/transaction/verify/")[1]!);
      return ok({ reference, status: "success", amount: paidAmount, currency: "NGN", channel: "card", paid_at: new Date().toISOString(), customer: { email: "x@y.z" } });
    }
    return new Response("{}", { status: 400 });
  });
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const shopper = as(t, s.account);
  const placed = await shopper.mutation(api.checkout.place, {
    items: [{ listingId: s.tomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
    fulfilment: "pickup",
    expectedTotalKobo: 450000,
    contact: { name: "Ada Obi", phone: "0803 111 2222" },
  });
  // "Pay now (test)" can't be used to skip paying
  await expect(shopper.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId })).rejects.toThrow(/TEST_STEP_OFF/);
  const started = await shopper.action(api.payments.checkout.start, { checkoutId: placed.checkoutId, method: "card" });

  // A webhook signed with the wrong key, or no signature
  const raw = JSON.stringify({ event: "charge.success", data: { reference: started.reference } });
  expect((await t.fetch("/paystack/webhook", { method: "POST", body: raw, headers: { "x-paystack-signature": "00".repeat(64) } })).status).toBe(401);
  expect((await t.fetch("/paystack/webhook", { method: "POST", body: raw })).status).toBe(401);
  // Paystack says ₦0.01 was paid: not accepted as payment
  await t.fetch(`/paystack/return?checkoutId=${placed.checkoutId}&reference=${started.reference}`);
  await shopper.action(api.payments.checkout.verify, { checkoutId: placed.checkoutId });
  const after = await shopper.query(api.payments.checkout.get, { checkoutId: placed.checkoutId });
  expect(after!.status).toBe("awaiting_payment");
  const attempt = await t.run(async (ctx) => (await ctx.db.query("paymentAttempts").collect())[0]!);
  expect(attempt.status).toBe("mismatch");
  paidAmount = 450000;
});

test("bill links: a wrong or guessed pay token is refused", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.account, "pickup");
  const checkoutId = await t.run(async (ctx) => (await ctx.db.get(orderId))!.checkoutId);
  const mallory = as(t, s.attacker);
  expect(await mallory.query(api.payments.checkout.bill, { token: "0".repeat(48) })).toBeNull();
  expect(await mallory.query(api.payments.checkout.bill, { token: "" })).toBeNull();
  await expect(mallory.action(api.payments.checkout.verify, { checkoutId, payToken: "0".repeat(48) })).rejects.toThrow();
});

test("guest order lookup by number and phone hides the pickup code, phone and street", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.guest, "delivery");
  const order = await t.run(async (ctx) => await ctx.db.get(orderId));
  const seen = await as(t, s.attacker).query(api.orders.consumer.find, { number: order!.number, phone: "0803 111 2222" });
  expect(seen).not.toBeNull();
  expect(seen!.pickupCode).toBeNull();
  expect(seen!.contact.phone).toBeNull();
  expect(seen!.address?.street ?? null).toBeNull();
  // The wrong phone gets nothing
  expect(await as(t, s.attacker).query(api.orders.consumer.find, { number: order!.number, phone: "0803 999 9999" })).toBeNull();
});

test("phone sign-up codes: 5 wrong tries end the code, 5 codes an hour per number", async () => {
  const t = convexTest(schema, modules);
  const phone = "+2348030007777";
  await t.mutation(internal.phoneAuth.issueCode, { phone, codeHash: "right" });
  for (let i = 0; i < 5; i++) expect(await t.mutation(internal.phoneAuth.peekCode, { phone, codeHash: `wrong${i}` })).toMatchObject({ error: "INVALID_CODE" });
  await expect(t.mutation(internal.phoneAuth.peekCode, { phone, codeHash: "right" })).rejects.toThrow(/TOO_MANY_ATTEMPTS/);
  for (let i = 0; i < 4; i++) await t.mutation(internal.phoneAuth.issueCode, { phone, codeHash: "x" });
  await expect(t.mutation(internal.phoneAuth.issueCode, { phone, codeHash: "x" })).rejects.toThrow(/RATE_LIMITED/);
});

test("notifications, support tickets and saved cards are only the owner's", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const victim = as(t, s.account);
  const mallory = as(t, s.attacker);
  const ticket = await victim.mutation(api.support.open, { body: "My card details are …", photoIds: [], side: "shop" } as any);
  const ticketId = (ticket as any).ticketId ?? ticket;
  expect(await mallory.query(api.support.get, { ticketId })).toBeNull();
  await expect(mallory.mutation(api.support.send, { ticketId, body: "hi", photoIds: [] })).rejects.toThrow();
  const cardId = await t.run(async (ctx) =>
    await ctx.db.insert("savedCards", { userId: s.account.id, authorizationCode: "AUTH_x", email: "ada@example.com", brand: "visa", last4: "4081", expMonth: "12", expYear: "2030", bank: "x", signature: "S" } as any),
  );
  await expect(mallory.action(api.payments.cards.remove, { cardId })).rejects.toThrow();
  expect(await t.run(async (ctx) => await ctx.db.get(cardId))).not.toBeNull();
  const noteId = await t.run(async (ctx) =>
    await ctx.db.insert("notifications", { userId: s.account.id, side: "shop", kind: "x", title: "Secret", body: "x", href: "/orders" }),
  );
  await expect(mallory.mutation(api.notifications.markRead, { notificationId: noteId })).rejects.toThrow();
});

test("a staff member can't grant themselves more power", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const support = as(t, s.support);
  const member = await t.run(async (ctx) => await ctx.db.query("staffMembers").withIndex("by_userId", (q) => q.eq("userId", s.support.id)).unique());
  const founderRole = await t.run(async (ctx) => await ctx.db.query("staffRoles").withIndex("by_key", (q) => q.eq("key", "founder")).unique());
  await expect(support.mutation(api.admin.staff.changeRole, { memberId: member!._id, roleId: founderRole!._id, reason: "promote me" })).rejects.toThrow();
  // Not even the Founder can change their own role
  const adminMember = await t.run(async (ctx) => await ctx.db.query("staffMembers").withIndex("by_userId", (q) => q.eq("userId", s.admin.id)).unique());
  await expect(as(t, s.admin).mutation(api.admin.staff.setActive, { memberId: adminMember!._id, active: false, reason: "x" })).rejects.toThrow();
});

// ---------------------------------------------------------------------------
// Fixes from this review

test("PIN guessing: five wrong PINs in a row lock PIN log-in until a new PIN is set", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const accountId = await t.run(async (ctx) =>
    await ctx.db.insert("authAccounts", { userId: s.farmerA.id, provider: "phone-code", providerAccountId: "+2348030000001", secret: "hash" }),
  );
  for (let left = 4; left >= 1; left--) {
    expect(await t.mutation(internal.phoneAuth.pinFailed, { accountId })).toEqual({ locked: false, attemptsLeft: left });
  }
  expect(await t.mutation(internal.phoneAuth.pinFailed, { accountId })).toEqual({ locked: true, attemptsLeft: 0 });
  expect(await t.query(internal.phoneAuth.accountFor, { phone: "+2348030000001" })).toMatchObject({ locked: true });
  // Setting a new PIN with a texted code opens it again, with a fresh count
  await t.mutation(internal.phoneAuth.pinCleared, { userId: s.farmerA.id });
  expect(await t.query(internal.phoneAuth.accountFor, { phone: "+2348030000001" })).toMatchObject({ locked: false });
  expect(await t.mutation(internal.phoneAuth.pinFailed, { accountId })).toEqual({ locked: false, attemptsLeft: 4 });
});

test("payout account: changing it needs the farmer's PIN, and wrong PINs count towards the lock", async () => {
  const { Scrypt } = await import("lucia");
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const hash = await new Scrypt().hash("2580");
  await t.run(async (ctx) =>
    await ctx.db.insert("authAccounts", { userId: s.farmerA.id, provider: "phone-code", providerAccountId: "+2348030000001", secret: hash }),
  );
  const farmer = as(t, s.farmerA);
  const change = (secret?: string) =>
    farmer.action(api.payments.bank.savePayoutAccount, { accountNumber: "9999999999", bankCode: "058", accountName: "Mallory", ...(secret ? { secret } : {}) });
  // Someone holding the farmer's unlocked phone
  await expect(change()).rejects.toThrow(/CONFIRM_REQUIRED/);
  await expect(change("1111")).rejects.toThrow(/WRONG_PIN/);
  let farm = await t.run(async (ctx) => await ctx.db.get(s.farmA));
  expect(farm!.accountNumber).toBe("0123456789");
  // The farmer
  const saved = await change("2580");
  expect(saved).toMatchObject({ accountLast4: "9999" });
  farm = await t.run(async (ctx) => await ctx.db.get(s.farmA));
  expect(farm!.accountNumber).toBe("9999999999");
});

test("uploads: SVG and other non-photo files are refused", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  // convex-test doesn't record a stored file's type (real uploads do), so set it here
  const store = (body: BlobPart, type: string) =>
    t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob([body], { type }));
      await (ctx.db as any).patch(id, { contentType: type });
      return id;
    });
  const svg = await store('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "image/svg+xml");
  await expect(as(t, s.farmerA).mutation(api.listings.savePhotos, { listingId: s.tomatoes, photoIds: [svg] })).rejects.toThrow(/UPLOAD_NOT_IMAGE/);
  const jpeg = await store(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg");
  await as(t, s.farmerA).mutation(api.listings.savePhotos, { listingId: s.tomatoes, photoIds: [jpeg] });
});

test("abuse caps: texts across all numbers, reset emails per address, upload links per person", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  for (let i = 0; i < 300; i++) await t.mutation(internal.phoneAuth.issueCode, { phone: `+23480300${String(i).padStart(5, "0")}`, codeHash: "x" });
  await expect(t.mutation(internal.phoneAuth.issueCode, { phone: "+2348039999999", codeHash: "x" })).rejects.toThrow(/RATE_LIMITED/);

  for (let i = 0; i < 5; i++) expect(await t.mutation(internal.accountsInternal.allowResetEmail, { email: "ada@example.com" })).toBe(true);
  expect(await t.mutation(internal.accountsInternal.allowResetEmail, { email: "ada@example.com" })).toBe(false);

  const shopper = as(t, s.account);
  for (let i = 0; i < 60; i++) await shopper.mutation(api.chat.generateUploadUrl, {});
  await expect(shopper.mutation(api.chat.generateUploadUrl, {})).rejects.toThrow(/RATE_LIMITED/);
});
