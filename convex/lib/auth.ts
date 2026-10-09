import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { staffRole } from "../schema";

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

/**
 * Farmkeke staff with one of the given roles. Super admins pass every check.
 */
export async function requireStaff(ctx: Ctx, roles: StaffRole[]): Promise<Doc<"users">> {
  const user = await requireAccount(ctx);
  const role = user.staffRole;
  if (role === undefined || (role !== "super_admin" && !roles.includes(role))) {
    throw new ConvexError({ code: "FORBIDDEN" });
  }
  return user;
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
