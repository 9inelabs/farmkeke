// Paystack split payments (17 Nov 2026). Farmkeke never holds shoppers'
// money: every payment is split by Paystack the moment it's made. Each farm
// in the checkout gets its products' total minus Farmkeke's commission (minus
// anything it owes for refunds Farmkeke paid, or plus a credit); Farmkeke
// keeps the commission and the delivery fee. Paystack's fee is shared in
// proportion to each side's part ("all-proportional").
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { ENDED } from "./orders";
import { commissionOn, getRules } from "./settings";

export type SplitPart = {
  orderId: Id<"orders">;
  farmId: Id<"farms">;
  /** The farm's Paystack subaccount (none in test mode, or not set up yet) */
  subaccount?: string;
  /** What Paystack sends the farm, before Paystack's fee share */
  shareKobo: number;
  commissionKobo: number;
  /** Debt taken from this share (negative: a credit added to it) */
  recoveredKobo: number;
};

/** The checkout's orders a payment now pays for: accepted and billed, not ended, not paid. */
export const paysFor = (o: Doc<"orders">) => !ENDED.includes(o.status) && o.escrow === "none" && o.status !== "placed";

export async function ordersPaidBy(ctx: QueryCtx, checkoutId: Id<"checkouts">) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkoutId))
    .take(50);
  return orders.filter(paysFor);
}

/** Each farm's part of a payment for the checkout, as it stands now. */
export async function planSplit(ctx: QueryCtx, checkoutId: Id<"checkouts">): Promise<SplitPart[]> {
  const rules = await getRules(ctx);
  const parts: SplitPart[] = [];
  for (const order of await ordersPaidBy(ctx, checkoutId)) {
    const farm = await ctx.db.get("farms", order.farmId);
    const commissionKobo = commissionOn(order.itemsTotalKobo, rules.commissionBps);
    const base = order.itemsTotalKobo - commissionKobo;
    const owed = farm?.owedKobo ?? 0;
    // Never below nothing, nor more than the order brings in
    const shareKobo = Math.max(0, Math.min(base - owed, order.totalKobo));
    parts.push({
      orderId: order._id,
      farmId: order.farmId,
      subaccount: farm?.paystackSubaccountCode,
      shareKobo,
      commissionKobo,
      recoveredKobo: base - shareKobo,
    });
  }
  return parts;
}

/** Paystack's split, for /split: a flat amount per subaccount, the rest to Farmkeke. */
export function paystackSplit(parts: SplitPart[], name: string) {
  const subaccounts = parts.filter((p) => p.subaccount !== undefined && p.shareKobo > 0).map((p) => ({ subaccount: p.subaccount!, share: p.shareKobo }));
  if (subaccounts.length === 0) return null;
  return { name, type: "flat", currency: "NGN", subaccounts, bearer_type: "all-proportional" };
}
