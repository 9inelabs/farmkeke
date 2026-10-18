// Saved cards (M-43, M-93): Paystack reusable authorizations, accounts only.
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation, query } from "../_generated/server";
import { getViewer, requireAccount } from "../lib/auth";
import { paymentsLive, paystack } from "../lib/paystack";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (user === null || user.isAnonymous) return [];
    const cards = await ctx.db
      .query("savedCards")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(20);
    return cards.map((c) => ({
      _id: c._id,
      brand: c.brand,
      last4: c.last4,
      expMonth: c.expMonth,
      expYear: c.expYear,
      bank: c.bank ?? null,
    }));
  },
});

/** Deletes the caller's card and returns its authorization for deactivation. */
export const forget = internalMutation({
  args: { cardId: v.id("savedCards") },
  handler: async (ctx, args) => {
    const user = await requireAccount(ctx);
    const card = await ctx.db.get("savedCards", args.cardId);
    if (card === null || card.userId !== user._id) throw new ConvexError({ code: "NOT_FOUND" });
    await ctx.db.delete("savedCards", card._id);
    return card.authorizationCode;
  },
});

export const remove = action({
  args: { cardId: v.id("savedCards") },
  handler: async (ctx, args) => {
    const authorizationCode: string = await ctx.runMutation(internal.payments.cards.forget, { cardId: args.cardId });
    // Also stop Paystack charging it; the card is gone for us either way.
    if (paymentsLive()) {
      await paystack("/customer/deactivate_authorization", { body: { authorization_code: authorizationCode } });
    }
  },
});
