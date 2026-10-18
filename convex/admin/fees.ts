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
    await requireStaff(ctx, ["operations", "finance", "support"]);
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
      defaults: DEFAULT_RULES,
    };
  },
});

/** A-84: commission in basis points (500 = 5%). null goes back to the 5% default. */
export const setCommission = mutation({
  args: { commissionBps: v.union(v.number(), v.null()), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, ["finance"]);
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

/** A-85: escrow timers. */
export const setRules = mutation({
  args: {
    farmerResponseHours: v.optional(v.number()),
    unconfirmedAfterHours: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, ["operations"]);
    const check = (value: number | undefined, min: number, max: number, field: string) => {
      if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
        throw new ConvexError({ code: "INVALID_RULE", field, message: `${field} must be ${min} to ${max} hours` });
      }
    };
    check(args.farmerResponseHours, 1, 72, "farmerResponseHours");
    check(args.unconfirmedAfterHours, 1, 168, "unconfirmedAfterHours");
    const row = await settingsRow(ctx);
    const changes = {
      ...(args.farmerResponseHours !== undefined ? { farmerResponseHours: args.farmerResponseHours } : {}),
      ...(args.unconfirmedAfterHours !== undefined ? { unconfirmedAfterHours: args.unconfirmedAfterHours } : {}),
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
