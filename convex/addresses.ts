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

const fields = {
  label,
  street: v.string(),
  landmark: v.string(),
  serviceAreaId: v.id("serviceAreas"),
  isDefault: v.boolean(),
};

async function validate(ctx: MutationCtx, args: { street: string; landmark: string; serviceAreaId: Id<"serviceAreas"> }) {
  const street = args.street.trim();
  const landmark = args.landmark.trim();
  if (street.length === 0) throw new ConvexError({ code: "STREET_REQUIRED" });
  if (landmark.length === 0) throw new ConvexError({ code: "LANDMARK_REQUIRED" });
  const area = await ctx.db.get("serviceAreas", args.serviceAreaId);
  if (area === null || !area.active) throw new ConvexError({ code: "AREA_NOT_SERVED" });
  return { street, landmark };
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
    const { street, landmark } = await validate(ctx, args);
    // The first address is always the default.
    const isDefault = args.isDefault || existing.length === 0;
    const addressId = await ctx.db.insert("addresses", {
      userId: user._id,
      label: args.label,
      street,
      landmark,
      serviceAreaId: args.serviceAreaId,
      isDefault,
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
    const { street, landmark } = await validate(ctx, args);
    // The default can't be switched off directly; choose another default instead.
    const isDefault = args.isDefault || address.isDefault;
    await ctx.db.patch("addresses", address._id, {
      label: args.label,
      street,
      landmark,
      serviceAreaId: args.serviceAreaId,
      isDefault,
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
