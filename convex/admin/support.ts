// A-75 Support tickets and A-76 Ticket detail: one queue for shoppers and farmers.
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireStaff } from "../lib/auth";
import { notify } from "../lib/notify";
import { validateImageUpload } from "../lib/uploads";
import { supportMessageView, ticketView } from "../support";


async function getTicket(ctx: MutationCtx, ticketId: Id<"supportTickets">) {
  const ticket = await ctx.db.get("supportTickets", ticketId);
  if (ticket === null) throw new ConvexError({ code: "NOT_FOUND" });
  return ticket;
}

export const list = query({
  args: { paginationOpts: paginationOptsValidator, status: v.optional(v.union(v.literal("open"), v.literal("resolved"))) },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "support.view");
    const status = args.status;
    const result =
      status === undefined
        ? await ctx.db.query("supportTickets").withIndex("by_lastMessageAt").order("desc").paginate(args.paginationOpts)
        : await ctx.db
            .query("supportTickets")
            .withIndex("by_status_and_lastMessageAt", (q) => q.eq("status", status))
            .order("desc")
            .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (t) => {
          const user = await ctx.db.get("users", t.userId);
          const assignee = t.assigneeId ? await ctx.db.get("users", t.assigneeId) : null;
          return {
            ...(await ticketView(ctx, t, t.staffReadAt, "staff")),
            from: { name: user?.name ?? null, email: user?.email ?? null, isGuest: user?.isAnonymous === true },
            assignee: assignee === null ? null : { _id: assignee._id, name: assignee.name ?? assignee.email ?? "Staff" },
          };
        }),
      ),
    };
  },
});

export const get = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "support.view");
    const t = await ctx.db.get("supportTickets", args.ticketId);
    if (t === null) return null;
    const user = await ctx.db.get("users", t.userId);
    const farm =
      t.side === "farm"
        ? await ctx.db
            .query("farms")
            .withIndex("by_userId", (q) => q.eq("userId", t.userId))
            .unique()
        : null;
    const assignee = t.assigneeId ? await ctx.db.get("users", t.assigneeId) : null;
    return {
      ...(await ticketView(ctx, t, t.staffReadAt, "staff")),
      from: {
        userId: t.userId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        phone: user?.phone ?? farm?.phone ?? null,
        isGuest: user?.isAnonymous === true,
        farm: farm === null ? null : { _id: farm._id, name: farm.name },
      },
      assignee: assignee === null ? null : { _id: assignee._id, name: assignee.name ?? assignee.email ?? "Staff" },
    };
  },
});

export const messages = query({
  args: { paginationOpts: paginationOptsValidator, ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "support.view");
    const result = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((m) => supportMessageView(ctx, m, "staff"))) };
  },
});

export const reply = mutation({
  args: { body: v.string(), photoIds: v.array(v.id("_storage")), ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "support.manage");
    const ticket = await getTicket(ctx, args.ticketId);
    const body = args.body.trim();
    if (body.length === 0 && args.photoIds.length === 0) throw new ConvexError({ code: "EMPTY_MESSAGE" });
    if (body.length > 4000) throw new ConvexError({ code: "MESSAGE_TOO_LONG" });
    if (args.photoIds.length > 4) throw new ConvexError({ code: "TOO_MANY_PHOTOS" });
    for (const id of args.photoIds) await validateImageUpload(ctx, id);
    const now = Date.now();
    const messageId = await ctx.db.insert("supportMessages", {
      ticketId: ticket._id,
      authorId: staff._id,
      from: "staff",
      body,
      photoIds: args.photoIds,
    });
    await ctx.db.patch("supportTickets", ticket._id, {
      lastMessageAt: now,
      staffReadAt: now,
      lastFrom: "staff",
      preview: body.slice(0, 120) || "Photo",
      assigneeId: ticket.assigneeId ?? staff._id,
    });
    await notify(ctx, {
      userId: ticket.userId,
      side: ticket.side,
      kind: "support_reply",
      title: "Farmkeke support replied",
      body: body ? body.slice(0, 140) : "Photo",
      href: `/support/${ticket._id}`,
      orderId: ticket.orderId,
    });
    return { messageId };
  },
});

export const assign = mutation({
  args: { assigneeId: v.optional(v.id("users")), ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "support.manage");
    const ticket = await getTicket(ctx, args.ticketId);
    let name = "nobody";
    if (args.assigneeId !== undefined) {
      const assignee = await ctx.db.get("users", args.assigneeId);
      if (assignee === null || assignee.staffRole === undefined) throw new ConvexError({ code: "NOT_STAFF" });
      name = assignee.name ?? assignee.email ?? "staff";
    }
    await ctx.db.patch("supportTickets", ticket._id, { assigneeId: args.assigneeId });
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "support.assign",
      targetTable: "supportTickets",
      targetId: ticket._id,
      reason: `Assigned to ${name}`,
      details: { number: ticket.number ?? null },
    });
  },
});

export const markRead = mutation({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "support.view");
    const ticket = await getTicket(ctx, args.ticketId);
    await ctx.db.patch("supportTickets", ticket._id, { staffReadAt: Date.now() });
  },
});

export const resolve = mutation({
  args: { reason: v.string(), ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "support.manage");
    const ticket = await getTicket(ctx, args.ticketId);
    if (ticket.status === "resolved") return;
    await writeAudit(ctx, {
      actorId: staff._id,
      action: "support.resolve",
      targetTable: "supportTickets",
      targetId: ticket._id,
      reason: args.reason,
      details: { number: ticket.number ?? null },
    });
    await ctx.db.patch("supportTickets", ticket._id, { status: "resolved", resolvedAt: Date.now(), staffReadAt: Date.now() });
  },
});
