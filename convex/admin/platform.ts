// Admin stand-in for the app status switches behind M-S4 Update required and
// M-S5 Maintenance.
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";

const VERSION = /^\d+\.\d+\.\d+$/;

export const setAppStatus = mutation({
  args: {
    minAppVersion: v.optional(v.string()),
    latestAppVersion: v.optional(v.string()),
    androidStoreUrl: v.optional(v.string()),
    iosStoreUrl: v.optional(v.string()),
    maintenanceActive: v.optional(v.boolean()),
    maintenanceMessage: v.optional(v.string()),
    // Unix ms; when the platform is expected back
    maintenanceUntil: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, []);
    const { reason, ...changes } = args;
    for (const version of [changes.minAppVersion, changes.latestAppVersion]) {
      if (version !== undefined && !VERSION.test(version)) throw new Error("Versions look like 1.2.3");
    }
    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "app"))
      .unique();
    const id =
      existing?._id ??
      (await ctx.db.insert("appConfig", {
        key: "app",
        minAppVersion: "0.0.0",
        latestAppVersion: "0.0.0",
        maintenanceActive: false,
      }));
    await ctx.db.patch("appConfig", id, changes);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "platform.setAppStatus",
      targetTable: "appConfig",
      targetId: id,
      reason,
      details: changes,
    });
  },
});
