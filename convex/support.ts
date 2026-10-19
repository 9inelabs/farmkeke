// Contact support (M-91, F-91, W-86): tickets with messages and photos.
// Works for guests (their anonymous identity) as well as accounts.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getViewer, requireUser } from "./lib/auth";
import { nextCounter } from "./lib/counters";
import { hitLimit } from "./lib/rateLimit";
import { HOUR } from "./lib/settings";
import { validateImageUpload } from "./lib/uploads";
import { notificationSide } from "./schema";

const MAX_BODY = 4000;
const MAX_PHOTOS = 4;

const emptyPage = { page: [], isDone: true, continueCursor: "" };

async function viewerFarm(ctx: QueryCtx, user: Doc<"users">) {
  if (user.isAnonymous) return null;
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
}

function cleanBody(text: string, photos: number) {
  const body = text.trim();
  if (body.length === 0 && photos === 0) throw new ConvexError({ code: "EMPTY_MESSAGE" });
  if (body.length > MAX_BODY) throw new ConvexError({ code: "MESSAGE_TOO_LONG", max: MAX_BODY });
  return body;
}

async function checkPhotos(ctx: MutationCtx, photoIds: Id<"_storage">[]) {
  if (photoIds.length > MAX_PHOTOS) throw new ConvexError({ code: "TOO_MANY_PHOTOS", max: MAX_PHOTOS });
  for (const id of photoIds) await validateImageUpload(ctx, id);
}

export async function ticketView(ctx: QueryCtx, t: Doc<"supportTickets">, readAt: number | undefined, from: "user" | "staff") {
  const order = t.orderId ? await ctx.db.get("orders", t.orderId) : null;
  const listing = t.listingId ? await ctx.db.get("listings", t.listingId) : null;
  const farm = t.farmId ? await ctx.db.get("farms", t.farmId) : null;
  return {
    // Phase 5 (W-06): "About: Fresh tomatoes from Okafor Farms"
    about:
      listing === null && farm === null
        ? null
        : { listingId: t.listingId ?? null, listingName: listing?.name ?? null, farmId: t.farmId ?? null, farmName: farm?.name ?? null },
    _id: t._id,
    number: t.number ?? null,
    side: t.side,
    status: t.status,
    order: order === null ? null : { orderId: order._id, number: order.number },
    preview: t.preview ?? null,
    createdAt: t._creationTime,
    lastMessageAt: t.lastMessageAt,
    resolvedAt: t.resolvedAt ?? null,
    // New message from the other side since this side last read
    unread: t.lastFrom !== undefined && t.lastFrom !== from && (readAt === undefined || t.lastMessageAt > readAt),
  };
}

export async function supportMessageView(ctx: QueryCtx, m: Doc<"supportMessages">, viewer: "user" | "staff") {
  const author = viewer === "staff" && m.authorId ? await ctx.db.get("users", m.authorId) : null;
  const photos = await Promise.all(m.photoIds.map((id) => ctx.storage.getUrl(id)));
  return {
    _id: m._id,
    from: m.from,
    mine: m.from === viewer,
    authorName: m.from === "staff" ? (viewer === "staff" ? (author?.name ?? "Staff") : "Farmkeke support") : (author?.name ?? null),
    body: m.body,
    photos: photos.filter((u): u is string => u !== null),
    at: m._creationTime,
  };
}

/** The caller's own ticket, or null. */
async function ownTicket(ctx: QueryCtx, ticketId: Id<"supportTickets">) {
  const user = await getViewer(ctx);
  const ticket = await ctx.db.get("supportTickets", ticketId);
  if (user === null || ticket === null || ticket.userId !== user._id) return null;
  return { user, ticket };
}

/** Opens a ticket with its first message. Linked to one of the caller's orders if given. */
export const open = mutation({
  args: {
    body: v.string(),
    orderId: v.optional(v.id("orders")),
    photoIds: v.array(v.id("_storage")),
    side: notificationSide,
    // Phase 5 (W-06 "Ask a question"): the product and farm it's about. Strings,
    // so an id from an old link can't fail the form; unknown ids are dropped.
    listingId: v.optional(v.string()),
    farmId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.blockedAt !== undefined) throw new ConvexError({ code: "BLOCKED" });
    const body = cleanBody(args.body, args.photoIds.length);
    if (args.side === "farm" && (await viewerFarm(ctx, user)) === null) throw new ConvexError({ code: "NOT_FARMER" });
    if (args.orderId !== undefined) {
      const order = await ctx.db.get("orders", args.orderId);
      const farm = args.side === "farm" ? await viewerFarm(ctx, user) : null;
      const mine = order !== null && (args.side === "shop" ? order.userId === user._id : order.farmId === farm?._id);
      if (!mine) throw new ConvexError({ code: "NOT_FOUND" });
    }
    await hitLimit(ctx, `support:${user._id}`, 5, HOUR);
    await checkPhotos(ctx, args.photoIds);
    const now = Date.now();
    const number = `SUP-${await nextCounter(ctx, "support", 1001)}`;
    const listingId = args.listingId ? ctx.db.normalizeId("listings", args.listingId) : null;
    const listing = listingId ? await ctx.db.get("listings", listingId) : null;
    const farmRaw = args.farmId ? ctx.db.normalizeId("farms", args.farmId) : null;
    const farmId = listing?.farmId ?? (farmRaw && (await ctx.db.get("farms", farmRaw)) ? farmRaw : null);
    const ticketId = await ctx.db.insert("supportTickets", {
      userId: user._id,
      side: args.side,
      orderId: args.orderId,
      listingId: listing?._id,
      farmId: farmId ?? undefined,
      number,
      status: "open",
      lastMessageAt: now,
      userReadAt: now,
      lastFrom: "user",
      preview: body.slice(0, 120) || "Photo",
    });
    await ctx.db.insert("supportMessages", { ticketId, authorId: user._id, from: "user", body, photoIds: args.photoIds });
    return { ticketId, number };
  },
});

/** A message on the caller's ticket. Writing again reopens a resolved ticket. */
export const send = mutation({
  args: { body: v.string(), photoIds: v.array(v.id("_storage")), ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ticket = await ctx.db.get("supportTickets", args.ticketId);
    if (ticket === null || ticket.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    const body = cleanBody(args.body, args.photoIds.length);
    await hitLimit(ctx, `support-message:${user._id}`, 30, HOUR);
    await checkPhotos(ctx, args.photoIds);
    const now = Date.now();
    const messageId = await ctx.db.insert("supportMessages", {
      ticketId: ticket._id,
      authorId: user._id,
      from: "user",
      body,
      photoIds: args.photoIds,
    });
    await ctx.db.patch("supportTickets", ticket._id, {
      status: "open",
      resolvedAt: undefined,
      lastMessageAt: now,
      userReadAt: now,
      lastFrom: "user",
      preview: body.slice(0, 120) || "Photo",
    });
    return { messageId };
  },
});

export const markRead = mutation({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ticket = await ctx.db.get("supportTickets", args.ticketId);
    if (ticket === null || ticket.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    await ctx.db.patch("supportTickets", ticket._id, { userReadAt: Date.now() });
  },
});

/** The caller's tickets on one side, latest first. */
export const mine = query({
  args: { side: notificationSide },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return [];
    const rows = await ctx.db
      .query("supportTickets")
      .withIndex("by_userId_and_side", (q) => q.eq("userId", user._id).eq("side", args.side))
      .take(100);
    rows.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return await Promise.all(rows.slice(0, 50).map((t) => ticketView(ctx, t, t.userReadAt, "user")));
  },
});

export const get = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const own = await ownTicket(ctx, args.ticketId);
    if (own === null) return null;
    return await ticketView(ctx, own.ticket, own.ticket.userReadAt, "user");
  },
});

/** Messages on the caller's ticket, newest first. */
export const messages = query({
  args: { paginationOpts: paginationOptsValidator, ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const own = await ownTicket(ctx, args.ticketId);
    if (own === null) return emptyPage;
    const result = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", own.ticket._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((m) => supportMessageView(ctx, m, "user"))) };
  },
});

/** F-91 / M-91 order picker: the caller's recent orders. */
export const orderChoices = query({
  args: { side: notificationSide },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (user === null) return [];
    let orders: Doc<"orders">[];
    if (args.side === "shop") {
      orders = (
        await ctx.db
          .query("orders")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .order("desc")
          .take(40)
      ).filter((o) => o.paidAt !== undefined);
    } else {
      const farm = await viewerFarm(ctx, user);
      if (farm === null) return [];
      orders = (
        await ctx.db
          .query("orders")
          .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id))
          .take(300)
      )
        .filter((o) => o.paidAt !== undefined)
        .sort((a, b) => b._creationTime - a._creationTime);
    }
    return await Promise.all(
      orders.slice(0, 20).map(async (o) => {
        const farm = await ctx.db.get("farms", o.farmId);
        return {
          orderId: o._id,
          number: o.number,
          status: o.status,
          farmName: farm?.name ?? "Farm",
          consumerFirstName: o.contact.name.split(/\s+/)[0] ?? "",
          placedAt: o._creationTime,
          totalKobo: o.totalKobo,
        };
      }),
    );
  },
});
