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
