// Internal lookups used by the password provider and account actions, which
// run as actions and have no direct database access.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { getViewer } from "./lib/auth";
import { ENDED } from "./lib/orders";
import { hitLimit } from "./lib/rateLimit";

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

/**
 * Reset emails per address per hour, so the reset forms can't be used to
 * flood someone's inbox. False once the limit is reached.
 */
export const allowResetEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    try {
      await hitLimit(ctx, `reset-email:${args.email}`, 5, 3_600_000);
      return true;
    } catch {
      return false;
    }
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
    // The new address isn't verified, and a guest-orders link sent to the old
    // one must not add orders placed with the new one (orders/consumer.ts).
    await ctx.db.patch("users", args.userId, {
      email: args.newEmail,
      emailVerificationTime: undefined,
      guestLinkToken: undefined,
      guestLinkExpiresAt: undefined,
    });
    return "OK" as const;
  },
});

/** How many orders are still in progress (or have money still held); these block deletion. */
async function ordersInProgress(ctx: MutationCtx, userId: Id<"users">) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(500);
  return orders.filter(
    (o) => (!ENDED.includes(o.status) && o.status !== "awaiting_payment") || o.escrow === "held",
  ).length;
}

async function hasOrdersInProgress(ctx: MutationCtx, userId: Id<"users">) {
  return (await ordersInProgress(ctx, userId)) > 0;
}

/** M-95 emails: "deleted", or "waiting for N orders". Read before the user row goes. */
async function deletionEmail(
  ctx: MutationCtx,
  user: Doc<"users"> | null,
  status: "deleted" | "waiting",
  orders = 0,
) {
  if (user === null || user.isAnonymous || !user.email) return;
  await ctx.scheduler.runAfter(0, internal.notifications.deliver.accountEmail, {
    email:
      status === "deleted"
        ? { kind: "deletion_done", to: user.email, name: user.name }
        : { kind: "deletion_waiting", to: user.email, name: user.name, orders },
  });
}

/**
 * M-95: removes a user's personal data and every way to sign in as them.
 * Accounts with orders still in progress are recorded as "waiting_for_orders"
 * and kept working (to confirm receipt or report a problem); the hourly
 * finishWaitingDeletions job deletes them once those orders have ended.
 */
export const deleteUserData = internalMutation({
  // reason (Phase 5, W-49): the shopper's "Why are you leaving?", kept on the record
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, reason } = args;
    const user = await ctx.db.get("users", userId);
    const inProgress = await ordersInProgress(ctx, userId);
    if (inProgress > 0) {
      const waiting = await ctx.db
        .query("accountDeletions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(10);
      const open = waiting.find((d) => d.status === "waiting_for_orders");
      if (open === undefined) {
        await ctx.db.insert("accountDeletions", { userId, status: "waiting_for_orders", reason });
        await deletionEmail(ctx, user, "waiting", inProgress);
      } else if (reason !== undefined) {
        await ctx.db.patch("accountDeletions", open._id, { reason });
      }
      return "waiting_for_orders" as const;
    }
    await deletionEmail(ctx, user, "deleted");
    await eraseUser(ctx, userId);
    await ctx.db.insert("accountDeletions", { userId, status: "completed", completedAt: Date.now(), reason });
    return "completed" as const;
  },
});

/** Cron: finishes deletions that were waiting for orders to end. */
export const finishWaitingDeletions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const waiting = await ctx.db
      .query("accountDeletions")
      .withIndex("by_status", (q) => q.eq("status", "waiting_for_orders"))
      .take(50);
    let finished = 0;
    for (const row of waiting) {
      const userId = ctx.db.normalizeId("users", row.userId);
      const user = userId ? await ctx.db.get("users", userId) : null;
      if (userId !== null && user !== null) {
        if (await hasOrdersInProgress(ctx, userId)) continue;
        await deletionEmail(ctx, user, "deleted");
        await eraseUser(ctx, userId);
      }
      await ctx.db.patch("accountDeletions", row._id, { status: "completed", completedAt: Date.now() });
      finished++;
    }
    return { finished };
  },
});

async function eraseUser(ctx: MutationCtx, userId: Id<"users">) {
    for (const table of ["favorites", "pushTokens"] as const) {
      for await (const row of ctx.db.query(table).withIndex("by_userId", (q) => q.eq("userId", userId))) {
        await ctx.db.delete(table, row._id);
      }
    }
    for await (const row of ctx.db.query("savedCards").withIndex("by_userId", (q) => q.eq("userId", userId))) {
      await ctx.db.delete("savedCards", row._id);
    }
    for (const side of ["shop", "farm"] as const) {
      for await (const row of ctx.db
        .query("notificationPrefs")
        .withIndex("by_userId_and_side", (q) => q.eq("userId", userId).eq("side", side))) {
        await ctx.db.delete("notificationPrefs", row._id);
      }
    }
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
}

/** The caller's user (session checked), for actions that can't read the db. */
export const currentViewer = internalQuery({
  args: {},
  handler: async (ctx) => await getViewer(ctx),
});
