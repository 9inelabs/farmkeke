// Order chat (M-74, M-75, W-58, F-83): one conversation per order, between the
// shopper ("shop") and the farm ("farm"). Only the two parties can read or
// write. Photos upload through generateUploadUrl. Sending is throttled.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getViewer, requireUser } from "./lib/auth";
import { notify } from "./lib/notify";
import { hitLimit } from "./lib/rateLimit";
import { recordReplyMinutes, replyNoteFor, replyTimeMinutes } from "./lib/shop";
import { validateImageUpload } from "./lib/uploads";

type Side = "shop" | "farm";
const sideArg = v.optional(v.union(v.literal("shop"), v.literal("farm")));

const MAX_BODY = 2000;
const MAX_PHOTOS = 4;
// Throttle: 20 messages a minute per person
const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_MAX = 20;
// One alert per burst of messages; nothing if it's read within a minute
const NUDGE_DELAY_MS = 60_000;
const NUDGE_GAP_MS = 10 * 60_000;

// No chat before payment, or once the order ended without being fulfilled
const NO_CHAT: Doc<"orders">["status"][] = ["awaiting_payment", "declined", "expired", "cancelled"];

const emptyPage = { page: [], isDone: true, continueCursor: "" };

async function farmOf(ctx: QueryCtx, user: Doc<"users">) {
  if (user.isAnonymous) return null;
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
}

/** Which side of the order the user is on, or null if neither. */
async function partyOf(ctx: QueryCtx, order: Doc<"orders">, user: Doc<"users">, side?: Side): Promise<Side | null> {
  const isShop = order.userId === user._id;
  const farm = await farmOf(ctx, user);
  const isFarm = farm !== null && farm._id === order.farmId;
  if (side === "shop") return isShop ? "shop" : null;
  if (side === "farm") return isFarm ? "farm" : null;
  return isShop ? "shop" : isFarm ? "farm" : null;
}

async function conversationFor(ctx: QueryCtx, orderId: Id<"orders">) {
  return await ctx.db
    .query("conversations")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .unique();
}

async function photoUrls(ctx: QueryCtx, ids: Id<"_storage">[]) {
  const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  return urls.filter((u): u is string => u !== null);
}

export async function messageView(ctx: QueryCtx, m: Doc<"messages">, viewer: Side | "staff", readByOther?: number) {
  return {
    _id: m._id,
    side: m.side,
    mine: m.side === viewer,
    body: m.body,
    photos: await photoUrls(ctx, m.photoIds),
    at: m._creationTime,
    // Read by the other side (W-58 "Read")
    read: m.side === viewer && readByOther !== undefined && readByOther >= m._creationTime,
  };
}

/** A conversation row for M-75 / F-83. */
async function conversationRow(ctx: QueryCtx, c: Doc<"conversations">, side: Side) {
  const order = await ctx.db.get("orders", c.orderId);
  const farm = await ctx.db.get("farms", c.farmId);
  return {
    conversationId: c._id,
    orderId: c.orderId,
    number: order?.number ?? "",
    status: order?.status ?? null,
    // Who the viewer is talking to
    name: side === "shop" ? (farm?.name ?? "Farm") : (order?.contact.name.split(/\s+/)[0] ?? "Shopper"),
    photoUrl: side === "shop" && farm?.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null,
    lastMessageAt: c.lastMessageAt,
    preview: c.lastMessagePreview ?? null,
    unread: side === "shop" ? c.consumerUnread : c.farmerUnread,
  };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    // Upload links per hour, so storage can't be filled with junk
    await hitLimit(ctx, `chat-upload:${user._id}`, 60, 3_600_000);
    return await ctx.storage.generateUploadUrl();
  },
});

/** M-74 / W-58 header: the order, who you're talking to, unread, and whether you can write. */
export const thread = query({
  args: { orderId: v.id("orders"), side: sideArg },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (user === null || order === null) return null;
    const side = await partyOf(ctx, order, user, args.side);
    if (side === null) return null;
    const farm = await ctx.db.get("farms", order.farmId);
    const c = await conversationFor(ctx, order._id);
    const first = order.items[0];
    return {
      conversationId: c?._id ?? null,
      side,
      canSend: !NO_CHAT.includes(order.status),
      unread: c === null ? 0 : side === "shop" ? c.consumerUnread : c.farmerUnread,
      order: {
        _id: order._id,
        number: order.number,
        status: order.status,
        fulfilment: order.fulfilment,
        summary: first ? `${first.name} ${first.quantity === 1 ? first.unitSingular : first.unitPlural} × ${first.quantity}` : "",
        itemCount: order.items.length,
        totalKobo: order.totalKobo,
        imageUrl: first?.photoId ? await ctx.storage.getUrl(first.photoId) : null,
      },
      // Phase 5 (W-58): the farm's usual reply time, from its recent replies; null with no history
      replyTimeMinutes: side === "shop" ? await replyTimeMinutes(ctx, order.farmId) : null,
      replyNote: side === "shop" ? replyNoteFor(await replyTimeMinutes(ctx, order.farmId)) : null,
      counterpart:
        side === "shop"
          ? {
              kind: "farm" as const,
              name: farm?.name ?? "Farm",
              photoUrl: farm?.photoStorageId ? await ctx.storage.getUrl(farm.photoStorageId) : null,
            }
          : { kind: "shopper" as const, name: order.contact.name.split(/\s+/)[0] ?? "Shopper", photoUrl: null },
    };
  },
});

/** Messages, newest first. */
export const messages = query({
  args: { orderId: v.id("orders"), paginationOpts: paginationOptsValidator, side: sideArg },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (user === null || order === null) return emptyPage;
    const side = await partyOf(ctx, order, user, args.side);
    if (side === null) return emptyPage;
    const c = await conversationFor(ctx, order._id);
    if (c === null) return emptyPage;
    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", c._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const readByOther = side === "shop" ? c.farmerReadAt : c.consumerReadAt;
    return { ...result, page: await Promise.all(result.page.map((m) => messageView(ctx, m, side, readByOther))) };
  },
});

async function throttle(ctx: MutationCtx, userId: Id<"users">) {
  const now = Date.now();
  const row = await ctx.db
    .query("messageThrottles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (row === null) {
    await ctx.db.insert("messageThrottles", { userId, windowStart: now, count: 1 });
  } else if (now - row.windowStart >= THROTTLE_WINDOW_MS) {
    await ctx.db.patch("messageThrottles", row._id, { windowStart: now, count: 1 });
  } else if (row.count >= THROTTLE_MAX) {
    throw new ConvexError({ code: "RATE_LIMITED", retryAfterMs: row.windowStart + THROTTLE_WINDOW_MS - now });
  } else {
    await ctx.db.patch("messageThrottles", row._id, { count: row.count + 1 });
  }
}

export const send = mutation({
  args: { body: v.string(), orderId: v.id("orders"), photoIds: v.array(v.id("_storage")), side: sideArg },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    const side = await partyOf(ctx, order, user, args.side);
    if (side === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (NO_CHAT.includes(order.status)) throw new ConvexError({ code: "CHAT_CLOSED", status: order.status });
    const body = args.body.trim();
    if (body.length === 0 && args.photoIds.length === 0) throw new ConvexError({ code: "EMPTY_MESSAGE" });
    if (body.length > MAX_BODY) throw new ConvexError({ code: "MESSAGE_TOO_LONG", max: MAX_BODY });
    if (args.photoIds.length > MAX_PHOTOS) throw new ConvexError({ code: "TOO_MANY_PHOTOS", max: MAX_PHOTOS });
    await throttle(ctx, user._id);
    for (const id of args.photoIds) await validateImageUpload(ctx, id);

    const now = Date.now();
    const preview = body ? body.slice(0, 120) : "Photo";
    let c = await conversationFor(ctx, order._id);
    if (c === null) {
      const id = await ctx.db.insert("conversations", {
        orderId: order._id,
        userId: order.userId,
        farmId: order.farmId,
        lastMessageAt: now,
        consumerUnread: 0,
        farmerUnread: 0,
      });
      c = (await ctx.db.get("conversations", id))!;
    }
    const messageId = await ctx.db.insert("messages", {
      conversationId: c._id,
      orderId: order._id,
      senderId: user._id,
      side,
      body,
      photoIds: args.photoIds,
    });
    const otherUnread = side === "shop" ? c.farmerUnread : c.consumerUnread;
    // W-58 reply times: from the shopper's first unanswered message to the farm's answer
    let awaiting: { awaitingFarmSince?: number } = {};
    if (side === "shop" && c.awaitingFarmSince === undefined) awaiting = { awaitingFarmSince: now };
    if (side === "farm" && c.awaitingFarmSince !== undefined) {
      await recordReplyMinutes(ctx, order.farmId, (now - c.awaitingFarmSince) / 60_000);
      awaiting = { awaitingFarmSince: undefined };
    }
    await ctx.db.patch("conversations", c._id, {
      ...awaiting,
      lastMessageAt: now,
      lastMessagePreview: preview,
      // Writing means you've read the thread
      ...(side === "shop"
        ? { farmerUnread: otherUnread + 1, consumerUnread: 0, consumerReadAt: now }
        : { consumerUnread: otherUnread + 1, farmerUnread: 0, farmerReadAt: now }),
    });
    if (otherUnread === 0) {
      await ctx.scheduler.runAfter(NUDGE_DELAY_MS, internal.chat.nudge, {
        conversationId: c._id,
        to: side === "shop" ? "farmer" : "consumer",
      });
    }
    return { messageId };
  },
});

/** Alerts the other side once per burst, if they still haven't read it. */
export const nudge = internalMutation({
  args: { conversationId: v.id("conversations"), to: v.union(v.literal("consumer"), v.literal("farmer")) },
  handler: async (ctx, args) => {
    const c = await ctx.db.get("conversations", args.conversationId);
    if (c === null) return;
    const unread = args.to === "consumer" ? c.consumerUnread : c.farmerUnread;
    const last = args.to === "consumer" ? c.nudgedConsumerAt : c.nudgedFarmerAt;
    const now = Date.now();
    if (unread === 0 || (last !== undefined && now - last < NUDGE_GAP_MS)) return;
    const order = await ctx.db.get("orders", c.orderId);
    const farm = await ctx.db.get("farms", c.farmId);
    if (order === null || farm === null) return;
    const preview = c.lastMessagePreview ?? "New message";
    if (args.to === "consumer") {
      await ctx.db.patch("conversations", c._id, { nudgedConsumerAt: now });
      // Push or SMS for shoppers (section 5)
      await notify(ctx, {
        userId: order.userId,
        side: "shop",
        kind: "chat_message",
        title: `${farm.name} replied`,
        body: preview,
        href: `/order/${order._id}/chat`,
        orderId: order._id,
        smsTo: order.contact.phone,
      });
    } else {
      await ctx.db.patch("conversations", c._id, { nudgedFarmerAt: now });
      // Push only for farmers
      await notify(ctx, {
        userId: farm.userId,
        side: "farm",
        kind: "chat_message",
        title: `Message about order ${order.number}`,
        body: preview,
        href: `/farm-order/${order._id}/chat`,
        orderId: order._id,
      });
    }
  },
});

export const markRead = mutation({
  args: { orderId: v.id("orders"), side: sideArg },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    const side = await partyOf(ctx, order, user, args.side);
    if (side === null) throw new ConvexError({ code: "NOT_FOUND" });
    const c = await conversationFor(ctx, order._id);
    if (c === null) return;
    const now = Date.now();
    await ctx.db.patch(
      "conversations",
      c._id,
      side === "shop" ? { consumerUnread: 0, consumerReadAt: now } : { farmerUnread: 0, farmerReadAt: now },
    );
  },
});

/** Unread messages across the viewer's chats on one side (tab badge). */
export const unread = query({
  args: { side: v.union(v.literal("shop"), v.literal("farm")) },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return 0;
    if (args.side === "shop") {
      const rows = await ctx.db
        .query("conversations")
        .withIndex("by_userId_and_lastMessageAt", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(100);
      return rows.reduce((sum, c) => sum + c.consumerUnread, 0);
    }
    const farm = await farmOf(ctx, user);
    if (farm === null) return 0;
    const rows = await ctx.db
      .query("conversations")
      .withIndex("by_farmId_and_lastMessageAt", (q) => q.eq("farmId", farm._id))
      .order("desc")
      .take(100);
    return rows.reduce((sum, c) => sum + c.farmerUnread, 0);
  },
});

/** M-75: the shopper's chats, latest first. */
export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return emptyPage;
    const result = await ctx.db
      .query("conversations")
      .withIndex("by_userId_and_lastMessageAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((c) => conversationRow(ctx, c, "shop"))) };
  },
});

/** F-83: the farm's chats, latest first. */
export const listForFarm = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const farm = user === null ? null : await farmOf(ctx, user);
    if (farm === null) return emptyPage;
    const result = await ctx.db
      .query("conversations")
      .withIndex("by_farmId_and_lastMessageAt", (q) => q.eq("farmId", farm._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((c) => conversationRow(ctx, c, "farm"))) };
  },
});
