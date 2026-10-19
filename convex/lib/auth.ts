import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { staffRole } from "../schema";
import type { Permission } from "./permissions";

export type StaffRole = Infer<typeof staffRole>;

type Ctx = QueryCtx | MutationCtx;

/**
 * The signed-in user (guest or account), or null when signed out.
 *
 * Access tokens outlive their session by up to an hour, so the session is
 * checked too: a password reset, block or deletion signs other phones out at
 * once instead of when their token next refreshes.
 */
export async function getViewer(ctx: Ctx): Promise<Doc<"users"> | null> {
  const [userId, sessionId] = await Promise.all([getAuthUserId(ctx), getAuthSessionId(ctx)]);
  if (userId === null || sessionId === null) return null;
  const session = await ctx.db.get("authSessions", sessionId);
  if (session === null || session.userId !== userId) return null;
  return await ctx.db.get("users", userId);
}

/** Any signed-in identity, including guests (anonymous sessions). */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getViewer(ctx);
  if (user === null) throw new ConvexError({ code: "NOT_SIGNED_IN" });
  return user;
}

/** A real Farmkeke account (not a guest). */
export async function requireAccount(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.isAnonymous) throw new ConvexError({ code: "ACCOUNT_REQUIRED" });
  if (user.blockedAt !== undefined) throw new ConvexError({ code: "BLOCKED" });
  return user;
}

export type StaffContext = {
  user: Doc<"users">;
  member: Doc<"staffMembers">;
  role: Doc<"staffRoles">;
  permissions: Set<string>;
};

/**
 * The approved staff member using a portal-verified session (password and
 * emailed code, within the last 12 hours), or null. The portal's gate
 * (admin/access.me) explains which part is missing.
 */
export async function getStaff(ctx: Ctx): Promise<StaffContext | null> {
  const [user, sessionId] = await Promise.all([getViewer(ctx), getAuthSessionId(ctx)]);
  if (user === null || sessionId === null || user.isAnonymous || user.blockedAt !== undefined) return null;
  const member = await ctx.db
    .query("staffMembers")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
  if (member === null || member.status !== "approved" || member.roleId === undefined) return null;
  const verified = await ctx.db
    .query("staffSessions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .unique();
  if (verified === null || verified.userId !== user._id) return null;
  const role = await ctx.db.get("staffRoles", member.roleId);
  if (role === null) return null;
  return { user, member, role, permissions: new Set(role.permissions) };
}

/**
 * Farmkeke staff (Admin Portal). `need` is a permission, or a list where any
 * one is enough; null means any approved staff member. Returns their account.
 *   NOT_STAFF: not an approved staff member
 *   STAFF_VERIFY: staff, but this session hasn't passed the emailed code
 *   FORBIDDEN: their role doesn't include the permission
 */
export async function requireStaff(ctx: Ctx, need: Permission | Permission[] | null): Promise<Doc<"users">> {
  return (await requireStaffContext(ctx, need)).user;
}

export async function requireStaffContext(ctx: Ctx, need: Permission | Permission[] | null): Promise<StaffContext> {
  const user = await requireAccount(ctx);
  const staff = await getStaff(ctx);
  if (staff === null) {
    const member = await ctx.db
      .query("staffMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    throw new ConvexError({ code: member?.status === "approved" ? "STAFF_VERIFY" : "NOT_STAFF" });
  }
  const wanted = need === null ? [] : Array.isArray(need) ? need : [need];
  if (wanted.length > 0 && !wanted.some((p) => staff.permissions.has(p))) {
    throw new ConvexError({ code: "FORBIDDEN" });
  }
  return staff;
}

/**
 * An approved farmer and their farm. Suspended farms can still read and edit
 * their settings; selling actions also check `farm.status` (F-15).
 */
export async function requireFarmer(ctx: Ctx): Promise<{ user: Doc<"users">; farm: Doc<"farms"> }> {
  const user = await requireAccount(ctx);
  const farm = await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
  if (farm === null) throw new ConvexError({ code: "NOT_FARMER" });
  return { user, farm };
}

/** Whether a user is approved staff whose role has the permission (for assigning work to them). */
export async function isStaffWith(ctx: Ctx, userId: Doc<"users">["_id"], permission: Permission): Promise<boolean> {
  const member = await ctx.db
    .query("staffMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (member === null || member.status !== "approved" || member.roleId === undefined) return false;
  const role = await ctx.db.get("staffRoles", member.roleId);
  return role !== null && role.permissions.includes(permission);
}
