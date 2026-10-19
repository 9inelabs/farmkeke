// A-55 Riders: Farmkeke's own riders, the areas they cover, and their day.
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { normalizeNigerianPhone } from "../lib/phone";
import { DAY } from "../lib/settings";

const ON_THE_ROAD = ["ready_for_rider", "out_for_delivery", "with_rider"];

function cleanName(name: string) {
  const n = name.trim();
  if (n.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
  if (n.length > 80) throw new ConvexError({ code: "NAME_TOO_LONG" });
  return n;
}

function cleanPhone(phone: string) {
  const p = normalizeNigerianPhone(phone);
  if (p === null) throw new ConvexError({ code: "INVALID_PHONE" });
  return p;
}

async function checkAreas(ctx: MutationCtx, ids: Id<"serviceAreas">[]) {
  const unique = [...new Set(ids)];
  for (const id of unique) {
    if ((await ctx.db.get("serviceAreas", id)) === null) throw new ConvexError({ code: "UNKNOWN_AREA" });
  }
  return unique;
}

/** Every rider with their areas, open jobs and deliveries since `dayStart` (the client's local midnight). */
export const list = query({
  args: { dayStart: v.number() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "riders.view");
    const riders = await ctx.db.query("riders").take(200);
    const areaNames = new Map<string, string>();
    const rows = await Promise.all(
      riders.map(async (r) => {
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_riderId", (q) => q.eq("riderId", r._id))
          .order("desc")
          .take(200);
        const areas = [];
        for (const id of r.serviceAreaIds) {
          if (!areaNames.has(id)) areaNames.set(id, (await ctx.db.get("serviceAreas", id))?.name ?? "");
          areas.push({ _id: id, name: areaNames.get(id) ?? "" });
        }
        return {
          _id: r._id,
          name: r.name,
          phone: r.phone,
          active: r.active,
          serviceAreas: areas,
          activeJobs: orders.filter((o) => ON_THE_ROAD.includes(o.status)).length,
          deliveriesToday: orders.filter(
            (o) =>
              (o.deliveredAt !== undefined && o.deliveredAt >= args.dayStart && o.deliveredAt < args.dayStart + DAY) ||
              (o.arrivedAt !== undefined && o.arrivedAt >= args.dayStart && o.arrivedAt < args.dayStart + DAY),
          ).length,
        };
      }),
    );
    return rows.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: { name: v.string(), phone: v.string(), reason: v.string(), serviceAreaIds: v.array(v.id("serviceAreas")) },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "riders.manage");
    const name = cleanName(args.name);
    const phone = cleanPhone(args.phone);
    const serviceAreaIds = await checkAreas(ctx, args.serviceAreaIds);
    const riderId = await ctx.db.insert("riders", { name, phone, serviceAreaIds, active: true });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "rider.create",
      targetTable: "riders",
      targetId: riderId,
      reason: args.reason,
      details: { name, phone },
    });
    return riderId;
  },
});

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    reason: v.string(),
    riderId: v.id("riders"),
    serviceAreaIds: v.optional(v.array(v.id("serviceAreas"))),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "riders.manage");
    const rider = await ctx.db.get("riders", args.riderId);
    if (rider === null) throw new ConvexError({ code: "NOT_FOUND" });
    const patch = {
      ...(args.name !== undefined ? { name: cleanName(args.name) } : {}),
      ...(args.phone !== undefined ? { phone: cleanPhone(args.phone) } : {}),
      ...(args.serviceAreaIds !== undefined ? { serviceAreaIds: await checkAreas(ctx, args.serviceAreaIds) } : {}),
    };
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "rider.update",
      targetTable: "riders",
      targetId: rider._id,
      reason: args.reason,
      details: { before: { name: rider.name, phone: rider.phone, serviceAreaIds: rider.serviceAreaIds }, after: patch },
    });
    await ctx.db.patch("riders", rider._id, patch);
  },
});

export const setActive = mutation({
  args: { active: v.boolean(), reason: v.string(), riderId: v.id("riders") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "riders.manage");
    const rider = await ctx.db.get("riders", args.riderId);
    if (rider === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (rider.active === args.active) return;
    await writeAudit(ctx, {
      actorId: staff._id,
      action: args.active ? "rider.activate" : "rider.deactivate",
      targetTable: "riders",
      targetId: rider._id,
      reason: args.reason,
      details: { name: rider.name },
    });
    await ctx.db.patch("riders", rider._id, { active: args.active });
  },
});
