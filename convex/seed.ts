// Starting configuration data. Idempotent: inserts what is missing and never
// overwrites rows staff have since edited.
//   npx convex run seed:run
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { insertListing, patchListing } from "./lib/listingCounts";

const CATEGORIES = [
  { slug: "vegetables", name: "Vegetables", illustration: "vegetables" },
  { slug: "fruits", name: "Fruits", illustration: "fruits" },
  { slug: "grains-tubers", name: "Grains & Tubers", illustration: "grains-tubers" },
  { slug: "poultry-eggs", name: "Poultry & Eggs", illustration: "poultry-eggs" },
  { slug: "meat-fish", name: "Meat & Fish", illustration: "meat-fish" },
  { slug: "herbs-spices", name: "Herbs & Spices", illustration: "herbs-spices" },
  { slug: "legumes-nuts", name: "Legumes & Nuts", illustration: "legumes-nuts" },
  { slug: "dairy", name: "Dairy", illustration: "dairy" },
];

// Launch units from the Screen Inventory (A-81).
const UNITS = [
  { slug: "kg", singular: "kg", plural: "kg" },
  { slug: "basket", singular: "basket", plural: "baskets" },
  { slug: "tuber", singular: "tuber", plural: "tubers" },
  { slug: "crate", singular: "crate", plural: "crates" },
  { slug: "bunch", singular: "bunch", plural: "bunches" },
  { slug: "derica", singular: "derica", plural: "dericas" },
  { slug: "mudu", singular: "mudu", plural: "mudus" },
  { slug: "paint-bucket", singular: "paint bucket", plural: "paint buckets" },
  { slug: "tray-of-eggs", singular: "tray of eggs", plural: "trays of eggs" },
  { slug: "piece", singular: "piece", plural: "pieces" },
  { slug: "bag", singular: "bag", plural: "bags" },
];

// PLACEHOLDER service areas and pickup points, taken from the design mockups.
// Replace with real coverage, fees, addresses and coordinates before launch.
const DELIVERY_FEE_KOBO = 1_000_00; // ₦1,000 per farm order

// Centres and radii are rough placeholders for matching GPS to an area (M-05).
const SERVICE_AREAS = [
  { state: "Imo", name: "New Owerri", lga: "Owerri North", latitude: 5.4705, longitude: 7.027, radiusKm: 3 },
  { state: "Imo", name: "Ikenegbu", lga: "Owerri Municipal", latitude: 5.4985, longitude: 7.034, radiusKm: 2 },
  { state: "Imo", name: "World Bank", lga: "Owerri North", latitude: 5.47, longitude: 7.0006, radiusKm: 2.5 },
  { state: "Imo", name: "Orlu", lga: "Orlu", latitude: 5.7957, longitude: 7.0351, radiusKm: 6 },
  { state: "Imo", name: "Okigwe", lga: "Okigwe", latitude: 5.8292, longitude: 7.35, radiusKm: 6 },
  { state: "Imo", name: "Mbaise", lga: "Aboh Mbaise", latitude: 5.45, longitude: 7.23, radiusKm: 8 },
];

const MON_SAT = [1, 2, 3, 4, 5, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const hours = (days: number[], opens: string, closes: string) =>
  days.map((day) => ({ day, opens, closes }));

const PICKUP_POINTS = [
  {
    name: "Farmkeke Pickup · Ikenegbu",
    address: "22 Ikenegbu Layout, beside Access Bank",
    state: "Imo",
    lga: "Owerri Municipal",
    latitude: 5.4986,
    longitude: 7.0342,
    hours: hours(MON_SAT, "08:00", "19:00"),
    phone: "+2348035550142",
  },
  {
    name: "Farmkeke Pickup · World Bank",
    address: "World Bank Housing Estate, Umuguma Road",
    state: "Imo",
    lga: "Owerri North",
    latitude: 5.4697,
    longitude: 7.0006,
    hours: hours(MON_SAT, "09:00", "18:00"),
    phone: "+2348035550143",
  },
  {
    name: "Farmkeke Pickup · Douglas Road",
    address: "Douglas Road, Owerri",
    state: "Imo",
    lga: "Owerri Municipal",
    latitude: 5.4836,
    longitude: 7.0333,
    hours: hours(EVERY_DAY, "08:00", "20:00"),
    phone: "+2348035550144",
  },
  {
    name: "Farmkeke Pickup · Enugu GRA",
    address: "Independence Layout, GRA",
    state: "Enugu",
    lga: "Enugu North",
    latitude: 6.4519,
    longitude: 7.5139,
    hours: hours(MON_SAT, "08:00", "18:00"),
    phone: "+2348035550145",
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const added = { categories: 0, units: 0, serviceAreas: 0, pickupPoints: 0, appConfig: 0 };

    for (const [index, category] of CATEGORIES.entries()) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", category.slug))
        .unique();
      if (existing === null) {
        await ctx.db.insert("categories", { ...category, sortOrder: index + 1, hidden: false });
        added.categories++;
      }
    }

    for (const [index, unit] of UNITS.entries()) {
      const existing = await ctx.db
        .query("units")
        .withIndex("by_slug", (q) => q.eq("slug", unit.slug))
        .unique();
      if (existing === null) {
        await ctx.db.insert("units", { ...unit, sortOrder: index + 1, retired: false });
        added.units++;
      }
    }

    for (const [index, area] of SERVICE_AREAS.entries()) {
      const existing = await ctx.db
        .query("serviceAreas")
        .withIndex("by_state_and_name", (q) => q.eq("state", area.state).eq("name", area.name))
        .unique();
      if (existing === null) {
        await ctx.db.insert("serviceAreas", {
          ...area,
          deliveryFeeKobo: DELIVERY_FEE_KOBO,
          active: true,
          sortOrder: index + 1,
        });
        added.serviceAreas++;
      } else if (existing.latitude === undefined) {
        // Backfill for areas seeded before centres existed (Phase 1)
        await ctx.db.patch("serviceAreas", existing._id, {
          latitude: area.latitude,
          longitude: area.longitude,
          radiusKm: area.radiusKm,
        });
      }
    }

    for (const point of PICKUP_POINTS) {
      const existing = await ctx.db
        .query("pickupPoints")
        .withIndex("by_name", (q) => q.eq("name", point.name))
        .unique();
      if (existing === null) {
        await ctx.db.insert("pickupPoints", { ...point, collectWithinDays: 2, active: true });
        added.pickupPoints++;
      }
    }

    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "app"))
      .unique();
    if (config === null) {
      await ctx.db.insert("appConfig", {
        key: "app",
        minAppVersion: "1.0.0",
        latestAppVersion: "1.0.0",
        maintenanceActive: false,
      });
      added.appConfig++;
    }

    return added;
  },
});

// DEMO produce for looking at the shopping screens during development: the
// items from the Home design, with no photos. Never run this on production.
//   npx convex run seed:demoStorefront '{"today":"2026-10-11"}'
// Run it again on a later day to move "Picked Today" to that day.
const DEMO_NOTE = "Demo listing for design review.";
const DEMO_LISTINGS = [
  { name: "Fresh tomatoes", category: "vegetables", unit: "basket", priceKobo: 4_500_00, pickedToday: true },
  { name: "Yam tubers", category: "grains-tubers", unit: "tuber", priceKobo: 5_500_00, pickedToday: true },
  { name: "Oshombo pepper", category: "vegetables", unit: "basket", priceKobo: 6_000_00, pickedToday: true },
  { name: "Ugwu leaves", category: "vegetables", unit: "bunch", priceKobo: 800_00, pickedToday: false },
  { name: "Ripe plantain", category: "fruits", unit: "bunch", priceKobo: 3_500_00, pickedToday: false },
  { name: "Brown eggs", category: "poultry-eggs", unit: "tray-of-eggs", priceKobo: 4_200_00, pickedToday: false },
];

export const demoStorefront = internalMutation({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    const farms = (
      await ctx.db
        .query("farms")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .take(20)
    ).filter((farm) => !farm.holidayMode);
    if (farms.length === 0) return { added: 0, updated: 0, banner: false, note: "No open farms to list produce under." };

    let added = 0;
    let updated = 0;
    let yam = null;
    for (const [index, item] of DEMO_LISTINGS.entries()) {
      const farm = farms[index % farms.length];
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", item.category))
        .unique();
      const unit = await ctx.db
        .query("units")
        .withIndex("by_slug", (q) => q.eq("slug", item.unit))
        .unique();
      if (category === null || unit === null) continue;
      const harvestedOn = item.pickedToday ? args.today : undefined;
      const live = await ctx.db
        .query("listings")
        .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id).eq("status", "live"))
        .take(200);
      const existing = live.find((l) => l.name === item.name && l.description === DEMO_NOTE);
      let listingId = existing?._id;
      if (existing === undefined) {
        listingId = await insertListing(ctx, {
          farmId: farm._id,
          status: "live",
          name: item.name,
          categoryId: category._id,
          description: DEMO_NOTE,
          harvestedOn,
          photoIds: [],
          units: [{ unitId: unit._id, priceKobo: item.priceKobo, stock: 40, minOrder: 1 }],
          delivery: true,
          pickup: true,
          submittedAt: Date.now(),
          liveAt: Date.now(),
        });
        added++;
      } else if (existing.harvestedOn !== harvestedOn) {
        await patchListing(ctx, existing, { harvestedOn });
        updated++;
      }
      if (item.name === "Yam tubers") yam = listingId ?? null;
    }

    const banners = await ctx.db.query("homeBanners").take(1);
    const banner = banners.length === 0 && yam !== null;
    if (banner && yam !== null) {
      await ctx.db.insert("homeBanners", {
        tag: "Harvest of the week",
        title: "New-Season yam from Okigwe",
        buttonLabel: "Shop Yam",
        listingId: yam,
        active: true,
        sortOrder: 1,
      });
    }
    return { added, updated, banner };
  },
});
