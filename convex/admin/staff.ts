// Admin stand-ins for A-89 Staff and roles and A-90 Audit log.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { staffRole } from "../schema";

/**
 * Makes an existing account the first Super admin. Internal only, and refuses
 * once any Super admin exists:
 *   npx convex run admin/staff:bootstrapSuperAdmin '{"email":"you@example.com"}'
 */
export const bootstrapSuperAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_staffRole", (q) => q.eq("staffRole", "super_admin"))
      .first();
    if (existing !== null) throw new ConvexError("A Super admin already exists");
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (user === null || user.isAnonymous) {
      throw new ConvexError("No account with that email. Create one in the app first.");
    }
    await ctx.db.patch("users", user._id, { staffRole: "super_admin" });
    await writeAudit(ctx, {
      actorId: user._id,
      action: "staff.bootstrap",
      targetTable: "users",
      targetId: user._id,
      reason: "First Super admin created from the CLI",
    });
    return user._id;
  },
});

export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, []);
    const staff = [];
    for (const role of ["super_admin", "operations", "finance", "support"] as const) {
      const members = await ctx.db
        .query("users")
        .withIndex("by_staffRole", (q) => q.eq("staffRole", role))
        .take(200);
      staff.push(...members.map((m) => ({ _id: m._id, name: m.name, email: m.email, role })));
    }
    return staff;
  },
});

/** Give an account a staff role, change it, or remove it (role: null). */
export const setStaffRole = mutation({
  args: { userId: v.id("users"), role: v.union(staffRole, v.null()), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, []);
    const user = await ctx.db.get("users", args.userId);
    if (user === null || user.isAnonymous) throw new ConvexError("Account not found");
    if (user._id === actor._id && args.role !== "super_admin") {
      throw new ConvexError("You can't remove your own Super admin role");
    }
    await ctx.db.patch("users", user._id, { staffRole: args.role ?? undefined });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "staff.setRole",
      targetTable: "users",
      targetId: user._id,
      reason: args.reason,
      details: { from: user.staffRole ?? null, to: args.role },
    });
  },
});

export const listAuditLog = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, []);
    return await ctx.db.query("auditLog").order("desc").paginate(args.paginationOpts);
  },
});

/**
 * CLI-only: give or remove a staff role by email (deployment admins only).
 *   npx convex run admin/staff:setStaffRoleByEmail '{"email":"…","role":"operations","reason":"…"}'
 */
export const setStaffRoleByEmail = internalMutation({
  args: { email: v.string(), role: v.union(staffRole, v.null()), reason: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).unique();
    if (user === null || user.isAnonymous) throw new ConvexError("No account with that email");
    await ctx.db.patch("users", user._id, { staffRole: args.role ?? undefined });
    await writeAudit(ctx, {
      actorId: user._id,
      action: "staff.setRoleFromCli",
      targetTable: "users",
      targetId: user._id,
      reason: args.reason,
      details: { from: user.staffRole ?? null, to: args.role },
    });
  },
});

const ALL_ROLES = ["operations" as const, "finance" as const, "support" as const];

/** A-12: the signed-in staff member's in-app alerts (problem reports, overdue farm replies), newest first. */
export const alerts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx, ALL_ROLES);
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", user._id).eq("side", "staff"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** A-12: unread staff alerts, capped at 99. */
export const unreadAlerts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStaff(ctx, ALL_ROLES);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_side_and_readAt", (q) => q.eq("userId", user._id).eq("side", "staff").eq("readAt", undefined))
      .take(99);
    return rows.length;
  },
});

/** Marks the signed-in staff member's alerts read: one alert, or all of them (200 at a time). */
export const markAlertsRead = mutation({
  args: { notificationId: v.optional(v.id("notifications")) },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx, ALL_ROLES);
    const now = Date.now();
    if (args.notificationId !== undefined) {
      const n = await ctx.db.get("notifications", args.notificationId);
      if (n === null || n.userId !== user._id || n.side !== "staff") throw new ConvexError({ code: "NOT_FOUND" });
      if (n.readAt === undefined) await ctx.db.patch("notifications", n._id, { readAt: now });
      return 1;
    }
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_side_and_readAt", (q) => q.eq("userId", user._id).eq("side", "staff").eq("readAt", undefined))
      .take(200);
    for (const n of unread) await ctx.db.patch("notifications", n._id, { readAt: now });
    return unread.length;
  },
});
