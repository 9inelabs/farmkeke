// Cart and checkout (M-30 to M-41, W-20 to W-24). The cart lives on the
// device; these functions check it against the server, then `place` turns it
// into one checkout (one payment) and one order per farm.
import { ConvexError, v } from "convex/values";
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
import { looksLikeEmail, normalizeNigerianPhone } from "./lib/phone";
import { hitLimit } from "./lib/rateLimit";
import { getRules, HOUR } from "./lib/settings";
import { fulfilment as fulfilmentValidator } from "./schema";

const MAX_LINES = 50;
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
  const charged = args.fulfilment !== "pickup" && area !== null;

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

  const farmRows = [...farms.values()].map(({ farm, farmPhotoUrl, lines }) => {
    const itemsTotalKobo = lines.reduce((sum, l) => sum + l.lineTotalKobo, 0);
    const deliveryFeeKobo = charged ? area!.deliveryFeeKobo : 0;
    return {
      farmId: farm._id,
      farmName: farm.name,
      farmArea: farm.lga,
      farmPhotoUrl,
      lines,
      itemsTotalKobo,
      deliveryFeeKobo,
      totalKobo: itemsTotalKobo + deliveryFeeKobo,
    };
  });
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
            deliveryFeeKobo: area.deliveryFeeKobo,
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

/** Delivery days and windows every farm in the cart can make. */
async function windowsFor(ctx: QueryCtx, farmIds: string[], now: number) {
  const farms: Doc<"farms">[] = [];
  for (const raw of farmIds.slice(0, 20)) {
    const id = ctx.db.normalizeId("farms", raw);
    const farm = id ? await ctx.db.get("farms", id) : null;
    if (farm !== null) farms.push(farm);
  }
  if (farms.some((f) => f.status !== "active" || f.holidayMode)) return { days: [], readyDay: null };
  // The rider collects once every farm has had its lead time.
  const readyAt = now + Math.max(0, ...farms.map((f) => f.leadTimeHours)) * 3_600_000;
  const days: { day: string; slots: { from: string; to: string }[] }[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = dayKey(now + i * 86_400_000);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (!farms.every((f) => f.openDays.includes(weekday))) continue;
    const slots = SLOTS.filter((s) => watTime(day, s.from) >= readyAt);
    if (slots.length > 0) days.push({ day, slots });
  }
  return { days, readyDay: days[0]?.day ?? null };
}

/** M-36 / W-22: delivery days and time windows. `now` is the device's clock. */
export const deliveryWindows = query({
  args: { farmIds: v.array(v.string()), now: v.number() },
  handler: async (ctx, args) => await windowsFor(ctx, args.farmIds, args.now),
});

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
  },
  handler: async (ctx, args) => {
    const areaId = args.serviceAreaId ? ctx.db.normalizeId("serviceAreas", args.serviceAreaId) : null;
    const area = areaId ? await ctx.db.get("serviceAreas", areaId) : null;
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
 * M-41 Pay / W-24: places the cart as one checkout awaiting payment and one
 * order per farm. Stock is held until payment or until the checkout is
 * abandoned. Throws CART_CHANGED when the server's view differs.
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
      }),
    ),
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
      if (old !== null && old.userId === user._id && old.status === "awaiting_payment") {
        await abandonCheckout(ctx, old, "replaced");
        replaces = old._id;
      }
    }

    // Where it goes
    let address: Doc<"orders">["address"];
    let pickupPointId: Id<"pickupPoints"> | undefined;
    let serviceAreaId: string | undefined;
    if (args.fulfilment === "delivery") {
      const a = args.address;
      if (a === undefined) throw new ConvexError({ code: "ADDRESS_REQUIRED" });
      let street = a.street?.trim() ?? "";
      let landmark = a.landmark?.trim() ?? "";
      let areaRaw = a.serviceAreaId;
      let latitude = a.latitude;
      let longitude = a.longitude;
      if (a.addressId) {
        const savedId = ctx.db.normalizeId("addresses", a.addressId);
        const saved = savedId ? await ctx.db.get("addresses", savedId) : null;
        if (saved === null || saved.userId !== user._id) throw new ConvexError({ code: "ADDRESS_NOT_FOUND" });
        street = saved.street;
        landmark = saved.landmark;
        areaRaw = saved.serviceAreaId;
        latitude = latitude ?? saved.latitude;
        longitude = longitude ?? saved.longitude;
      }
      if (street.length === 0) throw new ConvexError({ code: "STREET_REQUIRED" });
      if (landmark.length === 0) throw new ConvexError({ code: "LANDMARK_REQUIRED" });
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
          });
        }
      }
    } else {
      const pointId = args.pickupPointId ? ctx.db.normalizeId("pickupPoints", args.pickupPointId) : null;
      const point = pointId ? await ctx.db.get("pickupPoints", pointId) : null;
      if (point === null || !point.active) throw new ConvexError({ code: "PICKUP_POINT_REQUIRED" });
      pickupPointId = point._id;
    }

    // Who to contact (M-39)
    const name = (args.contact?.name ?? user.name ?? "").trim();
    const phone = normalizeNigerianPhone(args.contact?.phone ?? user.phone ?? "");
    const emailRaw = (args.contact?.email ?? (user.isAnonymous ? "" : (user.email ?? ""))).trim().toLowerCase();
    if (name.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
    if (phone === null) throw new ConvexError({ code: "INVALID_PHONE" });
    if (emailRaw.length > 0 && !looksLikeEmail(emailRaw)) throw new ConvexError({ code: "INVALID_EMAIL" });
    const contact = { name: name.slice(0, 80), phone, email: emailRaw || undefined };

    // Check the cart again on the server
    const quoted = await buildQuote(ctx, { items: args.items, fulfilment: args.fulfilment, serviceAreaId });
    if (quoted.changes.length > 0) throw new ConvexError({ code: "CART_CHANGED", changes: quoted.changes });
    const blockers = args.fulfilment === "delivery" ? quoted.deliveryBlockers : quoted.pickupBlockers;
    if (blockers.length > 0) throw new ConvexError({ code: "FULFILMENT_NOT_OFFERED", blockers });
    if (quoted.totalKobo !== args.expectedTotalKobo) {
      throw new ConvexError({ code: "TOTAL_CHANGED", totalKobo: quoted.totalKobo });
    }

    // Delivery window must be one the farms can make (M-36)
    let window: Doc<"orders">["window"];
    if (args.fulfilment === "delivery") {
      if (args.window === undefined) throw new ConvexError({ code: "WINDOW_REQUIRED" });
      const w = args.window;
      const { days } = await windowsFor(ctx, quoted._farms.map((f) => f.farmId), Date.now());
      const ok = days.some((d) => d.day === w.day && d.slots.some((s) => s.from === w.from && s.to === w.to));
      if (!ok) throw new ConvexError({ code: "WINDOW_UNAVAILABLE" });
      window = { day: w.day, from: w.from, to: w.to };
    }

    const checkoutId = await ctx.db.insert("checkouts", {
      userId: user._id,
      reference: await checkoutReference(ctx),
      status: "awaiting_payment",
      fulfilment: args.fulfilment,
      address,
      pickupPointId,
      window,
      contact,
      itemsTotalKobo: quoted.itemsTotalKobo,
      deliveryFeeKobo: quoted.deliveryFeeKobo,
      totalKobo: quoted.totalKobo,
      replaces,
    });

    const actor = { kind: user.isAnonymous ? ("guest" as const) : ("consumer" as const), id: user._id };
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
      const orderId = await ctx.db.insert("orders", {
        checkoutId,
        userId: user._id,
        farmId: farm.farmId,
        number,
        status: "awaiting_payment",
        escrow: "none",
        fulfilment: args.fulfilment,
        items,
        itemsTotalKobo: farm.itemsTotalKobo,
        deliveryFeeKobo: farm.deliveryFeeKobo,
        totalKobo: farm.totalKobo,
        address,
        pickupPointId,
        pickupCode: args.fulfilment === "pickup" ? newPickupCode() : undefined,
        window,
        contact,
      });
      await logOrderEvent(ctx, orderId, "awaiting_payment", actor);
      orders.push({ orderId, number, farmName: farm.farmName, totalKobo: farm.totalKobo });
    }
    const checkout = (await ctx.db.get("checkouts", checkoutId))!;
    return { checkoutId, reference: checkout.reference, totalKobo: checkout.totalKobo, orders };
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
    const stale = await ctx.db
      .query("checkouts")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_payment").lt("_creationTime", cutoff))
      .take(50);
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
