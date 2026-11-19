// A-90 Text messages: every text and code call sent through Termii, newest
// first, with whether the network delivered it (convex/texts.ts). Sign-up
// codes are listed without the code.
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireStaff } from "../lib/auth";

const VIEW: ("support.view" | "platform.manage")[] = ["support.view", "platform.manage"];

const textView = (t: Doc<"smsLog">) => ({
  id: t._id,
  at: t._creationTime,
  to: t.to,
  body: t.body,
  kind: t.kind ?? "notification",
  channel: t.channel ?? "sms",
  // recorded: Termii wasn't set up, so nothing went out
  sent: t.status,
  delivery: t.delivery ?? null,
  deliveryStatus: t.deliveryStatus ?? null,
  deliveryAt: t.deliveryAt ?? null,
  error: t.error ?? null,
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    delivery: v.optional(v.union(v.literal("pending"), v.literal("delivered"), v.literal("failed"))),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, VIEW);
    const delivery = args.delivery;
    const result =
      delivery === undefined
        ? await ctx.db.query("smsLog").order("desc").paginate(args.paginationOpts)
        : await ctx.db
            .query("smsLog")
            .withIndex("by_delivery", (q) => q.eq("delivery", delivery))
            .order("desc")
            .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(textView) };
  },
});

/** Counts since a time (the page passes 24 hours ago), up to 1,000 texts. */
export const summary = query({
  args: { since: v.number() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, VIEW);
    const rows = await ctx.db
      .query("smsLog")
      .withIndex("by_creation_time", (q) => q.gt("_creationTime", args.since))
      .take(1000);
    const count = { total: rows.length, delivered: 0, failed: 0, pending: 0, notSent: 0, calls: 0 };
    for (const r of rows) {
      if (r.channel === "voice") count.calls += 1;
      if (r.status === "failed") count.notSent += 1;
      else if (r.delivery === "delivered") count.delivered += 1;
      else if (r.delivery === "failed") count.failed += 1;
      else if (r.delivery === "pending") count.pending += 1;
    }
    return { ...count, capped: rows.length === 1000 };
  },
});
