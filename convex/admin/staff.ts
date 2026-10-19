// A-89 Staff and roles, A-90 Audit log, A-12 staff alerts. Applications come
// in through the portal (lib/staffAuth.ts); people with staff.manage approve
// them with a role. Roles are sets of permissions (lib/permissions.ts).
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff, requireStaffContext } from "../lib/auth";
import { staffWithPermission } from "../lib/notify";
import { isPermission } from "../lib/permissions";

const memberStatus = v.union(
  v.literal("email_unconfirmed"),
  v.literal("pending"),
  v.literal("more_info"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("deactivated"),
);

const reasonText = (reason: string) => {
  const r = reason.trim();
  if (r.length === 0) throw new ConvexError({ code: "REASON_REQUIRED" });
  return r.slice(0, 1000);
};

async function memberRow(ctx: QueryCtx, m: Doc<"staffMembers">) {
  const role = m.roleId ? await ctx.db.get("staffRoles", m.roleId) : null;
  const decider = m.decidedBy ? await ctx.db.get("users", m.decidedBy) : null;
  return {
    _id: m._id,
    userId: m.userId,
    name: m.name,
    email: m.email,
    phone: m.phone ?? null,
    jobTitle: m.jobTitle,
    note: m.note ?? null,
    status: m.status,
    role: role ? { id: role._id, key: role.key, name: role.name } : null,
    appliedAt: m.appliedAt,
    emailConfirmedAt: m.emailConfirmedAt ?? null,
    decidedAt: m.decidedAt ?? null,
    decidedBy: decider?.name ?? null,
    decisionNote: m.decisionNote ?? null,
    lastSignInAt: m.lastSignInAt ?? null,
    invitePending: m.invitePending === true,
  };
}

/** Staff and applications, newest first. Filter by status, or everyone. */
export const listMembers = query({
  args: { status: v.optional(memberStatus) },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "staff.view");
    const rows = args.status
      ? await ctx.db
          .query("staffMembers")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(200)
      : await ctx.db.query("staffMembers").order("desc").take(300);
    return await Promise.all(rows.map((m) => memberRow(ctx, m)));
  },
});

/** Count of applications waiting for a decision (for the sidebar badge). */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "staff.view");
    const rows = await ctx.db
      .query("staffMembers")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(99);
    return rows.length;
  },
});

export const getMember = query({
  args: { memberId: v.id("staffMembers") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "staff.view");
    const m = await ctx.db.get("staffMembers", args.memberId);
    if (m === null) return null;
    const history = await ctx.db
      .query("auditLog")
      .withIndex("by_targetTable_and_targetId", (q) => q.eq("targetTable", "staffMembers").eq("targetId", m._id))
      .order("desc")
      .take(50);
    return {
      ...(await memberRow(ctx, m)),
      history: await Promise.all(
        history.map(async (h) => ({
          _id: h._id,
          at: h._creationTime,
          action: h.action,
          reason: h.reason,
          by: (await ctx.db.get("users", h.actorId))?.name ?? "Staff",
        })),
      ),
    };
  },
});

async function decide(
  ctx: MutationCtx,
  memberId: Id<"staffMembers">,
  allowed: Doc<"staffMembers">["status"][],
) {
  const staff = await requireStaffContext(ctx, "staff.manage");
  const member = await ctx.db.get("staffMembers", memberId);
  if (member === null) throw new ConvexError({ code: "NOT_FOUND" });
  if (!allowed.includes(member.status)) throw new ConvexError({ code: "WRONG_STATUS", status: member.status });
  return { staff, member };
}

async function roleFor(ctx: MutationCtx, roleId: Id<"staffRoles">, actorIsFounder: boolean) {
  const role = await ctx.db.get("staffRoles", roleId);
  if (role === null) throw new ConvexError({ code: "ROLE_NOT_FOUND" });
  // There is one Founder; the role can't be handed out.
  if (role.key === "founder") throw new ConvexError({ code: "FOUNDER_ROLE" });
  // Only the Founder can give out roles that approve staff or edit roles.
  if (!actorIsFounder && (role.permissions.includes("staff.manage") || role.permissions.includes("roles.manage"))) {
    throw new ConvexError({ code: "FORBIDDEN" });
  }
  return role;
}

export const approve = mutation({
  args: { memberId: v.id("staffMembers"), roleId: v.id("staffRoles"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { staff, member } = await decide(ctx, args.memberId, ["pending", "more_info"]);
    const role = await roleFor(ctx, args.roleId, staff.role.key === "founder");
    await ctx.db.patch("staffMembers", member._id, {
      status: "approved",
      roleId: role._id,
      decidedBy: staff.user._id,
      decidedAt: Date.now(),
      decisionNote: args.note?.trim() || undefined,
    });
    await writeAudit(ctx, {
      actorId: staff.user._id,
      action: "staff.approve",
      targetTable: "staffMembers",
      targetId: member._id,
      reason: args.note?.trim() || `Approved as ${role.name}`,
      details: { role: role.key },
    });
    await ctx.scheduler.runAfter(0, internal.notifications.staff.send, { email: { kind: "approved", memberId: member._id } });
    return null;
  },
});

export const reject = mutation({
  args: { memberId: v.id("staffMembers"), reason: v.string() },
  handler: async (ctx, args) => {
    const { staff, member } = await decide(ctx, args.memberId, ["pending", "more_info", "email_unconfirmed"]);
    const reason = reasonText(args.reason);
    await ctx.db.patch("staffMembers", member._id, {
      status: "rejected",
      decidedBy: staff.user._id,
      decidedAt: Date.now(),
      decisionNote: reason,
    });
    await writeAudit(ctx, {
      actorId: staff.user._id,
      action: "staff.reject",
      targetTable: "staffMembers",
      targetId: member._id,
      reason,
    });
    if (member.status !== "email_unconfirmed") {
      await ctx.scheduler.runAfter(0, internal.notifications.staff.send, { email: { kind: "rejected", memberId: member._id } });
    }
    return null;
  },
});

export const requestInfo = mutation({
  args: { memberId: v.id("staffMembers"), message: v.string() },
  handler: async (ctx, args) => {
    const { staff, member } = await decide(ctx, args.memberId, ["pending", "more_info"]);
    const message = reasonText(args.message);
    await ctx.db.patch("staffMembers", member._id, { status: "more_info", decisionNote: message });
    await writeAudit(ctx, {
      actorId: staff.user._id,
      action: "staff.requestInfo",
      targetTable: "staffMembers",
      targetId: member._id,
      reason: message,
    });
    await ctx.scheduler.runAfter(0, internal.notifications.staff.send, { email: { kind: "more_info", memberId: member._id } });
    return null;
  },
});

export const changeRole = mutation({
  args: { memberId: v.id("staffMembers"), roleId: v.id("staffRoles"), reason: v.string() },
  handler: async (ctx, args) => {
    const { staff, member } = await decide(ctx, args.memberId, ["approved", "deactivated"]);
    if (member.userId === staff.user._id) throw new ConvexError({ code: "OWN_ROLE" });
    const current = member.roleId ? await ctx.db.get("staffRoles", member.roleId) : null;
    if (current?.key === "founder") throw new ConvexError({ code: "FOUNDER_ROLE" });
    const role = await roleFor(ctx, args.roleId, staff.role.key === "founder");
    if (current?._id === role._id) return null;
    const reason = reasonText(args.reason);
    await ctx.db.patch("staffMembers", member._id, { roleId: role._id });
    await writeAudit(ctx, {
      actorId: staff.user._id,
      action: "staff.changeRole",
      targetTable: "staffMembers",
      targetId: member._id,
      reason,
      details: { from: current?.key ?? null, to: role.key },
    });
    if (member.status === "approved") {
      await ctx.scheduler.runAfter(0, internal.notifications.staff.send, {
        email: { kind: "role_changed", memberId: member._id, from: current?.name ?? "None", reason },
      });
    }
    return null;
  },
});

/** Removes portal access at once (signs them out of the portal); or gives it back. */
export const setActive = mutation({
  args: { memberId: v.id("staffMembers"), active: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const { staff, member } = await decide(ctx, args.memberId, args.active ? ["deactivated"] : ["approved"]);
    if (member.userId === staff.user._id) throw new ConvexError({ code: "OWN_ACCESS" });
    const role = member.roleId ? await ctx.db.get("staffRoles", member.roleId) : null;
    if (role?.key === "founder") throw new ConvexError({ code: "FOUNDER_ROLE" });
    const reason = reasonText(args.reason);
    await ctx.db.patch("staffMembers", member._id, {
      status: args.active ? "approved" : "deactivated",
      decisionNote: args.active ? undefined : reason,
    });
    if (!args.active) {
      for await (const s of ctx.db.query("staffSessions").withIndex("by_userId", (q) => q.eq("userId", member.userId))) {
        await ctx.db.delete("staffSessions", s._id);
      }
    }
    await writeAudit(ctx, {
      actorId: staff.user._id,
      action: args.active ? "staff.reactivate" : "staff.deactivate",
      targetTable: "staffMembers",
      targetId: member._id,
      reason,
    });
    await ctx.scheduler.runAfter(0, internal.notifications.staff.send, {
      email: { kind: "access", memberId: member._id, removed: !args.active, reason },
    });
    return null;
  },
});

/** Approved staff whose role has the permission: who work can be assigned to. */
export const assignable = query({
  args: { permission: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, null);
    if (!isPermission(args.permission)) throw new ConvexError({ code: "UNKNOWN_PERMISSION" });
    const members = await staffWithPermission(ctx, args.permission);
    return members.map((m) => ({ userId: m.userId, name: m.name })).sort((a, b) => a.name.localeCompare(b.name));
  },
});

// ---------------------------------------------------------------------------
// Roles

export const listRoles = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "staff.view");
    const roles = await ctx.db.query("staffRoles").withIndex("by_sortOrder").take(100);
    return await Promise.all(
      roles.map(async (r) => {
        const members = await ctx.db
          .query("staffMembers")
          .withIndex("by_roleId_and_status", (q) => q.eq("roleId", r._id).eq("status", "approved"))
          .take(200);
        return {
          _id: r._id,
          key: r.key,
          name: r.name,
          description: r.description,
          permissions: r.permissions,
          builtIn: r.builtIn,
          editable: r.key !== "founder",
          members: members.length,
        };
      }),
    );
  },
});

const cleanPermissions = (list: string[]) => {
  const unknown = list.filter((p) => !isPermission(p));
  if (unknown.length > 0) throw new ConvexError({ code: "UNKNOWN_PERMISSION", permissions: unknown.join(", ") });
  return [...new Set(list)];
};

const roleText = (name: string, description: string) => {
  const n = name.trim().slice(0, 40);
  if (n.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
  return { name: n, description: description.trim().slice(0, 200) };
};

export const createRole = mutation({
  args: { name: v.string(), description: v.string(), permissions: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "roles.manage");
    const { name, description } = roleText(args.name, args.description);
    const last = await ctx.db.query("staffRoles").withIndex("by_sortOrder").order("desc").first();
    const roleId = await ctx.db.insert("staffRoles", {
      key: `custom-${Date.now().toString(36)}`,
      name,
      description,
      permissions: cleanPermissions(args.permissions),
      builtIn: false,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "role.create",
      targetTable: "staffRoles",
      targetId: roleId,
      reason: `Created the ${name} role`,
      details: { permissions: args.permissions },
    });
    return roleId;
  },
});

export const updateRole = mutation({
  args: { roleId: v.id("staffRoles"), name: v.string(), description: v.string(), permissions: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "roles.manage");
    const role = await ctx.db.get("staffRoles", args.roleId);
    if (role === null) throw new ConvexError({ code: "ROLE_NOT_FOUND" });
    if (role.key === "founder") throw new ConvexError({ code: "FOUNDER_ROLE" });
    const { name, description } = roleText(args.name, args.description);
    const permissions = cleanPermissions(args.permissions);
    await ctx.db.patch("staffRoles", role._id, { name, description, permissions });
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "role.update",
      targetTable: "staffRoles",
      targetId: role._id,
      reason: `Edited the ${name} role`,
      details: {
        added: permissions.filter((p) => !role.permissions.includes(p)),
        removed: role.permissions.filter((p) => !permissions.includes(p)),
      },
    });
    return null;
  },
});

/** Custom roles only, and only when nobody has the role. */
export const deleteRole = mutation({
  args: { roleId: v.id("staffRoles") },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "roles.manage");
    const role = await ctx.db.get("staffRoles", args.roleId);
    if (role === null) return null;
    if (role.builtIn) throw new ConvexError({ code: "BUILT_IN_ROLE" });
    const holder = await ctx.db
      .query("staffMembers")
      .withIndex("by_roleId_and_status", (q) => q.eq("roleId", role._id))
      .first();
    if (holder !== null) throw new ConvexError({ code: "ROLE_IN_USE" });
    await ctx.db.delete("staffRoles", role._id);
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "role.delete",
      targetTable: "staffRoles",
      targetId: role._id,
      reason: `Deleted the ${role.name} role`,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// A-90 Audit log

export const listAuditLog = query({
  args: { paginationOpts: paginationOptsValidator, actorId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "audit.view");
    const page = args.actorId
      ? await ctx.db
          .query("auditLog")
          .withIndex("by_actorId", (q) => q.eq("actorId", args.actorId!))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db.query("auditLog").order("desc").paginate(args.paginationOpts);
    const names = new Map<Id<"users">, string>();
    const rows = [];
    for (const e of page.page) {
      if (!names.has(e.actorId)) names.set(e.actorId, (await ctx.db.get("users", e.actorId))?.name ?? "Staff");
      rows.push({
        _id: e._id,
        at: e._creationTime,
        actorId: e.actorId,
        actor: names.get(e.actorId)!,
        action: e.action,
        targetTable: e.targetTable,
        targetId: e.targetId,
        reason: e.reason,
        details: e.details ?? null,
      });
    }
    return { ...page, page: rows };
  },
});

// ---------------------------------------------------------------------------
// A-12 staff alerts (problem reports, overdue farm replies, applications)

export const alerts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireStaff(ctx, null);
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", user._id).eq("side", "staff"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Unread staff alerts, capped at 99. */
export const unreadAlerts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireStaff(ctx, null);
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
    const user = await requireStaff(ctx, null);
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
