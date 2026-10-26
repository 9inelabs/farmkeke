// Problem reports (M-67 to M-69, W-53, W-54, F-48). The shopper reports a
// problem before confirming receipt; the money stays held. The farm has 12
// hours to reply and Farmkeke decides within about a day (admin/disputes).
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getViewer, requireFarmer, requireUser } from "./lib/auth";
import { nextCounter } from "./lib/counters";
import { disputeRow, disputeView, REASON_LABELS } from "./lib/disputes";
import { notify, notifyConsumer, notifyFarm, notifyStaff } from "./lib/notify";
import { deliveredByShopper, shopperCanConfirm, transition } from "./lib/orders";
import { hitLimit } from "./lib/rateLimit";
import { getRules, HOUR } from "./lib/settings";
import { validateImageUpload } from "./lib/uploads";
import { disputeReason, disputeStance } from "./schema";

const MAX_NOTE = 2000;
// The farm is reminded this long before its reply deadline.
const REMINDER_BEFORE = 2 * HOUR;
const MAX_PHOTOS = 6;

const asArg = v.union(v.literal("consumer"), v.literal("farmer"));

async function viewerFarm(ctx: QueryCtx, user: Doc<"users">) {
  if (user.isAnonymous) return null;
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
}

function cleanText(text: string, required: boolean) {
  const body = text.trim();
  if (required && body.length === 0) throw new ConvexError({ code: "NOTE_REQUIRED" });
  if (body.length > MAX_NOTE) throw new ConvexError({ code: "NOTE_TOO_LONG", max: MAX_NOTE });
  return body;
}

async function checkPhotos(ctx: MutationCtx, photoIds: Id<"_storage">[]) {
  if (photoIds.length > MAX_PHOTOS) throw new ConvexError({ code: "TOO_MANY_PHOTOS", max: MAX_PHOTOS });
  for (const id of photoIds) await validateImageUpload(ctx, id);
}

/** The dispute and the caller's side, for a party acting on it. */
async function partyDispute(ctx: MutationCtx, disputeId: Id<"disputes">, as: "consumer" | "farmer") {
  const user = await requireUser(ctx);
  const dispute = await ctx.db.get("disputes", disputeId);
  if (dispute === null) throw new ConvexError({ code: "NOT_FOUND" });
  if (as === "consumer" && dispute.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
  if (as === "farmer") {
    const farm = await viewerFarm(ctx, user);
    if (farm === null || farm._id !== dispute.farmId) throw new ConvexError({ code: "NOT_FOUND" });
  }
  return { user, dispute };
}

/** W-53 / W-54: an upload URL for problem photos (the shopper's report, or the farm's reply). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await hitLimit(ctx, `dispute-upload:${user._id}`, 30, HOUR);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * M-67 / W-53: report a problem with a delivered or collected order, or one
 * the rider is bringing (the shopper has it, or it never came).
 * Phase 5: reasons "short" and "other", and `itemQuantities` (affected units
 * per chosen item, in itemIndexes order). The amount at stake is the value of
 * the affected units; the delivery fee is never part of it.
 */
export const open = mutation({
  args: {
    itemIndexes: v.array(v.number()),
    note: v.string(),
    orderId: v.id("orders"),
    photoIds: v.array(v.id("_storage")),
    reason: disputeReason,
    itemQuantities: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    // Only the identity (device) that placed it, like confirm receipt
    if (order === null || order.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.disputeId !== undefined) throw new ConvexError({ code: "ALREADY_REPORTED" });
    if (order.status === "completed" || order.confirmedAt !== undefined) {
      throw new ConvexError({ code: "ALREADY_CONFIRMED" });
    }
    if (!shopperCanConfirm(order)) {
      throw new ConvexError({ code: "NOT_DELIVERED_YET", status: order.status });
    }
    const note = cleanText(args.note, true);
    if (args.itemQuantities !== undefined && args.itemQuantities.length !== args.itemIndexes.length) {
      throw new ConvexError({ code: "INVALID_QUANTITY" });
    }
    // Pair each chosen item with its affected units (the whole line by default)
    const chosen = new Map<number, number | undefined>();
    args.itemIndexes.forEach((index, i) => chosen.set(index, args.itemQuantities?.[i]));
    const indexes =
      args.reason === "not_received" && args.itemIndexes.length === 0
        ? order.items.map((_, i) => i)
        : [...chosen.keys()].sort((a, b) => a - b);
    if (indexes.length === 0) throw new ConvexError({ code: "ITEMS_REQUIRED" });
    if (indexes.some((i) => !Number.isInteger(i) || i < 0 || i >= order.items.length)) {
      throw new ConvexError({ code: "INVALID_ITEM" });
    }
    const quantities = indexes.map((index) => {
      const line = order.items[index]!.quantity;
      const q = chosen.get(index);
      if (q === undefined) return line;
      if (!Number.isInteger(q) || q < 1 || q > line) throw new ConvexError({ code: "INVALID_QUANTITY", index, max: line });
      return q;
    });
    await checkPhotos(ctx, args.photoIds);

    const now = Date.now();
    const rules = await getRules(ctx);
    // Products only: the delivery fee is never part of a problem report's amount
    const amountKobo = indexes.reduce((sum, index, i) => sum + order.items[index]!.priceKobo * quantities[i]!, 0);
    const number = `DSP-${await nextCounter(ctx, "dispute", 1001)}`;
    const disputeId = await ctx.db.insert("disputes", {
      orderId: order._id,
      userId: user._id,
      farmId: order.farmId,
      number,
      reason: args.reason,
      itemIndexes: indexes,
      // Only stored when some line is partly affected
      itemQuantities: quantities.some((q, i) => q < order.items[indexes[i]!]!.quantity) ? quantities : undefined,
      note,
      photoIds: args.photoIds,
      amountKobo,
      status: "open",
      farmReplyBy: now + rules.disputeReplyHours * HOUR,
      decideBy: now + rules.disputeDecideHours * HOUR,
      consumerReadAt: now,
      lastMessageAt: now,
    });
    // The report opens the case thread (W-54)
    await ctx.db.insert("disputeMessages", { disputeId, authorId: user._id, as: "consumer", body: note, photoIds: args.photoIds });
    const actor = { kind: user.isAnonymous ? ("guest" as const) : ("consumer" as const), id: user._id };
    // Reported while the rider is bringing it: the delivery ends here
    const arrived = await deliveredByShopper(ctx, order, actor, "The shopper reported a problem on delivery");
    // Escrow stays held; the order can't be confirmed or released while disputed.
    const disputed = await transition(ctx, arrived, "disputed", actor, { disputeId }, REASON_LABELS[args.reason]);

    await notifyFarm(
      ctx,
      disputed,
      "dispute_opened",
      `Problem reported on order ${order.number}`,
      `${REASON_LABELS[args.reason]}. Please reply within ${rules.disputeReplyHours} hours.`,
    );
    await notifyConsumer(
      ctx,
      disputed,
      "dispute_opened",
      `We've got your report (${number})`,
      `Your payment stays held. The farm has ${rules.disputeReplyHours} hours to reply.`,
    );
    // A-12: staff alert, then the farm's reply clock (reminder 2h before, overdue at the deadline)
    await notifyStaff(ctx, {
      kind: "dispute_opened",
      title: `Problem reported: ${number}`,
      body: `${REASON_LABELS[args.reason]} on order ${order.number}.`,
      href: `/admin/disputes/${disputeId}`,
      orderId: order._id,
    });
    const replyBy = now + rules.disputeReplyHours * HOUR;
    await ctx.scheduler.runAt(Math.max(now, replyBy - REMINDER_BEFORE), internal.disputes.replyReminder, { disputeId });
    await ctx.scheduler.runAt(replyBy, internal.disputes.replyOverdue, { disputeId });
    return { disputeId, number };
  },
});

/** F-48: the farm's reply (once). Phase 5: optional `stance` (W-54 "Farm's response"). */
export const respond = mutation({
  args: {
    disputeId: v.id("disputes"),
    note: v.string(),
    photoIds: v.array(v.id("_storage")),
    stance: v.optional(disputeStance),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFarmer(ctx);
    const { dispute } = await partyDispute(ctx, args.disputeId, "farmer");
    if (dispute.status !== "open") throw new ConvexError({ code: "ALREADY_RESPONDED", status: dispute.status });
    const note = cleanText(args.note, true);
    await checkPhotos(ctx, args.photoIds);
    const now = Date.now();
    await ctx.db.patch("disputes", dispute._id, {
      status: "farmer_responded",
      farmRespondedAt: now,
      farmResponseNote: note,
      farmResponsePhotoIds: args.photoIds,
      farmStance: args.stance,
      farmerReadAt: now,
      lastMessageAt: now,
    });
    await ctx.db.insert("disputeMessages", {
      disputeId: dispute._id,
      authorId: user._id,
      as: "farmer",
      body: note,
      photoIds: args.photoIds,
    });
    const order = await ctx.db.get("orders", dispute.orderId);
    if (order !== null) {
      await notifyConsumer(ctx, order, "dispute_message", `The farm replied (${dispute.number})`, note.slice(0, 140));
    }
  },
});

/** A message on the case from the shopper or the farm. Both of them (and staff) see it. */
export const sendMessage = mutation({
  args: { as: asArg, body: v.string(), disputeId: v.id("disputes"), photoIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const { user, dispute } = await partyDispute(ctx, args.disputeId, args.as);
    if (dispute.status === "resolved") throw new ConvexError({ code: "DISPUTE_RESOLVED" });
    const body = cleanText(args.body, args.photoIds.length === 0);
    await checkPhotos(ctx, args.photoIds);
    const now = Date.now();
    const messageId = await ctx.db.insert("disputeMessages", {
      disputeId: dispute._id,
      authorId: user._id,
      as: args.as,
      body,
      photoIds: args.photoIds,
    });
    await ctx.db.patch("disputes", dispute._id, {
      lastMessageAt: now,
      ...(args.as === "consumer" ? { consumerReadAt: now } : { farmerReadAt: now }),
    });
    const order = await ctx.db.get("orders", dispute.orderId);
    if (order !== null) {
      const preview = body ? body.slice(0, 140) : "Photo";
      if (args.as === "consumer") {
        const farm = await ctx.db.get("farms", dispute.farmId);
        if (farm !== null) {
          await notify(ctx, {
            userId: farm.userId,
            side: "farm",
            kind: "dispute_message",
            title: `New message on ${dispute.number}`,
            body: preview,
            href: `/farm-dispute/${dispute._id}`,
            orderId: order._id,
          });
        }
      } else {
        await notifyConsumer(ctx, order, "dispute_message", `New message on ${dispute.number}`, preview);
      }
    }
    return { messageId };
  },
});

export const markRead = mutation({
  args: { as: asArg, disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const { dispute } = await partyDispute(ctx, args.disputeId, args.as);
    await ctx.db.patch("disputes", dispute._id, args.as === "consumer" ? { consumerReadAt: Date.now() } : { farmerReadAt: Date.now() });
  },
});

/** M-69 / W-54 or F-48: one case, for whichever party is looking. */
export const get = query({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const dispute = await ctx.db.get("disputes", args.disputeId);
    if (user === null || dispute === null) return null;
    if (dispute.userId === user._id) return { as: "consumer" as const, ...(await disputeView(ctx, dispute, "consumer")) };
    const farm = await viewerFarm(ctx, user);
    if (farm !== null && farm._id === dispute.farmId) {
      return { as: "farmer" as const, ...(await disputeView(ctx, dispute, "farmer")) };
    }
    return null;
  },
});

/** The shopper's case for an order (W-51 / M-63 link), or null. */
export const forOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (user === null || order === null || order.userId !== user._id || order.disputeId === undefined) return null;
    const dispute = await ctx.db.get("disputes", order.disputeId);
    return dispute === null ? null : await disputeView(ctx, dispute, "consumer");
  },
});

/** The farm's view of the case on one of its orders, or null. */
export const forFarmOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    const order = await ctx.db.get("orders", args.orderId);
    if (user === null || order === null || order.disputeId === undefined) return null;
    const farm = await viewerFarm(ctx, user);
    if (farm === null || farm._id !== order.farmId) return null;
    const dispute = await ctx.db.get("disputes", order.disputeId);
    return dispute === null ? null : await disputeView(ctx, dispute, "farmer");
  },
});

/** The shopper's cases, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null) return [];
    const rows = await ctx.db
      .query("disputes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return await Promise.all(rows.map((d) => disputeRow(ctx, d, "consumer")));
  },
});

/** Scheduled 2 hours before the farm's reply deadline: reminds the farm if it hasn't replied. */
export const replyReminder = internalMutation({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const dispute = await ctx.db.get("disputes", args.disputeId);
    if (dispute === null || dispute.status !== "open" || dispute.farmRemindedAt !== undefined) return null;
    const order = await ctx.db.get("orders", dispute.orderId);
    if (order === null) return null;
    await ctx.db.patch("disputes", dispute._id, { farmRemindedAt: Date.now() });
    const hoursLeft = Math.max(1, Math.round((dispute.farmReplyBy - Date.now()) / HOUR));
    await notifyFarm(
      ctx,
      order,
      "dispute_reply_reminder",
      `Reply needed: ${dispute.number}`,
      `Please reply to the problem report on order ${order.number} within ${hoursLeft} hours.`,
    );
    return null;
  },
});

/** Scheduled at the farm's reply deadline: marks the case overdue and alerts staff. */
export const replyOverdue = internalMutation({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const dispute = await ctx.db.get("disputes", args.disputeId);
    if (dispute === null || dispute.status !== "open" || dispute.farmReplyOverdueAt !== undefined) return null;
    const order = await ctx.db.get("orders", dispute.orderId);
    await ctx.db.patch("disputes", dispute._id, { farmReplyOverdueAt: Date.now() });
    await notifyStaff(ctx, {
      kind: "dispute_reply_overdue",
      title: `Farm reply overdue: ${dispute.number}`,
      body: `The farm didn't reply in time${order ? ` on order ${order.number}` : ""}. Decide without its reply.`,
      href: `/admin/disputes/${dispute._id}`,
      orderId: dispute.orderId,
    });
    // The farm hears its reply time is over (push + SMS + email per F-75)
    if (order !== null) {
      await notifyFarm(
        ctx,
        order,
        "dispute_reply_overdue",
        `Reply time ended: ${dispute.number}`,
        `Farmkeke will now decide on order ${order.number} without your reply.`,
      );
    }
    return null;
  },
});
