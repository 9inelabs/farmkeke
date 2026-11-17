// A-70 Disputes, A-71 Dispute detail, A-72 Resolve. Staff read both sides,
// message either party, keep internal notes, and decide the money: release
// to the farm, refund in full, or split (part refund without the delivery fee).
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { isStaffWith, requireStaff } from "../lib/auth";
import { disputeRow, disputeView } from "../lib/disputes";
import { naira, notify, notifyConsumer, notifyFarm } from "../lib/notify";
import { orderCore, refundOrder, transition } from "../lib/orders";
import { validateImageUpload } from "../lib/uploads";
import { disputeStatus } from "../schema";

// Deciding moves money

async function getDispute(ctx: MutationCtx, disputeId: Id<"disputes">) {
  const dispute = await ctx.db.get("disputes", disputeId);
  if (dispute === null) throw new ConvexError({ code: "NOT_FOUND" });
  return dispute;
}

export const list = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(disputeStatus) },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "disputes.view");
    const status = args.status;
    const result =
      status === undefined
        ? await ctx.db.query("disputes").order("desc").paginate(args.paginationOpts)
        : await ctx.db
            .query("disputes")
            .withIndex("by_status", (q) => q.eq("status", status))
            .order("desc")
            .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (d) => {
          const assignee = d.assigneeId ? await ctx.db.get("users", d.assigneeId) : null;
          return {
            ...(await disputeRow(ctx, d, "staff")),
            farmResponded: d.farmRespondedAt !== undefined,
            assignee: assignee === null ? null : { _id: assignee._id, name: assignee.name ?? assignee.email ?? "Staff" },
          };
        }),
      ),
    };
  },
});

/** Sidebar badge: problem reports not yet decided (up to 99). */
export const openCount = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "disputes.view");
    const open = await ctx.db.query("disputes").withIndex("by_status", (q) => q.eq("status", "open")).take(99);
    const replied = await ctx.db.query("disputes").withIndex("by_status", (q) => q.eq("status", "farmer_responded")).take(99);
    return Math.min(99, open.length + replied.length);
  },
});

export const get = query({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "disputes.view");
    const dispute = await ctx.db.get("disputes", args.disputeId);
    if (dispute === null) return null;
    const order = await ctx.db.get("orders", dispute.orderId);
    const farm = await ctx.db.get("farms", dispute.farmId);
    const consumer = await ctx.db.get("users", dispute.userId);
    const assignee = dispute.assigneeId ? await ctx.db.get("users", dispute.assigneeId) : null;
    const decidedBy = dispute.decidedBy ? await ctx.db.get("users", dispute.decidedBy) : null;
    const notes = await ctx.db
      .query("disputeNotes")
      .withIndex("by_disputeId", (q) => q.eq("disputeId", dispute._id))
      .take(200);
    return {
      ...(await disputeView(ctx, dispute, "staff", staff._id)),
      order: order === null ? null : await orderCore(ctx, order),
      // The farm's share Paystack sent, Farmkeke's commission and any debt taken
      money:
        order === null || order.farmShareKobo === undefined
          ? null
          : { farmShareKobo: order.farmShareKobo, commissionKobo: order.commissionKobo ?? 0, recoveredKobo: order.recoveredKobo ?? 0 },
      consumer: {
        name: order?.contact.name ?? consumer?.name ?? "",
        phone: order?.contact.phone ?? null,
        email: consumer?.email ?? order?.contact.email ?? null,
        isGuest: consumer?.isAnonymous === true,
      },
      farm: farm === null ? null : { _id: farm._id, name: farm.name, phone: farm.phone },
      assignee: assignee === null ? null : { _id: assignee._id, name: assignee.name ?? assignee.email ?? "Staff" },
      decidedBy: decidedBy === null ? null : { _id: decidedBy._id, name: decidedBy.name ?? "Staff" },
      notes: await Promise.all(
        notes.map(async (n) => {
          const author = await ctx.db.get("users", n.authorId);
          return { _id: n._id, body: n.body, at: n._creationTime, authorName: author?.name ?? "Staff" };
        }),
      ),
    };
  },
});

export const assign = mutation({
  args: { assigneeId: v.optional(v.id("users")), disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "disputes.manage");
    const dispute = await getDispute(ctx, args.disputeId);
    let name = "nobody";
    if (args.assigneeId !== undefined) {
      const assignee = await ctx.db.get("users", args.assigneeId);
      if (assignee === null || !(await isStaffWith(ctx, assignee._id, "disputes.manage"))) throw new ConvexError({ code: "NOT_STAFF" });
      name = assignee.name ?? assignee.email ?? "staff";
    }
    await ctx.db.patch("disputes", dispute._id, { assigneeId: args.assigneeId });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "dispute.assign",
      targetTable: "disputes",
      targetId: dispute._id,
      reason: `Assigned to ${name}`,
      details: { number: dispute.number, assigneeId: args.assigneeId ?? null },
    });
  },
});

export const addNote = mutation({
  args: { body: v.string(), disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "disputes.manage");
    const dispute = await getDispute(ctx, args.disputeId);
    const body = args.body.trim();
    if (body.length === 0) throw new ConvexError({ code: "NOTE_REQUIRED" });
    if (body.length > 4000) throw new ConvexError({ code: "NOTE_TOO_LONG" });
    await ctx.db.insert("disputeNotes", { disputeId: dispute._id, authorId: staff._id, body });
  },
});

export const markRead = mutation({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "disputes.view");
    const dispute = await getDispute(ctx, args.disputeId);
    await ctx.db.patch("disputes", dispute._id, { staffReadAt: Date.now() });
  },
});

/** A-71: a message to one party. Only that party sees it. */
export const sendMessage = mutation({
  args: {
    audience: v.union(v.literal("consumer"), v.literal("farmer")),
    body: v.string(),
    disputeId: v.id("disputes"),
    photoIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "disputes.manage");
    const dispute = await getDispute(ctx, args.disputeId);
    const body = args.body.trim();
    if (body.length === 0 && args.photoIds.length === 0) throw new ConvexError({ code: "EMPTY_MESSAGE" });
    if (body.length > 4000) throw new ConvexError({ code: "MESSAGE_TOO_LONG" });
    if (args.photoIds.length > 6) throw new ConvexError({ code: "TOO_MANY_PHOTOS" });
    for (const id of args.photoIds) await validateImageUpload(ctx, id);
    const now = Date.now();
    const messageId = await ctx.db.insert("disputeMessages", {
      disputeId: dispute._id,
      authorId: staff._id,
      as: "staff",
      audience: args.audience,
      body,
      photoIds: args.photoIds,
    });
    await ctx.db.patch("disputes", dispute._id, { lastMessageAt: now, staffReadAt: now });
    const order = await ctx.db.get("orders", dispute.orderId);
    const preview = body ? body.slice(0, 140) : "Photo";
    if (order !== null && args.audience === "consumer") {
      await notifyConsumer(ctx, order, "dispute_message", `Farmkeke support on ${dispute.number}`, preview);
    } else if (order !== null) {
      const farm = await ctx.db.get("farms", dispute.farmId);
      if (farm !== null) {
        await notify(ctx, {
          userId: farm.userId,
          side: "farm",
          kind: "dispute_message",
          title: `Farmkeke support on ${dispute.number}`,
          body: preview,
          href: `/farm-dispute/${dispute._id}`,
          orderId: order._id,
        });
      }
    }
    return { messageId };
  },
});

/**
 * A-72: decide the money. The farm was paid its share when the shopper paid
 * (Paystack split), so refunds come from Farmkeke and, unless chargeFarm is
 * false, the farm's part is owed back from its next orders.
 * - released: no refund; the farm keeps its share.
 * - refunded: full refund, delivery fee included; the order is cancelled.
 * - split: part refund of the products (never the delivery fee).
 */
export const resolve = mutation({
  args: {
    disputeId: v.id("disputes"),
    note: v.string(),
    // released: no refund; refunded: full refund (order cancelled); split: part refund of the products
    outcome: v.union(v.literal("released"), v.literal("refunded"), v.literal("split")),
    reason: v.string(),
    refundKobo: v.optional(v.number()),
    // Whether the farm owes back its part of the refund, taken from its next
    // orders (default yes; no when it wasn't the farm's fault, e.g. the rider's)
    chargeFarm: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "disputes.decide");
    const dispute = await getDispute(ctx, args.disputeId);
    if (dispute.status === "resolved") throw new ConvexError({ code: "ALREADY_RESOLVED" });
    const order = await ctx.db.get("orders", dispute.orderId);
    if (order === null) throw new ConvexError({ code: "NOT_FOUND" });
    if (order.status !== "disputed") throw new ConvexError({ code: "WRONG_STATUS", status: order.status });
    // Paystack split the payment when it was made: the farm has its share,
    // so any refund comes from Farmkeke
    if (order.farmShareKobo === undefined) throw new ConvexError({ code: "NOT_PAID", escrow: order.escrow });
    const chargeFarm = args.chargeFarm !== false;
    const note = args.note.trim();
    if (note.length === 0) throw new ConvexError({ code: "NOTE_REQUIRED" });

    const actor = { kind: "staff" as const, id: staff._id };
    const now = Date.now();
    let refundKobo = 0;
    if (args.outcome === "split") {
      // A part refund covers some of the products; the delivery fee is never in it
      refundKobo = args.refundKobo ?? 0;
      if (!Number.isInteger(refundKobo) || refundKobo <= 0 || refundKobo >= order.itemsTotalKobo) {
        throw new ConvexError({ code: "INVALID_AMOUNT", itemsTotalKobo: order.itemsTotalKobo });
      }
    } else if (args.outcome === "refunded") {
      refundKobo = order.totalKobo;
    }

    // Audit first: it also checks that a reason was given.
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "dispute.resolve",
      targetTable: "disputes",
      targetId: dispute._id,
      reason: args.reason,
      details: { number: dispute.number, orderNumber: order.number, outcome: args.outcome, refundKobo, chargeFarm: refundKobo > 0 ? chargeFarm : null },
    });

    const label = `Dispute ${dispute.number}: ${args.outcome}`;
    if (args.outcome === "refunded") {
      const ended = await transition(
        ctx,
        order,
        "cancelled",
        actor,
        { endedAt: now, escrow: "refunded", cancelReason: "dispute_refunded" },
        label,
      );
      await refundOrder(ctx, ended, { kind: "full", reason: label, actor, disputeId: dispute._id, chargeFarm });
    } else {
      const done = await transition(
        ctx,
        order,
        "completed",
        actor,
        { endedAt: now, ...(args.outcome === "split" ? { escrow: "split" as const } : {}) },
        label,
      );
      if (args.outcome === "split") {
        await refundOrder(ctx, done, { kind: "part", amountKobo: refundKobo, reason: label, actor, disputeId: dispute._id, chargeFarm });
      }
    }

    await ctx.db.patch("disputes", dispute._id, {
      status: "resolved",
      outcome: args.outcome,
      refundKobo,
      // What the farm keeps of the products
      releaseKobo: args.outcome === "refunded" ? 0 : order.itemsTotalKobo - refundKobo,
      decisionNote: note,
      decidedAt: now,
      decidedBy: staff._id,
      staffReadAt: now,
    });
    const after = (await ctx.db.get("orders", order._id))!;
    const refund = refundKobo > 0 ? await ctx.db.query("refunds").withIndex("by_orderId", (q) => q.eq("orderId", order._id)).order("desc").first() : null;
    const debt = refund?.farmDebtKobo ?? 0;
    const shopper =
      args.outcome === "refunded"
        ? `Full refund of ${naira(refundKobo)}. Banks usually take 3 to 10 working days to show it.`
        : args.outcome === "split"
          ? `Part refund of ${naira(refundKobo)} for the affected items. Banks usually take 3 to 10 working days to show it.`
          : "No refund. The order arrived as described.";
    const farm =
      args.outcome === "released"
        ? "No refund. You keep the full payment."
        : debt > 0
          ? `Farmkeke refunded the shopper ${naira(refundKobo)}. ${naira(debt)} of it comes off your next orders.`
          : `Farmkeke refunded the shopper ${naira(refundKobo)}. You don't owe anything for it.`;
    await notifyConsumer(ctx, after, "dispute_resolved", `Decision on ${dispute.number}`, shopper);
    await notifyFarm(ctx, after, "dispute_resolved", `Decision on ${dispute.number}`, farm);
  },
});
