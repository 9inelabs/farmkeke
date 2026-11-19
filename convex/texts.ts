// Delivery reports for texts and code calls sent through Termii. Termii
// accepting a text ("Sent") doesn't mean the phone got it; its delivery
// report says whether the network delivered it. The webhook (http.ts,
// POST /termii/delivery) hands each report to recordDelivery, which updates
// the matching smsLog row for the Admin Portal (Text messages).
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { normalizeNigerianPhone } from "./lib/phone";
import { deliveryOf } from "./lib/sms";

// Reports without a matching message ID fall back to the newest text to the
// same number sent within this long
const MATCH_BY_NUMBER_MS = 2 * 24 * 3_600_000;

export const recordDelivery = internalMutation({
  args: { reference: v.optional(v.string()), to: v.optional(v.string()), status: v.string() },
  handler: async (ctx, args): Promise<{ matched: boolean }> => {
    let row: Doc<"smsLog"> | null = null;
    if (args.reference) {
      row = await ctx.db
        .query("smsLog")
        .withIndex("by_providerReference", (q) => q.eq("providerReference", args.reference))
        .first();
    }
    const phone = args.to ? normalizeNigerianPhone(args.to) : null;
    if (row === null && phone !== null) {
      const recent = await ctx.db
        .query("smsLog")
        .withIndex("by_to", (q) => q.eq("to", phone))
        .order("desc")
        .take(5);
      row = recent.find((r) => r.status === "sent" && r._creationTime > Date.now() - MATCH_BY_NUMBER_MS) ?? null;
    }
    if (row === null) return { matched: false };

    const delivery = deliveryOf(args.status);
    // A late "sent" report never undoes "delivered"
    if (row.delivery === "delivered" && delivery === "pending") return { matched: true };
    await ctx.db.patch("smsLog", row._id, {
      delivery,
      deliveryStatus: args.status.slice(0, 120),
      deliveryAt: Date.now(),
    });
    return { matched: true };
  },
});
