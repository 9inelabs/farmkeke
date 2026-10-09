// Admin stand-ins for A-82 Pickup locations and A-83 Service areas and
// delivery fees, until the Farmkeke Admin Portal exists.
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { requireKobo, requireOpeningHours, requireText } from "../lib/validate";
import { openingHours } from "../schema";

const AREA_ROLES = ["operations" as const];

export const listAllServiceAreas = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, AREA_ROLES);
    return await ctx.db.query("serviceAreas").take(500);
  },
});

export const createServiceArea = mutation({
  args: {
    state: v.string(),
    name: v.string(),
    lga: v.string(),
    deliveryFeeKobo: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, AREA_ROLES);
    const state = requireText(args.state, "State");
    const name = requireText(args.name, "Area name");
    const existing = await ctx.db
      .query("serviceAreas")
      .withIndex("by_state_and_name", (q) => q.eq("state", state).eq("name", name))
      .unique();
    if (existing !== null) throw new ConvexError("This area already exists");
    const inState = await ctx.db
      .query("serviceAreas")
      .withIndex("by_state_and_name", (q) => q.eq("state", state))
      .take(500);
    const areaId = await ctx.db.insert("serviceAreas", {
      state,
      name,
      lga: requireText(args.lga, "LGA"),
      deliveryFeeKobo: requireKobo(args.deliveryFeeKobo, "Delivery fee"),
      active: true,
      sortOrder: inState.reduce((max, a) => Math.max(max, a.sortOrder), 0) + 1,
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "serviceArea.create",
      targetTable: "serviceAreas",
      targetId: areaId,
      reason: args.reason,
    });
    return areaId;
  },
});

export const updateServiceArea = mutation({
  args: {
    areaId: v.id("serviceAreas"),
    deliveryFeeKobo: v.optional(v.number()),
    active: v.optional(v.boolean()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, AREA_ROLES);
    const area = await ctx.db.get("serviceAreas", args.areaId);
    if (area === null) throw new ConvexError("Area not found");
    const changes = {
      ...(args.deliveryFeeKobo !== undefined && {
        deliveryFeeKobo: requireKobo(args.deliveryFeeKobo, "Delivery fee"),
      }),
      ...(args.active !== undefined && { active: args.active }),
    };
    await ctx.db.patch("serviceAreas", area._id, changes);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "serviceArea.update",
      targetTable: "serviceAreas",
      targetId: area._id,
      reason: args.reason,
      details: changes,
    });
  },
});

const pickupPointFields = {
  name: v.string(),
  address: v.string(),
  state: v.string(),
  lga: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  hours: openingHours,
  phone: v.string(),
  collectWithinDays: v.number(),
};

export const listAllPickupPoints = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, AREA_ROLES);
    return await ctx.db.query("pickupPoints").take(500);
  },
});

export const createPickupPoint = mutation({
  args: { ...pickupPointFields, reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, AREA_ROLES);
    const { reason, ...fields } = args;
    requireOpeningHours(fields.hours);
    const pointId = await ctx.db.insert("pickupPoints", {
      ...fields,
      name: requireText(fields.name, "Name"),
      address: requireText(fields.address, "Address"),
      active: true,
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "pickupPoint.create",
      targetTable: "pickupPoints",
      targetId: pointId,
      reason,
    });
    return pointId;
  },
});

export const updatePickupPoint = mutation({
  args: {
    pointId: v.id("pickupPoints"),
    ...v.object(pickupPointFields).partial().fields,
    active: v.optional(v.boolean()),
    photoStorageId: v.optional(v.id("_storage")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, AREA_ROLES);
    const { pointId, reason, ...changes } = args;
    const point = await ctx.db.get("pickupPoints", pointId);
    if (point === null) throw new ConvexError("Pickup point not found");
    if (changes.hours !== undefined) requireOpeningHours(changes.hours);
    await ctx.db.patch("pickupPoints", pointId, changes);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "pickupPoint.update",
      targetTable: "pickupPoints",
      targetId: pointId,
      reason,
      details: changes,
    });
  },
});
