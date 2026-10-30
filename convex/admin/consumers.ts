// A-35 Customers, A-36 Customer detail, A-37 Block or unblock, A-38 Account
// deletion requests, plus sign-out-everywhere and a password reset link.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { orderRow } from "../lib/orders";
import { looksLikeEmail, normalizeNigerianPhone } from "../lib/phone";

/** Approved or former staff (their accounts are managed under Staff). */
async function staffMember(ctx: QueryCtx, userId: Doc<"users">["_id"]) {
  return await ctx.db
    .query("staffMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

async function accountRow(ctx: QueryCtx, u: Doc<"users">) {
  const member = await staffMember(ctx, u._id);
  const farm = await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", u._id))
    .unique();
  return {
    _id: u._id,
    _creationTime: u._creationTime,
    name: u.name ?? null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    isGuest: u.isAnonymous === true,
    isStaff: u.staffRole !== undefined || member?.status === "approved",
    farm: farm === null ? null : { _id: farm._id, name: farm.name },
    blocked: u.blockedAt !== undefined,
  };
}


/** Accounts, newest first. Guests appear here once they place orders (Phase 6). */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "customers.view");
    const page = await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((u) => accountRow(ctx, u))) };
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "customers.view");
    const user = await ctx.db.get("users", args.userId);
    if (user === null) return null;
    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(20);
    const activity = await ctx.db
      .query("auditLog")
      .withIndex("by_targetTable_and_targetId", (q) => q.eq("targetTable", "users").eq("targetId", user._id))
      .order("desc")
      .take(50);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(50);
    return {
      user,
      account: await accountRow(ctx, user),
      addresses,
      activity,
      orders: await Promise.all(orders.map((o) => orderRow(ctx, o))),
      signedInDevices: sessions.length,
    };
  },
});

export const setBlocked = mutation({
  args: { userId: v.id("users"), blocked: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "customers.manage");
    const user = await ctx.db.get("users", args.userId);
    if (user === null) throw new ConvexError("Account not found");
    const member = await staffMember(ctx, user._id);
    if (user.staffRole !== undefined || member?.status === "approved") {
      throw new ConvexError("Staff accounts can't be blocked here. Remove their access under Staff first.");
    }
    await ctx.db.patch("users", user._id, {
      blockedAt: args.blocked ? Date.now() : undefined,
      blockReason: args.blocked ? args.reason.trim() : undefined,
    });
    if (args.blocked) {
      // End their sessions so the block takes effect now.
      for await (const session of ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", user._id))) {
        await ctx.db.delete("authSessions", session._id);
      }
    }
    await writeAudit(ctx, {
      actorId: actor._id,
      action: args.blocked ? "consumer.block" : "consumer.unblock",
      targetTable: "users",
      targetId: user._id,
      reason: args.reason,
    });
  },
});

/** A-38. Deletions run straight away until orders exist (Phase 6). */
export const listDeletions = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "customers.view");
    return await ctx.db.query("accountDeletions").order("desc").paginate(args.paginationOpts);
  },
});

/** A-35 search: an account by exact email or phone number, or by name. */
export const find = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "customers.view");
    const q = args.query.trim();
    if (looksLikeEmail(q)) {
      const user = await ctx.db
        .query("users")
        .withIndex("email", (r) => r.eq("email", q.toLowerCase()))
        .first();
      return user === null ? [] : [await accountRow(ctx, user)];
    }
    const phone = normalizeNigerianPhone(q);
    if (phone !== null) {
      const users = await ctx.db
        .query("users")
        .withIndex("phone", (r) => r.eq("phone", phone))
        .take(5);
      if (users.length > 0) return await Promise.all(users.map((u) => accountRow(ctx, u)));
    }
    if (q.length < 2) return [];
    const named = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (r) => r.search("name", q))
      .take(20);
    return await Promise.all(named.map((u) => accountRow(ctx, u)));
  },
});

/** Signs the account out on every phone and browser (e.g. after a lost phone). */
export const signOutEverywhere = mutation({
  args: { userId: v.id("users"), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "customers.manage");
    const user = await ctx.db.get("users", args.userId);
    if (user === null) throw new ConvexError({ code: "NOT_FOUND" });
    await writeAudit(ctx, { actorId: actor._id, action: "consumer.signOut", targetTable: "users", targetId: user._id, reason: args.reason });
    let ended = 0;
    for await (const session of ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", user._id))) {
      for await (const token of ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", session._id))) {
        await ctx.db.delete("authRefreshTokens", token._id);
      }
      await ctx.db.delete("authSessions", session._id);
      ended++;
    }
    return ended;
  },
});

export const resetTarget = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "customers.manage");
    const user = await ctx.db.get("users", args.userId);
    return user?.email ?? null;
  },
});

/**
 * Emails the account the usual "reset your password" link (the shopper's
 * own reset flow). Run on the server so the staff member stays signed in.
 */
export const sendPasswordReset = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const email: string | null = await ctx.runQuery(internal.admin.consumers.resetTarget, { userId: args.userId });
    if (email === null) throw new ConvexError({ code: "NO_EMAIL" });
    await ctx.runAction(api.auth.signIn, { provider: "password", params: { flow: "reset", email } });
    await ctx.runMutation(internal.admin.consumers.logReset, { userId: args.userId });
    return null;
  },
});

export const logReset = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "customers.manage");
    await writeAudit(ctx, {
      actorId: actor._id,
      action: "consumer.passwordReset",
      targetTable: "users",
      targetId: args.userId,
      reason: "Sent a password reset link",
    });
    return null;
  },
});
