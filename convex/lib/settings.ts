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
    disputeDecideHours: row?.disputeDecideHours ?? DEFAULT_RULES.disputeDecideHours,
    commissionBps: typeof commission === "number" ? commission : DEFAULT_COMMISSION_BPS,
    commissionSet: typeof commission === "number",
  };
}

/**
 * W-23 "Full": how many delivery orders one area can take in one time slot.
 * A per-area, per-slot row wins over a per-area row, which wins over the
 * default. null = no limit (the default until staff set one).
 */
export async function slotCapacityReader(ctx: QueryCtx) {
  const row = await ctx.db
    .query("platformSettings")
    .withIndex("by_key", (q) => q.eq("key", "platform"))
    .unique();
  const rows = row?.slotCapacities ?? [];
  const fallback = typeof row?.slotCapacity === "number" ? row.slotCapacity : null;
  return (serviceAreaId: string, from: string): number | null => {
    const exact = rows.find((r) => r.serviceAreaId === serviceAreaId && r.from === from);
    if (exact) return exact.capacity;
    const area = rows.find((r) => r.serviceAreaId === serviceAreaId && r.from === undefined);
    if (area) return area.capacity;
    return fallback;
  };
}

/** Farmkeke's commission on a product total, rounded to the nearest kobo. */
export const commissionOn = (itemsTotalKobo: number, bps: number) => Math.round((itemsTotalKobo * bps) / 10_000);

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
