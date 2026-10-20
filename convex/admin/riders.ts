// A-55 Riders: Farmkeke's own riders, the areas they cover, and their day.
// Staff add each rider with a profile (photo, ID, vehicle, guarantor, bank)
// that's reviewed before the rider can be dispatched.
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { BANKS, bankName } from "../lib/banks";
import { normalizeNigerianPhone } from "../lib/phone";
import { DAY } from "../lib/settings";
import { riderIdType, riderVehicle } from "../schema";

const ON_THE_ROAD = ["ready_for_rider", "out_for_delivery", "with_rider"];

/** Riders added before profiles existed count as approved. */
const reviewStatus = (r: Doc<"riders">) => r.reviewStatus ?? "approved";

const MOTOR: Doc<"riders">["vehicleType"][] = ["motorbike", "tricycle"];

/**
 * What a profile still needs before it can be approved: the vehicle, its
 * plate and model, and where the rider works. Photo, ID, guarantor and bank
 * details are kept when staff add them, but aren't required.
 */
function missing(r: Doc<"riders">): string[] {
  const out: string[] = [];
  if (!r.vehicleType) out.push("vehicle");
  if (r.vehicleType && r.vehicleType !== "bicycle" && !r.plateNumber) out.push("plate number");
  if (MOTOR.includes(r.vehicleType) && !r.bikeModel) out.push("bike model");
  if (r.serviceAreaIds.length === 0) out.push("area of operation");
  return out;
}

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
          reviewStatus: reviewStatus(r),
          vehicleType: r.vehicleType ?? null,
          plateNumber: r.plateNumber ?? null,
          bikeModel: r.bikeModel ?? null,
          photoUrl: r.photoStorageId ? await ctx.storage.getUrl(r.photoStorageId) : null,
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
  args: {
    name: v.string(),
    phone: v.string(),
    reason: v.string(),
    serviceAreaIds: v.array(v.id("serviceAreas")),
    // The portal adds riders for review: not dispatchable until approved
    pendingReview: v.optional(v.boolean()),
    // The details staff take when adding a rider
    vehicleType: v.optional(riderVehicle),
    plateNumber: v.optional(v.string()),
    bikeModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "riders.manage");
    const name = cleanName(args.name);
    const phone = cleanPhone(args.phone);
    const serviceAreaIds = await checkAreas(ctx, args.serviceAreaIds);
    const vehicle = {
      vehicleType: args.vehicleType,
      plateNumber: optionalText(args.plateNumber, 20)?.toUpperCase(),
      bikeModel: optionalText(args.bikeModel, 60),
    };
    const riderId = await ctx.db.insert(
      "riders",
      args.pendingReview
        ? { name, phone, serviceAreaIds, active: false, reviewStatus: "pending", ...vehicle }
        : { name, phone, serviceAreaIds, active: true, ...vehicle },
    );
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
    if (args.active && reviewStatus(rider) !== "approved") throw new ConvexError({ code: "RIDER_NOT_APPROVED" });
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

/** A-55 rider profile, with photo and ID links, recent jobs and history. */
export const get = query({
  args: { riderId: v.id("riders") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "riders.view");
    const r = await ctx.db.get("riders", args.riderId);
    if (r === null) return null;
    const areas = await Promise.all(r.serviceAreaIds.map(async (id) => ({ _id: id, name: (await ctx.db.get("serviceAreas", id))?.name ?? "" })));
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_riderId", (q) => q.eq("riderId", r._id))
      .order("desc")
      .take(20);
    const history = await ctx.db
      .query("auditLog")
      .withIndex("by_targetTable_and_targetId", (q) => q.eq("targetTable", "riders").eq("targetId", r._id))
      .order("desc")
      .take(50);
    const reviewer = r.reviewedBy ? await ctx.db.get("users", r.reviewedBy) : null;
    return {
      _id: r._id,
      _creationTime: r._creationTime,
      name: r.name,
      phone: r.phone,
      active: r.active,
      serviceAreas: areas,
      homeAddress: r.homeAddress ?? null,
      photoUrl: r.photoStorageId ? await ctx.storage.getUrl(r.photoStorageId) : null,
      idType: r.idType ?? null,
      idNumber: r.idNumber ?? null,
      idPhotoUrl: r.idPhotoStorageId ? await ctx.storage.getUrl(r.idPhotoStorageId) : null,
      vehicleType: r.vehicleType ?? null,
      plateNumber: r.plateNumber ?? null,
      bikeModel: r.bikeModel ?? null,
      guarantor: r.guarantor ?? null,
      bankCode: r.bankCode ?? null,
      bankName: r.bankName ?? null,
      accountNumber: r.accountNumber ?? null,
      accountName: r.accountName ?? null,
      reviewStatus: reviewStatus(r),
      reviewNote: r.reviewNote ?? null,
      reviewedAt: r.reviewedAt ?? null,
      reviewedBy: reviewer?.name ?? null,
      missing: missing(r),
      recentOrders: orders.map((o) => ({ _id: o._id, number: o.number, status: o.status, at: o._creationTime })),
      history: history.map((h) => ({ _id: h._id, _creationTime: h._creationTime, action: h.action, reason: h.reason, actorId: h.actorId })),
    };
  },
});

/** Banks riders can be paid into (the same list as farmers'). */
export const banks = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "riders.view");
    return BANKS;
  },
});

const optionalText = (value: string | undefined, max: number) => {
  if (value === undefined) return undefined;
  const t = value.trim();
  if (t.length > max) throw new ConvexError({ code: "TOO_LONG" });
  return t || undefined;
};

/** Save any part of a rider's profile. Changing it doesn't change the review. */
export const saveProfile = mutation({
  args: {
    riderId: v.id("riders"),
    photoStorageId: v.optional(v.id("_storage")),
    homeAddress: v.optional(v.string()),
    idType: v.optional(riderIdType),
    idNumber: v.optional(v.string()),
    idPhotoStorageId: v.optional(v.id("_storage")),
    vehicleType: v.optional(riderVehicle),
    plateNumber: v.optional(v.string()),
    bikeModel: v.optional(v.string()),
    guarantor: v.optional(v.object({ name: v.string(), phone: v.string(), address: v.string(), relationship: v.string() })),
    bankCode: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    accountName: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "riders.manage");
    const rider = await ctx.db.get("riders", args.riderId);
    if (rider === null) throw new ConvexError({ code: "NOT_FOUND" });
    const patch: Partial<Doc<"riders">> = {};
    if (args.photoStorageId !== undefined) patch.photoStorageId = args.photoStorageId;
    if (args.idPhotoStorageId !== undefined) patch.idPhotoStorageId = args.idPhotoStorageId;
    if (args.homeAddress !== undefined) patch.homeAddress = optionalText(args.homeAddress, 200);
    if (args.idType !== undefined) patch.idType = args.idType;
    if (args.idNumber !== undefined) patch.idNumber = optionalText(args.idNumber, 40);
    if (args.vehicleType !== undefined) patch.vehicleType = args.vehicleType;
    if (args.plateNumber !== undefined) patch.plateNumber = optionalText(args.plateNumber, 20)?.toUpperCase();
    if (args.bikeModel !== undefined) patch.bikeModel = optionalText(args.bikeModel, 60);
    if (args.guarantor !== undefined) {
      const g = args.guarantor;
      const phone = normalizeNigerianPhone(g.phone);
      if (!g.name.trim() || phone === null) throw new ConvexError({ code: "GUARANTOR_INCOMPLETE" });
      patch.guarantor = { name: g.name.trim(), phone, address: g.address.trim(), relationship: g.relationship.trim() };
    }
    if (args.bankCode !== undefined || args.accountNumber !== undefined || args.accountName !== undefined) {
      const code = args.bankCode ?? rider.bankCode;
      const name = code ? bankName(code) : null;
      if (!code || name === null) throw new ConvexError({ code: "UNKNOWN_BANK" });
      const number = (args.accountNumber ?? rider.accountNumber ?? "").replace(/\D/g, "");
      if (number.length !== 10) throw new ConvexError({ code: "INVALID_ACCOUNT_NUMBER" });
      patch.bankCode = code;
      patch.bankName = name;
      patch.accountNumber = number;
      patch.accountName = optionalText(args.accountName ?? rider.accountName, 100);
    }
    await ctx.db.patch("riders", rider._id, patch);
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "rider.profile",
      targetTable: "riders",
      targetId: rider._id,
      reason: args.reason,
      details: { fields: Object.keys(patch) },
    });
    return null;
  },
});

/** A-55 review: approve (the rider can be dispatched) or reject, with a note. */
export const review = mutation({
  args: { riderId: v.id("riders"), approve: v.boolean(), note: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "riders.manage");
    const rider = await ctx.db.get("riders", args.riderId);
    if (rider === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (args.approve) {
      const gaps = missing(rider);
      if (gaps.length > 0) throw new ConvexError({ code: "PROFILE_INCOMPLETE", message: `Still missing: ${gaps.join(", ")}` });
    }
    const note = args.note.trim();
    await ctx.db.patch("riders", rider._id, {
      reviewStatus: args.approve ? "approved" : "rejected",
      reviewNote: note || undefined,
      reviewedBy: staff._id,
      reviewedAt: Date.now(),
      active: args.approve,
    });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: args.approve ? "rider.approve" : "rider.reject",
      targetTable: "riders",
      targetId: rider._id,
      reason: note || (args.approve ? "Profile checked" : "Not approved"),
    });
    return null;
  },
});

/** Sidebar badge: riders waiting for review (up to 99). */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "riders.view");
    const riders = await ctx.db.query("riders").withIndex("by_active", (q) => q.eq("active", false)).take(200);
    return Math.min(99, riders.filter((r) => r.reviewStatus === "pending").length);
  },
});
