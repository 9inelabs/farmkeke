// A-51 order chat: staff can read the conversation between shopper and farm.
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireStaff } from "../lib/auth";
import { messageView } from "../chat";

const READERS = ["support", "operations"] as const;

export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireStaff(ctx, [...READERS]);
    const order = await ctx.db.get("orders", args.orderId);
    if (order === null) return null;
    const farm = await ctx.db.get("farms", order.farmId);
    const c = await ctx.db
      .query("conversations")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .unique();
    return {
      orderId: order._id,
      number: order.number,
      status: order.status,
      conversationId: c?._id ?? null,
      shopper: { name: order.contact.name, phone: order.contact.phone },
      farm: farm === null ? null : { _id: farm._id, name: farm.name, phone: farm.phone },
      lastMessageAt: c?.lastMessageAt ?? null,
      consumerUnread: c?.consumerUnread ?? 0,
      farmerUnread: c?.farmerUnread ?? 0,
    };
  },
});

export const messages = query({
  args: { orderId: v.id("orders"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, [...READERS]);
    const c = await ctx.db
      .query("conversations")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (c === null) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", c._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((m) => messageView(ctx, m, "staff"))) };
  },
});
