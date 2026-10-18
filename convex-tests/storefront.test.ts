// Phase 3c: storefront search, filters and sorts, farm stats and counters,
// requestArea with a phone, and the dispute reply reminder.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T09:00:00Z"));
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.AUTH_RESEND_KEY;
});
afterEach(() => {
  vi.useRealTimers();
});

const TODAY = "2026-10-18";
// The shopper in Owerri
const OWERRI = { lat: 5.485, lng: 7.035 };
const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));
type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = async (fields: Record<string, unknown>) => {
      const id = await ctx.db.insert("users", fields as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      return { id, sessionId };
    };
    const guest = await user({ isAnonymous: true });
    const farmerA = await user({ name: "Farmer A", email: "a@example.com" });
    const farmerB = await user({ name: "Farmer B", email: "b@example.com" });
    const farmerC = await user({ name: "Farmer C", email: "c@example.com" });
    const admin = await user({ name: "Sam", email: "sam@example.com", staffRole: "super_admin" });
    const support = await user({ name: "Sue", email: "sue@example.com", staffRole: "support" });
    const ops = await user({ name: "Obi", email: "obi@example.com", staffRole: "operations" });
    const finance = await user({ name: "Fin", email: "fin@example.com", staffRole: "finance" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const veg = await ctx.db.insert("categories", {
      slug: "vegetables", name: "Vegetables", illustration: "vegetables", sortOrder: 1, hidden: false,
      subtypes: [{ slug: "tomatoes", name: "Tomatoes" }, { slug: "peppers", name: "Peppers" }],
    });
    const fruit = await ctx.db.insert("categories", { slug: "fruits", name: "Fruits", illustration: "fruits", sortOrder: 2, hidden: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 120000, active: true, sortOrder: 1 });
    const pointId = await ctx.db.insert("pickupPoints", { name: "Point", address: "Douglas Rd", state: "Imo", lga: "Owerri Municipal", latitude: 5.48, longitude: 7.03, hours, phone: "+2348035550144", collectWithinDays: 3, active: true });
    const appId = await ctx.db.insert("farmerApplications", { userId: farmerA.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farm = async (userId: any, name: string, lga: string, latitude?: number, longitude?: number) =>
      await ctx.db.insert("farms", {
        userId, applicationId: appId, name, phone: "+2348030000009", state: "Imo", lga, address: "x", latitude, longitude,
        farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
        openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
        accountName: name, status: "active", trusted: true,
      });
    // Okafor is ~1 km away, Ada Agro ~15 km, Nwosu has no position
    const okafor = await farm(farmerA.id, "Okafor Farms", "Owerri North", 5.49, 7.04);
    const ada = await farm(farmerB.id, "Ada Agro", "Mbaitoli", 5.6, 6.96);
    const nwosu = await farm(farmerC.id, "Nwosu Farms", "Owerri West");
    await ctx.db.insert("reviewStats", { farmId: okafor, count: 2, totalStars: 10, byStars: [0, 0, 0, 0, 2] });
    await ctx.db.insert("reviewStats", { farmId: ada, count: 3, totalStars: 12, byStars: [0, 0, 0, 3, 0] });
    let n = 0;
    const listing = async (farmId: any, name: string, priceKobo: number, extra: Record<string, unknown> = {}) =>
      await ctx.db.insert("listings", {
        farmId, status: "live", name, categoryId: veg, photoIds: [], delivery: true, pickup: true,
        units: [{ unitId, priceKobo, stock: 20, minOrder: 1 }], submittedAt: Date.now() + n, liveAt: Date.now() + n++, ...extra,
      } as any);
    const L = {
      freshTomatoes: await listing(okafor, "Fresh tomatoes", 450000, { subtype: "tomatoes", harvestedOn: "2026-10-18" }),
      cherry: await listing(ada, "Cherry tomatoes", 300000, { subtype: "tomatoes", harvestedOn: "2026-10-17", pickup: false }),
      roma: await listing(nwosu, "Roma tomatoes", 520000, { subtype: "tomatoes", harvestedOn: "2026-10-12" }),
      pepper: await listing(okafor, "Scotch bonnet pepper", 250000, { subtype: "peppers" }),
      soldOut: await listing(ada, "Green tomatoes", 280000, { units: [{ unitId, priceKobo: 280000, stock: 0, minOrder: 1 }] }),
      plantain: await listing(okafor, "Ripe plantain", 380000, { categoryId: fruit }),
      paused: await listing(okafor, "Old tomatoes", 100000, { status: "paused" }),
    };
    return { guest, farmerA, farmerB, farmerC, admin, support, ops, finance, unitId, veg, fruit, areaId, pointId, okafor, ada, nwosu, L };
  });
}

const names = (r: { items: { name: string }[] }) => r.items.map((i) => i.name);

test("search: listing name and farm name, with farm rows", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.mutation(internal.shopStats.rebuild, {});

  const r = await t.query(api.storefront.search, { text: "tomatoes", today: TODAY, ...OWERRI });
  expect(names(r).sort()).toEqual(["Cherry tomatoes", "Fresh tomatoes", "Green tomatoes", "Roma tomatoes"]);
  // Sold out listings come last; the paused one never shows
  expect(r.items.at(-1)).toMatchObject({ name: "Green tomatoes", inStock: false });
  expect(r.total).toBe(4);
  const fresh = r.items.find((i: any) => i.name === "Fresh tomatoes")!;
  expect(fresh).toMatchObject({
    farmId: s.okafor, farmName: "Okafor Farms", farmVerified: true, harvestedOn: "2026-10-18", freshness: "Harvested today",
    inStock: true, delivery: true, pickup: true, category: { slug: "vegetables", name: "Vegetables" }, subtype: "tomatoes", unit: "basket",
  });
  expect(fresh.distanceKm).toBeLessThan(2);
  expect(r.items.find((i: any) => i.name === "Cherry tomatoes")).toMatchObject({ freshness: "Harvested yesterday" });
  expect(r.items.find((i: any) => i.name === "Roma tomatoes")).toMatchObject({ freshness: "Harvested 6 days ago", distanceKm: null });
  // Farm rows with match counts
  const ok = r.farms.find((f: any) => f.name === "Okafor Farms")!;
  expect(ok).toMatchObject({ area: "Owerri North", rating: 5, ratingCount: 2, productCount: 3, matchCount: 1 });
  expect(r.farms.find((f: any) => f.name === "Ada Agro")).toMatchObject({ rating: 4, matchCount: 2 });

  // Farm-name search brings the farm's listings
  const byFarm = await t.query(api.storefront.search, { text: "Okafor" });
  expect(names(byFarm).sort()).toEqual(["Fresh tomatoes", "Ripe plantain", "Scotch bonnet pepper"]);
  expect(byFarm.farms[0]).toMatchObject({ name: "Okafor Farms", matchCount: 3 });
  // Category filter on search, empty text
  expect(names(await t.query(api.storefront.search, { text: "tomatoes", categorySlug: "fruits" }))).toEqual([]);
  expect(await t.query(api.storefront.search, { text: "  " })).toMatchObject({ items: [], total: 0 });
  // The live shape still works: no new args
  const plain = await t.query(api.storefront.search, { text: "pepper" });
  expect(plain.items[0]).toMatchObject({ name: "Scotch bonnet pepper", priceKobo: 250000, unit: "basket", imageUrl: null, freshness: null });
});

test("filters and sorts: rating, distance, harvested, subtype, nearest, top rated", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.mutation(internal.shopStats.rebuild, {});
  const cat = (args: Record<string, unknown>) => t.query(api.storefront.categoryListings, { slug: "vegetables", ...args } as any);

  const all = (await cat({}))!;
  expect(all.total).toBe(5);
  expect(all.category).toMatchObject({ id: s.veg, slug: "vegetables", productCount: 5, subtypes: [{ slug: "tomatoes", name: "Tomatoes", count: 3 }, { slug: "peppers", count: 1 }] });
  expect(all.farmCount).toBe(3);

  // Rating 4.5+ keeps Okafor only; unrated Nwosu is left out of any rating filter
  expect(names((await cat({ minRating: 4.5 }))!).sort()).toEqual(["Fresh tomatoes", "Scotch bonnet pepper"]);
  expect(names((await cat({ minRating: 4 }))!)).not.toContain("Roma tomatoes");
  // Within 5 km of Owerri: Okafor; within 20 km: Ada too; unknown positions never pass
  expect(names((await cat({ maxDistanceKm: 5, ...OWERRI }))!).sort()).toEqual(["Fresh tomatoes", "Scotch bonnet pepper"]);
  expect(names((await cat({ maxDistanceKm: 20, ...OWERRI }))!)).toHaveLength(4);
  await expect(cat({ maxDistanceKm: 5 })).rejects.toThrow(/LOCATION_REQUIRED/);
  // Harvested today / last 3 days
  expect(names((await cat({ harvestedWithinDays: 0, today: TODAY }))!)).toEqual(["Fresh tomatoes"]);
  expect(names((await cat({ harvestedWithinDays: 3, today: TODAY }))!).sort()).toEqual(["Cherry tomatoes", "Fresh tomatoes"]);
  await expect(cat({ harvestedWithinDays: 3 })).rejects.toThrow(/TODAY_REQUIRED/);
  // Subtype
  expect(names((await cat({ subtype: "tomatoes" }))!).sort()).toEqual(["Cherry tomatoes", "Fresh tomatoes", "Roma tomatoes"]);
  // Sorts
  expect(names((await cat({ sort: "nearest", ...OWERRI }))!)).toEqual(["Scotch bonnet pepper", "Fresh tomatoes", "Cherry tomatoes", "Roma tomatoes", "Green tomatoes"]);
  expect(names((await cat({ sort: "top_rated" }))!)).toEqual(["Scotch bonnet pepper", "Fresh tomatoes", "Cherry tomatoes", "Roma tomatoes", "Green tomatoes"]);
  expect(names((await cat({ sort: "price_low" }))!)).toEqual(["Scotch bonnet pepper", "Cherry tomatoes", "Fresh tomatoes", "Roma tomatoes", "Green tomatoes"]);
  expect(names((await cat({ sort: "freshest" }))!).slice(0, 3)).toEqual(["Fresh tomatoes", "Cherry tomatoes", "Roma tomatoes"]);
  // Old filters still work, and limit pages
  expect(names((await cat({ pickup: true, maxPriceKobo: 460000 }))!).sort()).toEqual(["Fresh tomatoes", "Green tomatoes", "Scotch bonnet pepper"]);
  expect(await cat({ limit: 2 })).toMatchObject({ hasMore: true, total: 5 });
  expect(await t.query(api.storefront.categoryListings, { slug: "nope" })).toBeNull();
  // Search takes the same filters
  expect(names(await t.query(api.storefront.search, { text: "tomatoes", minRating: 4.5, maxDistanceKm: 5, ...OWERRI }))).toEqual(["Fresh tomatoes"]);
  // Collection: in stock only, new sorts
  const coll = await t.query(api.storefront.collection, { kind: "fresh", today: TODAY, sort: "nearest", ...OWERRI });
  expect(coll.total).toBe(5);
  expect(coll.items[0].farmName).toBe("Okafor Farms");
  expect((await t.query(api.storefront.collection, { kind: "picked_today", today: TODAY })).items.map((i: any) => i.name)).toEqual(["Fresh tomatoes"]);
  // Home farm rows carry rating, product count and distance
  const home = await t.query(api.storefront.home, { today: TODAY, ...OWERRI });
  expect(home.farms[0]).toMatchObject({ name: "Okafor Farms", area: "Owerri North", rating: 5, ratingCount: 2, productCount: 3 });
  expect(home.pickedToday.map((i: any) => i.freshness)).toEqual(["Harvested today"]);
  // Categories with counts
  const cats = await t.query(api.catalog.listCategoriesWithCounts, {});
  expect(cats.map((c: any) => [c.slug, c.productCount])).toEqual([["vegetables", 5], ["fruits", 1]]);
});

test("counters follow listing and farm changes; subtypes admin; farm and product stats", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.mutation(internal.shopStats.rebuild, {});
  const count = async () => (await t.query(api.catalog.listCategoriesWithCounts, {}))[0];
  const farmerA = as(t, s.farmerA);

  // Pause, resume, delete, holiday mode, suspend
  await farmerA.mutation(api.listings.bulkAction, { listingIds: [s.L.pepper], action: "pause" });
  expect(await count()).toMatchObject({ productCount: 4, subtypes: [{ count: 3 }, { count: 0 }] });
  await farmerA.mutation(api.listings.bulkAction, { listingIds: [s.L.pepper], action: "resume" });
  expect((await count()).productCount).toBe(5);
  await farmerA.mutation(api.farms.updateAvailability, { openDays: [1, 2, 3], holidayMode: true });
  expect(await count()).toMatchObject({ productCount: 3, subtypes: [{ count: 2 }, { count: 0 }] });
  expect(names(await t.query(api.storefront.search, { text: "Okafor" }))).toEqual([]);
  await farmerA.mutation(api.farms.updateAvailability, { openDays: [1, 2, 3], holidayMode: false });
  await as(t, s.admin).mutation(api.admin.farmers.setSuspended, { farmId: s.ada, suspended: true, reason: "Checks" });
  expect((await count()).productCount).toBe(3);
  expect(await t.query(api.storefront.farm, { id: s.ada })).toBeNull();
  await as(t, s.admin).mutation(api.admin.farmers.setSuspended, { farmId: s.ada, suspended: false, reason: "Cleared" });
  expect((await count()).productCount).toBe(5);
  // Subtype change through saveDetails moves the subtype counts
  await farmerA.mutation(api.listings.saveDetails, { listingId: s.L.pepper, name: "Scotch bonnet pepper", categoryId: s.veg, description: "Hot", subtype: "tomatoes" });
  expect(await count()).toMatchObject({ productCount: 5, subtypes: [{ count: 4 }, { count: 0 }] });
  await expect(farmerA.mutation(api.listings.saveDetails, { listingId: s.L.pepper, name: "x", categoryId: s.veg, description: "", subtype: "melons" })).rejects.toThrow(/UNKNOWN_SUBTYPE/);
  await farmerA.mutation(api.listings.bulkAction, { listingIds: [s.L.pepper], action: "delete" });
  expect(await count()).toMatchObject({ productCount: 4, subtypes: [{ count: 3 }, { count: 0 }] });
  // The rebuild agrees with the running counts
  await t.mutation(internal.shopStats.rebuild, {});
  expect(await count()).toMatchObject({ productCount: 4, subtypes: [{ count: 3 }, { count: 0 }] });

  // Admin subtypes
  await expect(as(t, s.support).mutation(api.admin.catalog.setSubtypes, { categoryId: s.veg, subtypes: [], reason: "x" })).rejects.toThrow(/FORBIDDEN/);
  await expect(as(t, s.ops).mutation(api.admin.catalog.setSubtypes, { categoryId: s.veg, subtypes: [{ slug: "a", name: "A" }, { slug: "a", name: "B" }], reason: "x" })).rejects.toThrow(/own slug/);
  await as(t, s.ops).mutation(api.admin.catalog.setSubtypes, { categoryId: s.veg, subtypes: [{ slug: "tomatoes", name: "Tomatoes" }, { slug: "leafy-greens", name: "Leafy greens" }], reason: "W-03 chips" });
  expect((await count()).subtypes).toEqual([{ slug: "tomatoes", name: "Tomatoes", count: 3 }, { slug: "leafy-greens", name: "Leafy greens", count: 0 }]);

  // Response time: a paid order accepted 2 hours later, another after 4 hours
  const buyer = as(t, s.guest);
  for (const wait of [2, 4]) {
    const placed = await buyer.mutation(api.checkout.place, {
      items: [{ listingId: s.L.freshTomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
      fulfilment: "pickup", expectedTotalKobo: 450000, pickupPointId: s.pointId, contact: { name: "Chidi Okeke", phone: "0803 111 2222" },
    });
    await buyer.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
    vi.advanceTimersByTime(wait * 3_600_000);
    await farmerA.mutation(api.orders.farmer.accept, { orderId: placed.orders[0].orderId });
  }
  const farm = (await t.query(api.storefront.farm, { id: s.okafor, today: TODAY, ...OWERRI }))!;
  expect(farm).toMatchObject({
    name: "Okafor Farms", rating: 5, ratingCount: 2, verified: true, onBreak: false, area: "Owerri North",
    productCount: 2, delivery: true, pickup: true, responseTimeHours: 3, acceptsWithinHours: 24,
  });
  expect(farm.categories.map((c: any) => [c.slug, c.count]).sort()).toEqual([["fruits", 1], ["vegetables", 1]]);
  expect(farm.listings.map((l: any) => l.category.slug).sort()).toEqual(["fruits", "vegetables"]);
  expect(farm.distanceKm).toBeLessThan(2);
  expect((await t.query(api.storefront.farm, { id: s.nwosu }))!).toMatchObject({ responseTimeHours: null, rating: null, ratingCount: 0, distanceKm: null });
  expect(await t.query(api.storefront.farm, { id: "not-an-id" })).toBeNull();
  // The rebuild reads the same response times back from orderEvents
  await t.mutation(internal.shopStats.rebuild, {});
  expect((await t.query(api.storefront.farm, { id: s.okafor }))!.responseTimeHours).toBe(3);

  // Product page
  const p: any = await t.query(api.storefront.product, { id: s.L.freshTomatoes, today: TODAY, ...OWERRI, serviceAreaId: s.areaId });
  expect(p).toMatchObject({
    available: true, inStock: true, freshness: "Harvested today", subtype: "tomatoes", deliveryFeeKobo: 120000,
    deliveryArea: { name: "New Owerri", lga: "Owerri North" }, category: { slug: "vegetables" },
    farm: { id: s.okafor, rating: 5, ratingCount: 2, responseTimeHours: 3, acceptsWithinHours: 24, verified: true },
  });
  expect(p.farm.distanceKm).toBeLessThan(2);
  expect(p.moreFromFarm.map((l: any) => l.name)).toEqual(["Ripe plantain"]);
  expect(p.similar.map((l: any) => l.name)).not.toContain("Fresh tomatoes");
  expect(await t.query(api.storefront.product, { id: s.L.freshTomatoes })).toMatchObject({ deliveryFeeKobo: null, deliveryArea: null, freshness: null });
  expect(await t.query(api.storefront.product, { id: s.L.paused })).toMatchObject({ available: false, reason: "not_live", name: "Old tomatoes" });
  expect(await t.query(api.storefront.product, { id: "nope" })).toBeNull();
  // Popular: ordered listings first
  expect((await t.query(api.storefront.popular, {}))[0].name).toBe("Fresh tomatoes");
  expect(await t.query(api.storefront.farmAreas, {})).toEqual([
    { lga: "Mbaitoli", state: "Imo" }, { lga: "Owerri North", state: "Imo" }, { lga: "Owerri West", state: "Imo" },
  ]);
});

test("requestArea takes a phone, an email or both", async () => {
  const t = convexTest(schema, modules);
  await seed(t);
  await t.mutation(api.areas.requestArea, { place: "Aba", phone: "0803 123 4567" });
  await t.mutation(api.areas.requestArea, { place: "Aba", phone: "+234 803 123 4567" }); // same person, same place: once
  await t.mutation(api.areas.requestArea, { place: "Aba", email: "Ngozi@Example.com" });
  await t.mutation(api.areas.requestArea, { place: "Umuahia", email: "ngozi@example.com", phone: "08031234567" });
  await expect(t.mutation(api.areas.requestArea, { place: "Aba" })).rejects.toThrow(/CONTACT_REQUIRED/);
  await expect(t.mutation(api.areas.requestArea, { place: "Aba", phone: "12345" })).rejects.toThrow(/INVALID_PHONE/);
  await expect(t.mutation(api.areas.requestArea, { place: "Aba", email: "nope" })).rejects.toThrow(/INVALID_EMAIL/);
  const rows = await t.run(async (ctx) => await ctx.db.query("areaRequests").collect());
  expect(rows.map((r) => [r.place, r.email ?? null, r.phone ?? null])).toEqual([
    ["Aba", null, "+2348031234567"],
    ["Aba", "ngozi@example.com", null],
    ["Umuahia", "ngozi@example.com", "+2348031234567"],
  ]);
});

test("problem report: staff alert, farm reminder 2h before the 12h deadline, overdue at 12h", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const guest = as(t, s.guest);
  const admin = as(t, s.admin);
  const farmer = as(t, s.farmerA);
  const page = { cursor: null, numItems: 20 };

  let riderId: any = null;
  const report = async () => {
    const placed = await guest.mutation(api.checkout.place, {
      items: [{ listingId: s.L.freshTomatoes, unitId: s.unitId, quantity: 1, priceKobo: 450000 }],
      fulfilment: "pickup", expectedTotalKobo: 450000, pickupPointId: s.pointId, contact: { name: "Chidi Okeke", phone: "0803 111 2222" },
    });
    await guest.mutation(api.payments.checkout.markPaidTest, { checkoutId: placed.checkoutId });
    const orderId = placed.orders[0].orderId;
    await farmer.mutation(api.orders.farmer.accept, { orderId });
    await farmer.mutation(api.orders.farmer.startPreparing, { orderId });
    await farmer.mutation(api.orders.farmer.readyForRider, { orderId });
    riderId ??= await admin.mutation(api.admin.riders.create, { name: "Emeka", phone: "08035550000", reason: "New rider", serviceAreaIds: [s.areaId] });
    await admin.mutation(api.admin.dispatch.assignRider, { orderId, riderId, collectAt: Date.now() + 3600_000 });
    await admin.mutation(api.admin.dispatch.recordStep, { orderId, step: "collected_from_farm" });
    await admin.mutation(api.admin.dispatch.recordStep, { orderId, step: "dropped_at_pickup_point" });
    const order = await t.run(async (ctx) => (await ctx.db.get(orderId))!);
    await admin.mutation(api.admin.dispatch.recordStep, { orderId, step: "collected_by_consumer", pickupCode: order.pickupCode });
    return await guest.mutation(api.disputes.open, { orderId, itemIndexes: [0], note: "Soft", photoIds: [], reason: "damaged" });
  };
  const farmAlerts = async (kind: string) =>
    await t.run(async (ctx) => (await ctx.db.query("notifications").collect()).filter((n) => n.kind === kind && n.side === "farm"));

  const { disputeId, number } = await report();
  // Staff alert: support and operations only
  const supportAlerts = await as(t, s.support).query(api.admin.staff.alerts, { paginationOpts: page });
  expect(supportAlerts.page[0]).toMatchObject({ kind: "dispute_opened", side: "staff", title: `Problem reported: ${number}` });
  expect((await as(t, s.ops).query(api.admin.staff.alerts, { paginationOpts: page })).page).toHaveLength(1);
  expect((await as(t, s.finance).query(api.admin.staff.alerts, { paginationOpts: page })).page).toHaveLength(0);
  expect(await as(t, s.support).query(api.admin.staff.unreadAlerts, {})).toBe(1);
  await expect(guest.query(api.admin.staff.alerts, { paginationOpts: page })).rejects.toThrow(/FORBIDDEN|ACCOUNT_REQUIRED/);
  // Staff alerts never reach the shop or farm inbox
  expect((await as(t, s.support).query(api.notifications.list, { side: "shop", paginationOpts: page })).page).toHaveLength(0);

  // 9h59m: no reminder yet; 10h: the farm is reminded once
  vi.advanceTimersByTime(10 * 3_600_000 - 60_000);
  await t.finishInProgressScheduledFunctions();
  expect(await farmAlerts("dispute_reply_reminder")).toHaveLength(0);
  vi.advanceTimersByTime(60_000);
  await t.finishInProgressScheduledFunctions();
  const reminders = await farmAlerts("dispute_reply_reminder");
  expect(reminders).toHaveLength(1);
  expect(reminders[0]).toMatchObject({ title: `Reply needed: ${number}` });
  expect(reminders[0].body).toMatch(/within 2 hours/);
  // 12h: overdue, staff alerted
  vi.advanceTimersByTime(2 * 3_600_000);
  await t.finishInProgressScheduledFunctions();
  const d = await t.run(async (ctx) => (await ctx.db.get(disputeId))!);
  expect(d.farmReplyOverdueAt).toBeDefined();
  expect((await farmer.query(api.disputes.get, { disputeId }))!.farmReplyOverdue).toBe(true);
  expect((await as(t, s.support).query(api.admin.staff.alerts, { paginationOpts: page })).page[0]).toMatchObject({ kind: "dispute_reply_overdue" });
  await as(t, s.support).mutation(api.admin.staff.markAlertsRead, {});
  expect(await as(t, s.support).query(api.admin.staff.unreadAlerts, {})).toBe(0);

  // A farm that replies in time gets no reminder and is never overdue
  const second = await report();
  await farmer.mutation(api.disputes.respond, { disputeId: second.disputeId, note: "Will refund", photoIds: [] });
  vi.advanceTimersByTime(13 * 3_600_000);
  await t.finishInProgressScheduledFunctions();
  expect(await farmAlerts("dispute_reply_reminder")).toHaveLength(1);
  const d2 = await t.run(async (ctx) => (await ctx.db.get(second.disputeId))!);
  expect(d2.farmReplyOverdueAt).toBeUndefined();
});

test("every field in the live samples is still returned", async () => {
  const fs = await import("node:fs");
  const sample = (name: string) => JSON.parse(fs.readFileSync(`C:/Users/Guesttt/Documents/farmkeke/web/convex-spec/samples/storefront.${name}.json`, "utf8"));
  // Every key path in `want` exists in `got` (arrays compared by their first element)
  const missing = (want: any, got: any, path = ""): string[] => {
    if (Array.isArray(want)) return want.length && Array.isArray(got) && got.length ? missing(want[0], got[0], `${path}[0]`) : [];
    if (want === null || typeof want !== "object") return [];
    if (got === null || typeof got !== "object") return [`${path} (got ${got})`];
    return Object.keys(want).flatMap((k) => (k in got ? missing(want[k], got[k], `${path}.${k}`) : [`${path}.${k}`]));
  };
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.mutation(internal.shopStats.rebuild, {});
  await t.run(async (ctx) => {
    await ctx.db.insert("homeBanners", { tag: "Harvest of the week", title: "T", buttonLabel: "Shop", listingId: s.L.freshTomatoes, active: true, sortOrder: 1 });
  });
  const got: Record<string, any> = {
    home: await t.query(api.storefront.home, { today: TODAY }),
    collection: await t.query(api.storefront.collection, { kind: "fresh", today: TODAY }),
    categoryListings: await t.query(api.storefront.categoryListings, { slug: "vegetables" }),
    search: await t.query(api.storefront.search, { text: "tomatoes" }),
    farm: await t.query(api.storefront.farm, { id: s.okafor }),
    product: await t.query(api.storefront.product, { id: s.L.freshTomatoes }),
    popular: await t.query(api.storefront.popular, {}),
    farmAreas: await t.query(api.storefront.farmAreas, {}),
  };
  for (const [name, value] of Object.entries(got)) expect([name, missing(sample(name), value)]).toEqual([name, []]);
  expect(missing(sample("home.area"), got.home)).toEqual([]);
});
