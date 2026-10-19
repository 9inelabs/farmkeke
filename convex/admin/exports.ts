// CSV exports (the portal builds the file in the browser). Each returns at
// most 5,000 rows, newest first, between `from` and `to` (timestamps).
import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import { requireStaff } from "../lib/auth";

const MAX = 5000;
const range = { from: v.number(), to: v.number() };

function checkRange(from: number, to: number) {
  if (!(from < to)) throw new ConvexError({ code: "INVALID_RANGE" });
  if (to - from > 366 * 24 * 3_600_000) throw new ConvexError({ code: "RANGE_TOO_LONG", message: "Export a year at most at a time." });
}

export const orders = query({
  args: range,
  handler: async (ctx, args) => {
    await requireStaff(ctx, "orders.view");
    checkRange(args.from, args.to);
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.from).lt("_creationTime", args.to))
      .order("desc")
      .take(MAX);
    const farms = new Map<string, string>();
    const out = [];
    for (const o of rows) {
      if (!farms.has(o.farmId)) farms.set(o.farmId, (await ctx.db.get("farms", o.farmId))?.name ?? "");
      out.push({
        number: o.number,
        placedAt: o._creationTime,
        status: o.status,
        money: o.escrow,
        fulfilment: o.fulfilment,
        farm: farms.get(o.farmId) ?? "",
        shopper: o.contact.name,
        shopperPhone: o.contact.phone,
        itemsKobo: o.itemsTotalKobo,
        deliveryKobo: o.deliveryFeeKobo,
        totalKobo: o.totalKobo,
        paidAt: o.paidAt ?? null,
        deliveredAt: o.deliveredAt ?? null,
      });
    }
    return { rows: out, capped: rows.length === MAX };
  },
});

export const payouts = query({
  args: range,
  handler: async (ctx, args) => {
    await requireStaff(ctx, "money.view");
    checkRange(args.from, args.to);
    const rows = await ctx.db
      .query("payouts")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.from).lt("_creationTime", args.to))
      .order("desc")
      .take(MAX);
    const out = [];
    for (const p of rows) {
      out.push({
        createdAt: p._creationTime,
        farm: (await ctx.db.get("farms", p.farmId))?.name ?? "",
        amountKobo: p.amountKobo,
        status: p.status,
        reference: p.reference,
        bank: p.bankName,
        accountLast4: p.accountLast4,
        sentAt: p.sentAt ?? null,
        test: p.provider === "simulated",
      });
    }
    return { rows: out, capped: rows.length === MAX };
  },
});

export const customers = query({
  args: range,
  handler: async (ctx, args) => {
    await requireStaff(ctx, "customers.view");
    checkRange(args.from, args.to);
    const rows = await ctx.db
      .query("users")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.from).lt("_creationTime", args.to))
      .order("desc")
      .take(MAX);
    return {
      rows: rows
        .filter((u) => !u.isAnonymous)
        .map((u) => ({
          joinedAt: u._creationTime,
          name: u.name ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
          blocked: u.blockedAt !== undefined,
        })),
      capped: rows.length === MAX,
    };
  },
});
