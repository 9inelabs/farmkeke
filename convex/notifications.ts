// In-app notifications (M-87, F-11), push tokens (M-48, F-12) and alert
// preferences (W-48, M-88, F-75). Guests have their own list too.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { CHANNELS, findAlert, preferenceRows } from "./lib/alerts";
import { getViewer, requireUser } from "./lib/auth";
import { markReadBatch } from "./lib/notify";
import { notificationSide } from "./schema";

const UNREAD_CAP = 99;

/** The newest first, for one side of the app. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator, side: notificationSide },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", user._id).eq("side", args.side))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((n) => ({
        _id: n._id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        href: n.href,
        orderId: n.orderId ?? null,
        read: n.readAt !== undefined,
        readAt: n.readAt ?? null,
        createdAt: n._creationTime,
      })),
    };
  },
});

/** Badge count, capped at 99 ("99+" on the client when it's 99). */
export const unreadCount = query({
  args: { side: notificationSide },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_side_and_readAt", (q) =>
        q.eq("userId", user._id).eq("side", args.side).eq("readAt", undefined),
      )
      .take(UNREAD_CAP);
    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const n = await ctx.db.get("notifications", args.notificationId);
    if (n === null || n.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    if (n.readAt === undefined) await ctx.db.patch("notifications", n._id, { readAt: Date.now() });
  },
});

export const markAllRead = mutation({
  args: { side: notificationSide },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    // The first batch now, the rest in the background.
    await markReadBatch(ctx, user._id, args.side);
  },
});

/** Saves this phone's Expo push token for the signed-in person. */
export const registerPushToken = mutation({
  args: { platform: v.union(v.literal("ios"), v.literal("android")), token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const token = args.token.trim();
    if (!/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(token)) throw new ConvexError({ code: "INVALID_TOKEN" });
    // A token belongs to one phone: move it to whoever is signed in there now.
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .take(10);
    let kept = false;
    for (const row of rows) {
      if (!kept && row.userId === user._id) {
        kept = true;
        if (row.platform !== args.platform) await ctx.db.patch("pushTokens", row._id, { platform: args.platform });
      } else {
        await ctx.db.delete("pushTokens", row._id);
      }
    }
    if (!kept) await ctx.db.insert("pushTokens", { userId: user._id, token, platform: args.platform });
  },
});

/** On sign-out or when push is turned off on the phone. */
export const removePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return;
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token.trim()))
      .take(10);
    for (const row of rows) if (row.userId === user._id) await ctx.db.delete("pushTokens", row._id);
  },
});

/** W-48 / M-88 / F-75: every alert type with its push, SMS and email switches. */
export const preferences = query({
  args: { side: notificationSide },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return null;
    const prefs = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", user._id).eq("side", args.side))
      .take(100);
    return {
      side: args.side,
      channels: CHANNELS,
      // Guests have no email on file, and can't get push on the website
      hasEmail: !user.isAnonymous && !!user.email,
      alerts: preferenceRows(prefs, args.side),
    };
  },
});

/** Turns one channel (or, with no channel, every channel) of an alert type on or off. */
export const setPreference = mutation({
  args: {
    alert: v.string(),
    channel: v.optional(v.union(v.literal("push"), v.literal("sms"), v.literal("email"))),
    on: v.boolean(),
    side: notificationSide,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const alert = findAlert(args.side, args.alert);
    if (alert === null) throw new ConvexError({ code: "UNKNOWN_ALERT" });
    if (alert.locked) throw new ConvexError({ code: "ALERT_LOCKED" });
    const rows = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", user._id).eq("side", args.side))
      .take(100);
    const mine = rows.filter((p) => p.alert === args.alert);
    if (args.channel === undefined) {
      // The whole alert: one row, and the per-channel rows no longer apply.
      for (const row of mine) await ctx.db.delete("notificationPrefs", row._id);
      await ctx.db.insert("notificationPrefs", { userId: user._id, side: args.side, alert: args.alert, on: args.on });
      return;
    }
    const exact = mine.find((p) => p.channel === args.channel);
    if (exact) await ctx.db.patch("notificationPrefs", exact._id, { on: args.on });
    else
      await ctx.db.insert("notificationPrefs", {
        userId: user._id,
        side: args.side,
        alert: args.alert,
        channel: args.channel,
        on: args.on,
      });
  },
});
