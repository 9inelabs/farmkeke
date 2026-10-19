// Admin stand-ins for A-35 Consumers, A-36 Consumer detail, A-37 Block or
// unblock, and A-38 Account deletion requests.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";


/** Accounts, newest first. Guests appear here once they place orders (Phase 6). */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "customers.view");
    const page = await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((u) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        name: u.name ?? null,
        email: u.email ?? null,
        phone: u.phone ?? null,
        isGuest: u.isAnonymous === true,
        isStaff: u.staffRole !== undefined,
        blocked: u.blockedAt !== undefined,
      })),
    };
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
    return { user, addresses, activity };
  },
});

export const setBlocked = mutation({
  args: { userId: v.id("users"), blocked: v.boolean(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireStaff(ctx, "customers.manage");
    const user = await ctx.db.get("users", args.userId);
    if (user === null) throw new ConvexError("Account not found");
    if (user.staffRole !== undefined) throw new ConvexError("Staff accounts can't be blocked here");
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
