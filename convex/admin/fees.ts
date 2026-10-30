// A-84 Fees and commission, A-85 Order and escrow rules.
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { DEFAULT_COMMISSION_BPS, DEFAULT_RULES, getRules } from "../lib/settings";

async function settingsRow(ctx: MutationCtx) {
  const row = await ctx.db
    .query("platformSettings")
    .withIndex("by_key", (q) => q.eq("key", "platform"))
    .unique();
  return row ?? (await ctx.db.get("platformSettings", await ctx.db.insert("platformSettings", { key: "platform" })))!;
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, null);
    const rules = await getRules(ctx);
    const row = await ctx.db
      .query("platformSettings")
      .withIndex("by_key", (q) => q.eq("key", "platform"))
      .unique();
    return {
      // null = not set, so the default applies
      commissionBps: rules.commissionSet ? rules.commissionBps : null,
      effectiveCommissionBps: rules.commissionBps,
      defaultCommissionBps: DEFAULT_COMMISSION_BPS,
      commissionEffectiveAt: row?.commissionEffectiveAt ?? null,
      farmerResponseHours: rules.farmerResponseHours,
      unconfirmedAfterHours: rules.unconfirmedAfterHours,
      pickupHoldDays: rules.pickupHoldDays,
      disputeReplyHours: rules.disputeReplyHours,
      disputeDecideHours: rules.disputeDecideHours,
      defaults: DEFAULT_RULES,
      // W-23: null = no limit
      slotCapacity: typeof row?.slotCapacity === "number" ? row.slotCapacity : null,
      slotCapacities: row?.slotCapacities ?? [],
    };
  },
});

/**
 * W-23 "Full": delivery orders one area can take in one time slot. `capacity`
 * null removes the limit. With `serviceAreaId` it sets that area (and with
 * `from`, that one slot, e.g. "09:00"); without, the default for every area.
 */
export const setSlotCapacity = mutation({
  args: {
    capacity: v.union(v.number(), v.null()),
    serviceAreaId: v.optional(v.id("serviceAreas")),
    from: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "fees.manage");
    const cap = args.capacity;
    if (cap !== null && (!Number.isInteger(cap) || cap < 0 || cap > 10_000)) {
      throw new ConvexError({ code: "INVALID_CAPACITY", message: "Use a whole number from 0 to 10,000" });
    }
    if (args.from !== undefined && !/^\d{2}:\d{2}$/.test(args.from)) throw new ConvexError({ code: "INVALID_SLOT" });
    if (args.from !== undefined && args.serviceAreaId === undefined) throw new ConvexError({ code: "AREA_REQUIRED" });
    if (args.serviceAreaId !== undefined && (await ctx.db.get("serviceAreas", args.serviceAreaId)) === null) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    const row = await settingsRow(ctx);
    const before = { slotCapacity: row.slotCapacity ?? null, slotCapacities: row.slotCapacities ?? [] };
    if (args.serviceAreaId === undefined) {
      await ctx.db.patch("platformSettings", row._id, { slotCapacity: cap, updatedBy: actor._id });
    } else {
      const others = (row.slotCapacities ?? []).filter(
        (r) => !(r.serviceAreaId === args.serviceAreaId && r.from === args.from),
      );
      const next = cap === null ? others : [...others, { serviceAreaId: args.serviceAreaId, from: args.from, capacity: cap }];
      await ctx.db.patch("platformSettings", row._id, { slotCapacities: next, updatedBy: actor._id });
    }
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "fees.setSlotCapacity",
      targetTable: "platformSettings",
      targetId: row._id,
      reason: args.reason,
      details: { before, serviceAreaId: args.serviceAreaId ?? null, from: args.from ?? null, capacity: cap },
    });
  },
});

/** A-84: commission in basis points (500 = 5%). null goes back to the 5% default. */
export const setCommission = mutation({
  args: { commissionBps: v.union(v.number(), v.null()), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "commission.manage");
    const bps = args.commissionBps;
    if (bps !== null && (!Number.isInteger(bps) || bps < 0 || bps > 5000)) {
      throw new ConvexError({ code: "INVALID_COMMISSION", message: "Use 0 to 50%, in whole basis points" });
    }
    const row = await settingsRow(ctx);
    // Applies to orders released from now on.
    await ctx.db.patch("platformSettings", row._id, {
      commissionBps: bps,
      commissionEffectiveAt: Date.now(),
      updatedBy: actor._id,
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "fees.setCommission",
      targetTable: "platformSettings",
      targetId: row._id,
      reason: args.reason,
      details: { from: row.commissionBps ?? null, to: bps },
    });
  },
});

/** A-85: escrow timers, pickup hold, and the problem-report reply and decision times. */
export const setRules = mutation({
  args: {
    farmerResponseHours: v.optional(v.number()),
    unconfirmedAfterHours: v.optional(v.number()),
    // Days a pickup order waits at the point (the point's own number wins if longer)
    pickupHoldDays: v.optional(v.number()),
    // Hours the farm has to reply to a problem report
    disputeReplyHours: v.optional(v.number()),
    // Hours Farmkeke has to decide a problem report
    disputeDecideHours: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "fees.manage");
    const check = (value: number | undefined, min: number, max: number, field: string, unit = "hours") => {
      if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
        throw new ConvexError({ code: "INVALID_RULE", field, message: `${field} must be ${min} to ${max} ${unit}` });
      }
    };
    check(args.farmerResponseHours, 1, 72, "farmerResponseHours");
    check(args.unconfirmedAfterHours, 1, 168, "unconfirmedAfterHours");
    check(args.pickupHoldDays, 1, 14, "pickupHoldDays", "days");
    check(args.disputeReplyHours, 1, 72, "disputeReplyHours");
    check(args.disputeDecideHours, 1, 168, "disputeDecideHours");
    const row = await settingsRow(ctx);
    const changes = {
      ...(args.farmerResponseHours !== undefined ? { farmerResponseHours: args.farmerResponseHours } : {}),
      ...(args.unconfirmedAfterHours !== undefined ? { unconfirmedAfterHours: args.unconfirmedAfterHours } : {}),
      ...(args.pickupHoldDays !== undefined ? { pickupHoldDays: args.pickupHoldDays } : {}),
      ...(args.disputeReplyHours !== undefined ? { disputeReplyHours: args.disputeReplyHours } : {}),
      ...(args.disputeDecideHours !== undefined ? { disputeDecideHours: args.disputeDecideHours } : {}),
    };
    // New deadlines apply to orders paid from now on.
    await ctx.db.patch("platformSettings", row._id, { ...changes, updatedBy: actor._id });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "fees.setRules",
      targetTable: "platformSettings",
      targetId: row._id,
      reason: args.reason,
      details: changes,
    });
  },
});
