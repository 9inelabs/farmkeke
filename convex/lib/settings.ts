// A-84 fees and A-85 escrow timers, with the defaults the PRD and the owner set.
import type { QueryCtx } from "../_generated/server";

/** Owner's decision (17 Oct 2026): 5% of the product total. */
export const DEFAULT_COMMISSION_BPS = 500;

export const DEFAULT_RULES = {
  // The farm must accept within 24 hours or the order expires and is refunded
  farmerResponseHours: 24,
  // A-61: delivered but unconfirmed for a day goes to staff
  unconfirmedAfterHours: 24,
  // PRD: pickup orders wait 3 days at the point
  pickupHoldDays: 3,
  // PRD: the farm replies to a problem report within 12 hours
  disputeReplyHours: 12,
  // PRD: Farmkeke decides within about a day
  disputeDecideHours: 24,
};

export type Rules = typeof DEFAULT_RULES & { commissionBps: number; commissionSet: boolean };

export async function getRules(ctx: QueryCtx): Promise<Rules> {
  const row = await ctx.db
    .query("platformSettings")
    .withIndex("by_key", (q) => q.eq("key", "platform"))
    .unique();
  const commission = row?.commissionBps;
  return {
    farmerResponseHours: row?.farmerResponseHours ?? DEFAULT_RULES.farmerResponseHours,
    unconfirmedAfterHours: row?.unconfirmedAfterHours ?? DEFAULT_RULES.unconfirmedAfterHours,
    pickupHoldDays: row?.pickupHoldDays ?? DEFAULT_RULES.pickupHoldDays,
    disputeReplyHours: row?.disputeReplyHours ?? DEFAULT_RULES.disputeReplyHours,
    disputeDecideHours: DEFAULT_RULES.disputeDecideHours,
    commissionBps: typeof commission === "number" ? commission : DEFAULT_COMMISSION_BPS,
    commissionSet: typeof commission === "number",
  };
}

/** Farmkeke's commission on a product total, rounded to the nearest kobo. */
export const commissionOn = (itemsTotalKobo: number, bps: number) => Math.round((itemsTotalKobo * bps) / 10_000);

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
