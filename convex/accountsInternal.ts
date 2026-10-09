// Internal lookups used by the password provider and account actions, which
// run as actions and have no direct database access.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getViewer } from "./lib/auth";

export const PASSWORD_PROVIDER = "password";
// Failed sign-ins allowed per account per hour (refills gradually). M-50.
export const MAX_FAILED_SIGN_INS_PER_HOUR = 5;

/** The password account for an email, if any. */
export const passwordAccountByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", PASSWORD_PROVIDER).eq("providerAccountId", args.email),
      )
      .unique();
    return account === null ? null : { accountId: account._id, userId: account.userId };
  },
});

/** The password account of the user with this phone (farmers), if any. */
export const passwordAccountByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("phone", (q) => q.eq("phone", args.phone))
      .first();
    if (user === null) return null;
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id).eq("provider", PASSWORD_PROVIDER))
      .unique();
    return account === null
      ? null
      : { accountId: account._id, userId: user._id, email: account.providerAccountId };
  },
});

/** Sign-in attempts left before the short pause (same formula as Convex Auth). */
export const signInAttemptsLeft = internalQuery({
  args: { accountId: v.id("authAccounts"), now: v.number() },
  handler: async (ctx, args) => {
    const limit = await ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (q) => q.eq("identifier", args.accountId))
      .unique();
    if (limit === null) return MAX_FAILED_SIGN_INS_PER_HOUR;
    const refill = ((args.now - limit.lastAttemptTime) * MAX_FAILED_SIGN_INS_PER_HOUR) / 3_600_000;
    return Math.floor(Math.min(MAX_FAILED_SIGN_INS_PER_HOUR, limit.attemptsLeft + refill));
  },
});

export const userById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => await ctx.db.get("users", args.userId),
});

/** M-83: move a password account and its user to a new email. */
export const replaceEmail = internalMutation({
  args: { userId: v.id("users"), newEmail: v.string() },
  handler: async (ctx, args) => {
    const taken = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", PASSWORD_PROVIDER).eq("providerAccountId", args.newEmail),
      )
      .unique();
    if (taken !== null && taken.userId !== args.userId) return "EMAIL_TAKEN" as const;
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId).eq("provider", PASSWORD_PROVIDER))
      .unique();
    if (account === null) return "NO_ACCOUNT" as const;
    await ctx.db.patch("authAccounts", account._id, { providerAccountId: args.newEmail });
    await ctx.db.patch("users", args.userId, { email: args.newEmail });
    return "OK" as const;
  },
});

/**
 * M-95: removes a user's personal data and every way to sign in as them.
 * Order records arrive in Phase 6; from then on, accounts with orders still
 * on their way are recorded as "waiting_for_orders" and finished later.
 */
export const deleteUserData = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = args;
    for await (const address of ctx.db.query("addresses").withIndex("by_userId", (q) => q.eq("userId", userId))) {
      await ctx.db.delete("addresses", address._id);
    }
    for await (const session of ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId))) {
      for await (const token of ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))) {
        await ctx.db.delete("authRefreshTokens", token._id);
      }
      await ctx.db.delete("authSessions", session._id);
    }
    for await (const account of ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))) {
      for await (const code of ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))) {
        await ctx.db.delete("authVerificationCodes", code._id);
      }
      const limit = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", account._id))
        .unique();
      if (limit !== null) await ctx.db.delete("authRateLimits", limit._id);
      await ctx.db.delete("authAccounts", account._id);
    }
    await ctx.db.delete("users", userId);
    await ctx.db.insert("accountDeletions", { userId, status: "completed", completedAt: Date.now() });
  },
});

/** The caller's user (session checked), for actions that can't read the db. */
export const currentViewer = internalQuery({
  args: {},
  handler: async (ctx) => await getViewer(ctx),
});
