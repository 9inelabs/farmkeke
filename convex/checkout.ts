// Cart and checkout (M-30 to M-41, W-20 to W-24). The cart lives on the
// device; these functions check it against the server, then `place` turns it
// into one checkout (one payment) and one order per farm.
//
// Pickup is at each farm and is paid at once. Delivery is placed unpaid and
// without a delivery fee: farms accept, staff price each delivery, and the
// shopper pays the bill afterwards (lib/bill.ts).
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getViewer, requireUser } from "./lib/auth";
import { isOutOfStock } from "./lib/listing";
import {
  checkoutReference,
  logOrderEvent,
  newPickupCode,
  orderNumber,
  restoreStock,
  takeStock,
  transition,
  SYSTEM,
} from "./lib/orders";
import { MAX_OPEN_BILLS } from "./lib/bill";
import { notifyConsumer, notifyFarm, smsSending } from "./lib/notify";
import { looksLikeEmail, normalizeNigerianPhone } from "./lib/phone";
import { hitLimit } from "./lib/rateLimit";
import { getRules, HOUR, slotCapacityReader } from "./lib/settings";
import { responseTimeHours } from "./lib/shop";
import { fulfilment as fulfilmentValidator } from "./schema";

const MAX_LINES = 50;
// W-23 "Note for the rider"
const MAX_NOTE = 200;
// Nigeria is UTC+1 all year (no daylight saving).
const WAT_OFFSET = 3_600_000;
const SLOTS = [
  { from: "09:00", to: "12:00" },
  { from: "12:00", to: "15:00" },
  { from: "15:00", to: "18:00" },
];
const WINDOW_DAYS = 14;

type CartItem = { listingId: string; unitId: string; quantity: number; priceKobo?: number };

type Change = {
  kind: "unavailable" | "sold_out" | "price" | "quantity";
  listingId: string;
  unitId: string;
  name: string;
  oldPriceKobo?: number;
  priceKobo?: number;
  oldQuantity?: number;
  quantity?: number;
};

/** Checks a cart against live listings, stock and prices (M-32 Cart changed). */
export async function buildQuote(
  ctx: QueryCtx,
  args: { items: CartItem[]; fulfilment?: "delivery" | "pickup"; serviceAreaId?: string },
) {
  if (args.items.length > MAX_LINES) throw new ConvexError({ code: "TOO_MANY_ITEMS" });
  const areaId = args.serviceAreaId ? ctx.db.normalizeId("serviceAreas", args.serviceAreaId) : null;
  const areaDoc = areaId ? await ctx.db.get("serviceAreas", areaId) : null;
  const area = areaDoc !== null && areaDoc.active ? areaDoc : null;

  // Merge repeated lines for the same listing and unit.
  const merged = new Map<string, CartItem>();
  for (const item of args.items) {
    const key = `${item.listingId}:${item.unitId}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + item.quantity } : { ...item });
  }

  const lineOf = (
    listing: Doc<"listings">,
    unit: Doc<"listings">["units"][number],
    unitDoc: Doc<"units"> | null,
    quantity: number,
    imageUrl: string | null,
  ) => ({
    listingId: listing._id,
    unitId: unit.unitId,
    name: listing.name,
    imageUrl,
    priceKobo: unit.priceKobo,
    quantity,
    lineTotalKobo: unit.priceKobo * quantity,
    stock: unit.stock,
    minOrder: unit.minOrder,
    unitSingular: unitDoc?.singular ?? "unit",
    unitPlural: unitDoc?.plural ?? "units",
    delivery: listing.delivery,
    pickup: listing.pickup,
    photoId: listing.photoIds[0] as Id<"_storage"> | undefined,
  });

  const changes: Change[] = [];
  const farms = new Map<
    Id<"farms">,
    { farm: Doc<"farms">; farmPhotoUrl: string | null; lines: Array<ReturnType<typeof lineOf>> }
  >();
  for (const item of merged.values()) {
    const listingId = ctx.db.normalizeId("listings", item.listingId);
    const listing = listingId ? await ctx.db.get("listings", listingId) : null;
    const base = { listingId: item.listingId, unitId: item.unitId, name: listing?.name ?? "This item" };
    if (listing === null || listing.status !== "live" || listing.deletedAt !== undefined) {
      changes.push({ kind: "unavailable", ...base });
      continue;
    }
    const farm = farms.get(listing.farmId)?.farm ?? (await ctx.db.get("farms", listing.farmId));
    if (farm === null || farm.status !== "active" || farm.holidayMode) {
      changes.push({ kind: "unavailable", ...base });
      continue;
    }
    const unit = listing.units.find((u) => u.unitId === item.unitId);
    if (unit === undefined) {
      changes.push({ kind: "unavailable", ...base });
      continue;
    }
    if (unit.stock <= 0 || unit.minOrder > unit.stock) {
      changes.push({ kind: "sold_out", ...base });
      continue;
    }
    let quantity = Math.max(1, Math.floor(item.quantity));
    const wanted = quantity;
    if (quantity > unit.stock) quantity = unit.stock;
    if (quantity < unit.minOrder) quantity = unit.minOrder;
    if (quantity !== wanted) changes.push({ kind: "quantity", ...base, oldQuantity: wanted, quantity });
    if (item.priceKobo !== undefined && item.priceKobo !== unit.priceKobo) {
      changes.push({ kind: "price", ...base, oldPriceKobo: item.priceKobo, priceKobo: unit.priceKobo });
    }
    const unitDoc = await ctx.db.get("units", unit.unitId);
    const imageUrl = listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null;
    let group = farms.get(farm._id);
    if (group === undefined) {
      group = {
        farm,
        farmPhotoUrl: farm.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null,
        lines: [],
      };
      farms.set(farm._id, group);
    }
    group.lines.push(lineOf(listing, unit, unitDoc, quantity, imageUrl));
  }

  const rules = farms.size > 0 ? await getRules(ctx) : null;
  const farmRows = await Promise.all(
    [...farms.values()].map(async ({ farm, farmPhotoUrl, lines }) => {
      const itemsTotalKobo = lines.reduce((sum, l) => sum + l.lineTotalKobo, 0);
      // Delivery is priced by staff after the farm accepts (the bill)
      const deliveryFeeKobo = 0;
      return {
        farmId: farm._id,
        farmName: farm.name,
        farmArea: farm.lga,
        // Pickup is at the farm: where it is, roughly, and when it hands over
        collectionArea: `${farm.lga}, ${farm.state}`,
        collectionHours: farm.collectionHours,
        farmPhotoUrl,
        lines,
        itemsTotalKobo,
        deliveryFeeKobo,
        totalKobo: itemsTotalKobo + deliveryFeeKobo,
        // W-20 "Usually accepts within 2 hours": the median of the farm's recent
        // payment-to-acceptance times (null with no history), and the deadline
        responseTimeHours: await responseTimeHours(ctx, farm._id),
        acceptsWithinHours: rules?.farmerResponseHours ?? 24,
      };
    }),
  );
  const allLines = farmRows.flatMap((f) => f.lines.map((l) => ({ ...l, farmName: f.farmName })));
  const blocker = (l: (typeof allLines)[number]) => ({ listingId: l.listingId, name: l.name, farmName: l.farmName });
  const itemsTotalKobo = farmRows.reduce((s, f) => s + f.itemsTotalKobo, 0);
  const deliveryFeeKobo = farmRows.reduce((s, f) => s + f.deliveryFeeKobo, 0);
  return {
    area:
      area === null
        ? null
        : {
            _id: area._id,
            name: area.name,
            lga: area.lga,
            state: area.state,
            // No fixed fee any more: delivery is priced per order
            deliveryFeeKobo: 0,
            latitude: area.latitude,
            longitude: area.longitude,
          },
    changes,
    // Lines that can't be delivered / picked up (M-33 option cards)
    deliveryBlockers: allLines.filter((l) => !l.delivery).map(blocker),
    pickupBlockers: allLines.filter((l) => !l.pickup).map(blocker),
    farms: farmRows.map((f) => ({ ...f, lines: f.lines.map(({ photoId: _p, ...l }) => l) })),
    itemsTotalKobo,
    deliveryFeeKobo,
    totalKobo: itemsTotalKobo + deliveryFeeKobo,
    // Delivery: the fee is added to the bill once staff have priced it
    deliveryFeeLater: args.fulfilment !== "pickup",
    // Internal: the raw lines with photo ids, for `place`
    _farms: farmRows,
  };
}

const cartItem = v.object({
  listingId: v.string(),
  unitId: v.string(),
  quantity: v.number(),
  priceKobo: v.optional(v.number()),
});

/** M-30 / W-20: the cart, checked against the server. */
export const quote = query({
  args: {
    items: v.array(cartItem),
    fulfilment: v.optional(fulfilmentValidator),
    serviceAreaId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { _farms, ...result } = await buildQuote(ctx, args);
    return result;
  },
});

/** M-19 / W-12: what the add-to-cart sheet needs about one listing. */
export const listingForCart = query({
  args: { listingId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("listings", args.listingId);
    const listing = id ? await ctx.db.get("listings", id) : null;
    if (listing === null || listing.deletedAt !== undefined) return null;
    const farm = await ctx.db.get("farms", listing.farmId);
    if (farm === null) return null;
    const units = await Promise.all(
      listing.units.map(async (u) => {
        const unit = await ctx.db.get("units", u.unitId);
        return {
          unitId: u.unitId,
          singular: unit?.singular ?? "unit",
          plural: unit?.plural ?? "units",
          priceKobo: u.priceKobo,
          stock: u.stock,
          minOrder: u.minOrder,
        };
      }),
    );
    return {
      id: listing._id,
      name: listing.name,
      imageUrl: listing.photoIds[0] ? await ctx.storage.getUrl(listing.photoIds[0]) : null,
      available:
        listing.status === "live" && farm.status === "active" && !farm.holidayMode && !isOutOfStock(listing.units),
      delivery: listing.delivery,
      pickup: listing.pickup,
      farmId: farm._id,
      farmName: farm.name,
      units,
    };
  },
});

const dayKey = (ms: number) => new Date(ms + WAT_OFFSET).toISOString().slice(0, 10);
/** Epoch ms of "YYYY-MM-DD HH:MM" in Nigerian time. */
const watTime = (day: string, hhmm: string) => Date.parse(`${day}T${hhmm}:00Z`) - WAT_OFFSET;

/** A delivery window as W-23 shows it: open, or closed because it's full or too soon. */
type SlotState = { from: string; to: string; open: boolean; reason?: "full" | "too_soon" };

// Orders that no longer need a rider don't take a place in a slot.
const FREES_SLOT: Doc<"orders">["status"][] = ["cancelled", "declined", "expired"];
const SLOT_COUNT_SCAN = 5000;

/** Delivery orders already booked in each slot of one day in one area. */
async function bookedSlots(ctx: QueryCtx, day: string, serviceAreaId: Id<"serviceAreas">) {
  const counts = new Map<string, number>();
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_window_day_and_address_serviceAreaId", (q) =>
      q.eq("window.day", day).eq("address.serviceAreaId", serviceAreaId),
    )
    .take(SLOT_COUNT_SCAN);
  for (const o of orders) {
    if (o.fulfilment !== "delivery" || o.window === undefined || FREES_SLOT.includes(o.status)) continue;
    counts.set(o.window.from, (counts.get(o.window.from) ?? 0) + 1);
  }
  return counts;
}

/**
 * Delivery days and windows every farm in the cart can make. With an area,
 * slots at their capacity (platformSettings) are "full"; `newOrders` is how
 * many orders this cart would add (one per farm).
 */
async function windowsFor(
  ctx: QueryCtx,
  farmIds: string[],
  now: number,
  opts: { serviceAreaId?: Id<"serviceAreas"> | null; newOrders?: number } = {},
) {
  const farms: Doc<"farms">[] = [];
  for (const raw of farmIds.slice(0, 20)) {
    const id = ctx.db.normalizeId("farms", raw);
    const farm = id ? await ctx.db.get("farms", id) : null;
    if (farm !== null) farms.push(farm);
  }
  if (farms.some((f) => f.status !== "active" || f.holidayMode)) return { days: [], allDays: [], readyDay: null };
  // The rider collects once every farm has had its lead time.
  const readyAt = now + Math.max(0, ...farms.map((f) => f.leadTimeHours)) * 3_600_000;
  const areaId = opts.serviceAreaId ?? null;
  const capacityOf = areaId === null ? null : await slotCapacityReader(ctx);
  const need = Math.max(1, opts.newOrders ?? farms.length);
  // `days` keeps its original shape (open slots only, days with one or more);
  // `allSlots` / `allDays` add every slot with why it's closed (W-23 "Full").
  const days: { day: string; slots: { from: string; to: string }[]; allSlots: SlotState[] }[] = [];
  const allDays: { day: string; slots: SlotState[] }[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = dayKey(now + i * 86_400_000);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (!farms.every((f) => f.openDays.includes(weekday))) continue;
    const inTime = SLOTS.map((s) => watTime(day, s.from) >= readyAt);
    if (!inTime.some(Boolean)) continue;
    const limits = SLOTS.map((s) => (capacityOf && areaId ? capacityOf(areaId, s.from) : null));
    const booked = areaId !== null && limits.some((l) => l !== null) ? await bookedSlots(ctx, day, areaId) : null;
    const all: SlotState[] = SLOTS.map((s, j) => {
      if (!inTime[j]) return { from: s.from, to: s.to, open: false, reason: "too_soon" as const };
      const limit = limits[j];
      if (limit !== null && limit !== undefined && (booked?.get(s.from) ?? 0) + need > limit) {
        return { from: s.from, to: s.to, open: false, reason: "full" as const };
      }
      return { from: s.from, to: s.to, open: true };
    });
    allDays.push({ day, slots: all });
    const open = all.filter((s) => s.open).map((s) => ({ from: s.from, to: s.to }));
    if (open.length > 0) days.push({ day, slots: open, allSlots: all });
  }
  // The first day the farms can make, whether or not its slots are full
  return { days, allDays, readyDay: allDays[0]?.day ?? null };
}

/**
 * M-36 / W-22 / W-23: delivery days and time windows. `now` is the device's
 * clock. With `serviceAreaId`, slots that are full in that area say so.
 */
export const deliveryWindows = query({
  args: { farmIds: v.array(v.string()), now: v.number(), serviceAreaId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const areaId = args.serviceAreaId ? ctx.db.normalizeId("serviceAreas", args.serviceAreaId) : null;
    return await windowsFor(ctx, args.farmIds, args.now, { serviceAreaId: areaId });
  },
});

/**
 * W-24 "Ready from Sun 18 Oct": the first day the order can wait at the point.
 * The rider brings it once the farms are ready (`handoverDay`), on a day the
 * point is open.
 */
function pointReadyDay(handoverDay: string | null, hours: Doc<"pickupPoints">["hours"]) {
  if (handoverDay === null) return null;
  const openDays = new Set(hours.map((h) => h.day));
  const start = Date.parse(`${handoverDay}T12:00:00Z`);
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    if (openDays.has(new Date(`${day}T12:00:00Z`).getUTCDay())) return day;
  }
  return null;
}

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/** M-37 / W-23: active pickup points, nearest first when a position is known. */
export const pickupPoints = query({
  args: {
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    serviceAreaId: v.optional(v.string()),
    state: v.optional(v.string()),
    // Phase 5 (W-24 "Ready from …" per point): the cart's farms and the device's clock
    farmIds: v.optional(v.array(v.string())),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const areaId = args.serviceAreaId ? ctx.db.normalizeId("serviceAreas", args.serviceAreaId) : null;
    const area = areaId ? await ctx.db.get("serviceAreas", areaId) : null;
    const handoverDay =
      args.farmIds !== undefined && args.farmIds.length > 0 && args.now !== undefined
        ? (await windowsFor(ctx, args.farmIds, args.now)).readyDay
        : null;
    const state = args.state ?? area?.state;
    const points =
      state === undefined
        ? await ctx.db
            .query("pickupPoints")
            .withIndex("by_active_and_state", (q) => q.eq("active", true))
            .take(200)
        : await ctx.db
            .query("pickupPoints")
            .withIndex("by_active_and_state", (q) => q.eq("active", true).eq("state", state))
            .take(200);
    const rules = await getRules(ctx);
    const lat = args.latitude;
    const lng = args.longitude;
    const rows = await Promise.all(
      points.map(async (p) => ({
        _id: p._id,
        name: p.name,
        address: p.address,
        state: p.state,
        lga: p.lga,
        latitude: p.latitude,
        longitude: p.longitude,
        hours: p.hours,
        phone: p.phone,
        // PRD: orders wait at least 3 days at the point
        collectWithinDays: Math.max(rules.pickupHoldDays, p.collectWithinDays),
        photoUrl: p.photoStorageId ? await ctx.storage.getUrl(p.photoStorageId) : null,
        distanceKm:
          lat === undefined || lng === undefined
            ? null
            : Math.round(distanceKm(lat, lng, p.latitude, p.longitude) * 10) / 10,
        // "YYYY-MM-DD"; null without farmIds and now
        readyDay: pointReadyDay(handoverDay, p.hours),
      })),
    );
    if (lat !== undefined && lng !== undefined) rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return rows;
  },
});

/** M-39 / W-24: prefill contact details from the account or the last order. */
export const contactDefaults = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null) return { name: null, phone: null, email: null };
    const last = await ctx.db
      .query("checkouts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    return {
      name: user.isAnonymous ? (last?.contact.name ?? null) : (user.name ?? last?.contact.name ?? null),
      phone: user.phone ?? last?.contact.phone ?? null,
      email: user.isAnonymous ? (last?.contact.email ?? null) : (user.email ?? null),
    };
  },
});

/**
 * M-41 Pay / W-24: places the cart as one checkout and one order per farm.
 * Pickup: the checkout awaits payment now, and stock is held until payment or
 * until it's abandoned. Delivery: the orders go to the farms unpaid and the
 * checkout awaits its bill; stock is held until the bill is paid or lapses.
 * Throws CART_CHANGED when the server's view differs.
 */
export const place = mutation({
  args: {
    items: v.array(
      v.object({ listingId: v.string(), unitId: v.string(), quantity: v.number(), priceKobo: v.number() }),
    ),
    fulfilment: fulfilmentValidator,
    expectedTotalKobo: v.number(),
    address: v.optional(
      v.object({
        addressId: v.optional(v.string()),
        street: v.optional(v.string()),
        landmark: v.optional(v.string()),
        serviceAreaId: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        saveAs: v.optional(v.union(v.literal("home"), v.literal("work"), v.literal("other"))),
        // Phase 5 (W-23): "Note for the rider", up to 200 characters
        note: v.optional(v.string()),
      }),
    ),
    // Ignored: pickup is at the farm, and delivery times are agreed with the rider.
    // Kept so an older website or app can still place orders.
    pickupPointId: v.optional(v.string()),
    window: v.optional(v.object({ day: v.string(), from: v.string(), to: v.string() })),
    contact: v.optional(
      v.object({ name: v.optional(v.string()), phone: v.optional(v.string()), email: v.optional(v.string()) }),
    ),
    // A checkout still awaiting payment that this one replaces (shopper went back)
    replaces: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.blockedAt !== undefined) throw new ConvexError({ code: "BLOCKED" });
    if (args.items.length === 0) throw new ConvexError({ code: "CART_EMPTY" });
    // Each checkout holds stock for an hour, so cap how many one identity opens.
    await hitLimit(ctx, `place:${user._id}`, 20, HOUR);

    // Release the checkout being replaced first, so its stock counts again.
    let replaces: Id<"checkouts"> | undefined;
    if (args.replaces) {
      const oldId = ctx.db.normalizeId("checkouts", args.replaces);
      const old = oldId ? await ctx.db.get("checkouts", oldId) : null;
      // Only an unpaid pickup checkout can be replaced; bills have their own lifecycle
      if (old !== null && old.userId === user._id && old.status === "awaiting_payment" && old.payBy === undefined) {
        await abandonCheckout(ctx, old, "replaced");
        replaces = old._id;
      }
    }

    // Where it goes
    let address: Doc<"orders">["address"];
    let serviceAreaId: string | undefined;
    if (args.fulfilment === "delivery") {
      const a = args.address;
      if (a === undefined) throw new ConvexError({ code: "ADDRESS_REQUIRED" });
      let street = a.street?.trim() ?? "";
      let landmark = a.landmark?.trim() ?? "";
      let areaRaw = a.serviceAreaId;
      let latitude = a.latitude;
      let longitude = a.longitude;
      let note = a.note?.trim();
      if (a.addressId) {
        const savedId = ctx.db.normalizeId("addresses", a.addressId);
        const saved = savedId ? await ctx.db.get("addresses", savedId) : null;
        if (saved === null || saved.userId !== user._id) throw new ConvexError({ code: "ADDRESS_NOT_FOUND" });
        street = saved.street;
        landmark = saved.landmark;
        areaRaw = saved.serviceAreaId;
        latitude = latitude ?? saved.latitude;
        longitude = longitude ?? saved.longitude;
        // The address's saved directions, unless this order has its own note
        note = note ?? saved.directions;
      }
      if (street.length === 0) throw new ConvexError({ code: "STREET_REQUIRED" });
      if (landmark.length === 0) throw new ConvexError({ code: "LANDMARK_REQUIRED" });
      if (note !== undefined && note.length > MAX_NOTE) throw new ConvexError({ code: "NOTE_TOO_LONG", max: MAX_NOTE });
      const areaId = areaRaw ? ctx.db.normalizeId("serviceAreas", areaRaw) : null;
      const area = areaId ? await ctx.db.get("serviceAreas", areaId) : null;
      if (area === null || !area.active) throw new ConvexError({ code: "AREA_NOT_SERVED" });
      serviceAreaId = area._id;
      address = {
        street: street.slice(0, 200),
        landmark: landmark.slice(0, 200),
        serviceAreaId: area._id,
        areaName: area.name,
        lga: area.lga,
        state: area.state,
        latitude,
        longitude,
        note: note || undefined,
      };
      if (a.saveAs && !a.addressId && !user.isAnonymous) {
        const existing = await ctx.db
          .query("addresses")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .take(20);
        if (existing.length < 20) {
          await ctx.db.insert("addresses", {
            userId: user._id,
            label: a.saveAs,
            street: address.street,
            landmark: address.landmark,
            serviceAreaId: area._id,
            latitude,
            longitude,
            isDefault: existing.length === 0,
            directions: note || undefined,
          });
        }
      }
    }

    // Who to contact (M-39)
    const name = (args.contact?.name ?? user.name ?? "").trim();
    const phone = normalizeNigerianPhone(args.contact?.phone ?? user.phone ?? "");
    const emailRaw = (args.contact?.email ?? (user.isAnonymous ? "" : (user.email ?? ""))).trim().toLowerCase();
    if (name.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
    if (phone === null) throw new ConvexError({ code: "INVALID_PHONE" });
    if (emailRaw.length > 0 && !looksLikeEmail(emailRaw)) throw new ConvexError({ code: "INVALID_EMAIL" });
    // The delivery bill goes by email and SMS; until texts really send, email is the only way it reaches a guest.
    if (args.fulfilment === "delivery" && emailRaw.length === 0 && !smsSending()) {
      throw new ConvexError({ code: "EMAIL_REQUIRED" });
    }
    const contact = { name: name.slice(0, 80), phone, email: emailRaw || undefined };

    // Farms pack unpaid delivery orders, so cap how many one person can have open.
    if (args.fulfilment === "delivery") {
      const mine = await ctx.db
        .query("checkouts")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(50);
      const byPhone = [
        ...(await ctx.db
          .query("checkouts")
          .withIndex("by_contact_phone_and_status", (q) => q.eq("contact.phone", phone).eq("status", "awaiting_bill"))
          .take(MAX_OPEN_BILLS)),
        ...(await ctx.db
          .query("checkouts")
          .withIndex("by_contact_phone_and_status", (q) => q.eq("contact.phone", phone).eq("status", "awaiting_payment"))
          .take(MAX_OPEN_BILLS + 1)),
      ].filter((c) => c.fulfilment === "delivery");
      const openBill = (c: Doc<"checkouts">) =>
        c.fulfilment === "delivery" && (c.status === "awaiting_bill" || c.status === "awaiting_payment");
      if (mine.filter(openBill).length >= MAX_OPEN_BILLS || byPhone.length >= MAX_OPEN_BILLS) {
        throw new ConvexError({
          code: "TOO_MANY_UNPAID",
          message: "You have unpaid delivery orders waiting. Pay or cancel one before placing another.",
        });
      }
    }

    // Check the cart again on the server
    const quoted = await buildQuote(ctx, { items: args.items, fulfilment: args.fulfilment, serviceAreaId });
    if (quoted.changes.length > 0) throw new ConvexError({ code: "CART_CHANGED", changes: quoted.changes });
    const blockers = args.fulfilment === "delivery" ? quoted.deliveryBlockers : quoted.pickupBlockers;
    if (blockers.length > 0) throw new ConvexError({ code: "FULFILMENT_NOT_OFFERED", blockers });
    if (quoted.totalKobo !== args.expectedTotalKobo) {
      throw new ConvexError({ code: "TOTAL_CHANGED", totalKobo: quoted.totalKobo });
    }

    const delivery = args.fulfilment === "delivery";
    const checkoutId = await ctx.db.insert("checkouts", {
      userId: user._id,
      reference: await checkoutReference(ctx),
      status: delivery ? "awaiting_bill" : "awaiting_payment",
      fulfilment: args.fulfilment,
      address,
      contact,
      itemsTotalKobo: quoted.itemsTotalKobo,
      deliveryFeeKobo: quoted.deliveryFeeKobo,
      totalKobo: quoted.totalKobo,
      replaces,
    });

    const actor = { kind: user.isAnonymous ? ("guest" as const) : ("consumer" as const), id: user._id };
    const rules = await getRules(ctx);
    const now = Date.now();
    const orders: { orderId: Id<"orders">; number: string; farmName: string; totalKobo: number }[] = [];
    for (const farm of quoted._farms) {
      const items = farm.lines.map((l) => ({
        listingId: l.listingId,
        unitId: l.unitId,
        name: l.name,
        unitSingular: l.unitSingular,
        unitPlural: l.unitPlural,
        priceKobo: l.priceKobo,
        quantity: l.quantity,
        photoId: l.photoId,
      }));
      await takeStock(ctx, items);
      const number = await orderNumber(ctx);
      // Delivery orders go to the farm now, unpaid, with the usual 24 hours to answer
      const respondBy = delivery ? now + rules.farmerResponseHours * HOUR : undefined;
      const orderId = await ctx.db.insert("orders", {
        checkoutId,
        userId: user._id,
        farmId: farm.farmId,
        number,
        status: delivery ? "placed" : "awaiting_payment",
        escrow: "none",
        fulfilment: args.fulfilment,
        items,
        itemsTotalKobo: farm.itemsTotalKobo,
        deliveryFeeKobo: 0,
        totalKobo: farm.itemsTotalKobo,
        address,
        pickupCode: delivery ? undefined : newPickupCode(),
        contact,
        respondBy,
      });
      await logOrderEvent(ctx, orderId, delivery ? "placed" : "awaiting_payment", actor);
      if (delivery) {
        const expiryJobId = await ctx.scheduler.runAt(respondBy!, internal.orders.system.expireOne, { orderId });
        await ctx.db.patch("orders", orderId, { expiryJobId });
        const order = (await ctx.db.get("orders", orderId))!;
        await notifyFarm(
          ctx,
          order,
          "order_new",
          "New delivery order",
          `Order ${number} is waiting. Accept or decline within ${rules.farmerResponseHours} hours. ` +
            "The shopper pays once Farmkeke has priced the delivery; the rider only collects after that.",
        );
        await notifyConsumer(
          ctx,
          order,
          "order_received",
          `Order ${number} received`,
          `We've sent it to ${farm.farmName}. Once they accept, we'll arrange a rider and send your bill, delivery included.`,
        );
      }
      orders.push({ orderId, number, farmName: farm.farmName, totalKobo: farm.itemsTotalKobo });
    }
    const checkout = (await ctx.db.get("checkouts", checkoutId))!;
    return {
      checkoutId,
      reference: checkout.reference,
      totalKobo: checkout.totalKobo,
      orders,
      // Pickup is paid now; delivery is paid when the bill comes
      payNow: !delivery,
    };
  },
});

/** Cancels an unpaid checkout and puts its stock back. */
export async function abandonCheckout(
  ctx: MutationCtx,
  checkout: Doc<"checkouts">,
  reason: "replaced" | "payment_not_completed",
) {
  if (checkout.status !== "awaiting_payment") return;
  const now = Date.now();
  await ctx.db.patch("checkouts", checkout._id, { status: "abandoned", abandonedAt: now });
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
    .take(50);
  for (const order of orders) {
    if (order.status !== "awaiting_payment") continue;
    await transition(ctx, order, "cancelled", SYSTEM, { endedAt: now, cancelReason: reason }, reason);
    await restoreStock(ctx, order);
  }
  const attempts = await ctx.db
    .query("paymentAttempts")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
    .take(20);
  for (const a of attempts) {
    if (a.status === "started" || a.status === "opened") {
      await ctx.db.patch("paymentAttempts", a._id, { status: "abandoned" });
    }
  }
}

/** Cron: unpaid checkouts older than an hour give their stock back. */
export const abandonStale = internalMutation({
  args: { olderThanMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMinutes ?? 60) * 60_000;
    // Delivery bills (payBy set) have their own 12 hours (lib/bill.ts)
    const stale = (
      await ctx.db
        .query("checkouts")
        .withIndex("by_status", (q) => q.eq("status", "awaiting_payment").lt("_creationTime", cutoff))
        .take(200)
    )
      .filter((c) => c.payBy === undefined)
      .slice(0, 50);
    let abandoned = 0;
    for (const checkout of stale) {
      // A payment page still open keeps the checkout alive a little longer.
      const open = await ctx.db
        .query("paymentAttempts")
        .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout._id))
        .order("desc")
        .first();
      if (open !== null && open.status === "opened" && open._creationTime > cutoff) continue;
      await abandonCheckout(ctx, checkout, "payment_not_completed");
      abandoned++;
    }
    return { abandoned };
  },
});
