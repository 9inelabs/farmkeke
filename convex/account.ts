// M-82 Edit profile, M-83 Login details, M-95 Delete account.
import { getAuthSessionId, invalidateSessions, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, mutation, type ActionCtx } from "./_generated/server";
import { PASSWORD_PROVIDER } from "./accountsInternal";
import { requireAccount } from "./lib/auth";
import { assertStrongPassword } from "./lib/passwordProvider";
import { looksLikeEmail } from "./lib/phone";

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const name = args.name.trim();
    if (name.length === 0) throw new ConvexError({ code: "NAME_REQUIRED" });
    if (name.length > 80) throw new ConvexError({ code: "NAME_TOO_LONG" });
    await ctx.db.patch("users", user._id, { name });
  },
});

/** The signed-in account, after checking its current password. */
async function verifyCurrentPassword(ctx: ActionCtx, password: string): Promise<Doc<"users">> {
  const user: Doc<"users"> | null = await ctx.runQuery(internal.accountsInternal.currentViewer, {});
  if (user === null || user.isAnonymous || !user.email) throw new ConvexError({ code: "NOT_SIGNED_IN" });
  try {
    await retrieveAccount(ctx, {
      provider: PASSWORD_PROVIDER,
      account: { id: user.email, secret: password },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    throw new ConvexError({
      code: reason === "TooManyFailedAttempts" ? "TOO_MANY_ATTEMPTS" : "WRONG_PASSWORD",
    });
  }
  return user;
}

export const changePassword = action({
  args: { currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await verifyCurrentPassword(ctx, args.currentPassword);
    assertStrongPassword(args.newPassword);
    await modifyAccountCredentials(ctx, {
      provider: PASSWORD_PROVIDER,
      account: { id: user.email!, secret: args.newPassword },
    });
    // Sign out every other phone, keep this one signed in.
    const sessionId = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, { userId: user._id, except: sessionId ? [sessionId] : [] });
    // Security email, in the background so it can't fail the change
    await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
      email: { kind: "password_changed", userId: user._id, how: "changed" },
    });
  },
});

export const changeEmail = action({
  args: { newEmail: v.string(), currentPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await verifyCurrentPassword(ctx, args.currentPassword);
    const newEmail = args.newEmail.trim().toLowerCase();
    if (!looksLikeEmail(newEmail)) throw new ConvexError({ code: "INVALID_EMAIL" });
    if (newEmail === user.email) return;
    const result = await ctx.runMutation(internal.accountsInternal.replaceEmail, {
      userId: user._id,
      newEmail,
    });
    if (result === "EMAIL_TAKEN") throw new ConvexError({ code: "EMAIL_TAKEN" });
    if (result === "OK") {
      // Security notice to the old address, confirmation to the new one
      await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
        email: { kind: "email_changed", userId: user._id, oldEmail: user.email!, newEmail },
      });
    }
  },
});

/**
 * M-95 / W-49. Returns { status: "deleted" } when the account is gone, or
 * { status: "waiting_for_orders" } when orders are still in progress: the
 * account keeps working and is deleted once they end (accountsInternal).
 */
export const deleteAccount = action({
  args: { password: v.string() },
  handler: async (ctx, args): Promise<{ status: "deleted" | "waiting_for_orders" }> => {
    const user = await verifyCurrentPassword(ctx, args.password);
    if (user.staffRole !== undefined) throw new ConvexError({ code: "STAFF_ACCOUNT" });
    const result: "completed" | "waiting_for_orders" = await ctx.runMutation(internal.accountsInternal.deleteUserData, {
      userId: user._id,
    });
    return { status: result === "completed" ? "deleted" : "waiting_for_orders" };
  },
});
