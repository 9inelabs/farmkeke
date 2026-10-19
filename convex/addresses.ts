// M-84 Saved addresses, M-85 Add or edit address.
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getViewer, requireAccount } from "./lib/auth";

const MAX_ADDRESSES = 20;

const label = v.union(v.literal("home"), v.literal("work"), v.literal("other"));

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous) return [];
    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_ADDRESSES);
    const withAreas = await Promise.all(
      addresses.map(async (address) => {
        const area = await ctx.db.get("serviceAreas", address.serviceAreaId);
        return { ...address, area: area === null ? null : { name: area.name, state: area.state, lga: area.lga } };
      }),
    );
    // Default first, then oldest first
    return withAreas.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  },
});

export const get = query({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const address = await ctx.db.get("addresses", args.addressId);
    if (user === null || address === null || address.userId !== user._id) return null;
    const area = await ctx.db.get("serviceAreas", address.serviceAreaId);
    return { ...address, area: area === null ? null : { _id: area._id, name: area.name, state: area.state } };
  },
});

const MAX_DIRECTIONS = 200;

const fields = {
  label,
  street: v.string(),
  landmark: v.string(),
  serviceAreaId: v.id("serviceAreas"),
  isDefault: v.boolean(),
  // Phase 5 (W-46b): "Directions for the rider" and the map pin ("Set pin")
  directions: v.optional(v.string()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
};

const validPin = (lat: number | undefined, lng: number | undefined) =>
  lat === undefined && lng === undefined
    ? true
    : lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

async function validate(
  ctx: MutationCtx,
  args: { street: string; landmark: string; serviceAreaId: Id<"serviceAreas">; directions?: string; latitude?: number; longitude?: number },
) {
  const street = args.street.trim();
  const landmark = args.landmark.trim();
  if (street.length === 0) throw new ConvexError({ code: "STREET_REQUIRED" });
  if (landmark.length === 0) throw new ConvexError({ code: "LANDMARK_REQUIRED" });
  const directions = args.directions?.trim();
  if (directions !== undefined && directions.length > MAX_DIRECTIONS) {
    throw new ConvexError({ code: "DIRECTIONS_TOO_LONG", max: MAX_DIRECTIONS });
  }
  if (!validPin(args.latitude, args.longitude)) throw new ConvexError({ code: "INVALID_PIN" });
  const area = await ctx.db.get("serviceAreas", args.serviceAreaId);
  if (area === null || !area.active) throw new ConvexError({ code: "AREA_NOT_SERVED" });
  return { street, landmark, directions };
}

async function clearOtherDefaults(ctx: MutationCtx, userId: Id<"users">, keep: Id<"addresses">) {
  for await (const other of ctx.db.query("addresses").withIndex("by_userId", (q) => q.eq("userId", userId))) {
    if (other._id !== keep && other.isDefault) await ctx.db.patch("addresses", other._id, { isDefault: false });
  }
}

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const existing = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_ADDRESSES);
    if (existing.length >= MAX_ADDRESSES) throw new ConvexError({ code: "TOO_MANY_ADDRESSES" });
    const { street, landmark, directions } = await validate(ctx, args);
    // The first address is always the default.
    const isDefault = args.isDefault || existing.length === 0;
    const addressId = await ctx.db.insert("addresses", {
      userId: user._id,
      label: args.label,
      street,
      landmark,
      serviceAreaId: args.serviceAreaId,
      isDefault,
      directions: directions || undefined,
      latitude: args.latitude,
      longitude: args.longitude,
    });
    if (isDefault) await clearOtherDefaults(ctx, user._id, addressId);
    return addressId;
  },
});

export const update = mutation({
  args: { addressId: v.id("addresses"), ...fields },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const address = await ctx.db.get("addresses", args.addressId);
    if (address === null || address.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    const { street, landmark, directions } = await validate(ctx, args);
    // The default can't be switched off directly; choose another default instead.
    const isDefault = args.isDefault || address.isDefault;
    await ctx.db.patch("addresses", address._id, {
      label: args.label,
      street,
      landmark,
      serviceAreaId: args.serviceAreaId,
      isDefault,
      // Left out = unchanged (the app doesn't send these); "" clears the directions
      ...(args.directions !== undefined ? { directions: directions || undefined } : {}),
      ...(args.latitude !== undefined && args.longitude !== undefined
        ? { latitude: args.latitude, longitude: args.longitude }
        : {}),
    });
    if (isDefault) await clearOtherDefaults(ctx, user._id, address._id);
  },
});

export const remove = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const address = await ctx.db.get("addresses", args.addressId);
    if (address === null || address.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    await ctx.db.delete("addresses", address._id);
    if (address.isDefault) {
      const next = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();
      if (next !== null) await ctx.db.patch("addresses", next._id, { isDefault: true });
    }
  },
});
