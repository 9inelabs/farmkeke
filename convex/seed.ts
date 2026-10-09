// Starting configuration data. Idempotent: inserts what is missing and never
// overwrites rows staff have since edited.
//   npx convex run seed:run
import { internalMutation } from "./_generated/server";

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
