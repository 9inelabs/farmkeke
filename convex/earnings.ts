// Farmer earnings (F-60, F-61): what's held, released and paid out, from the
// escrow ledger and payouts. Amounts are the farm's share (after commission).
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getViewer } from "./lib/auth";
import type { OrderStatus } from "./lib/orders";
import { commissionOn, getRules } from "./lib/settings";

// Statuses whose money can still be held
const HOLDING: OrderStatus[] = [
  "paid",
  "accepted",
  "preparing",
  "ready_for_rider",
  "out_for_delivery",
  "with_rider",
  "at_pickup_point",
  "delivered",
  "collected",
  "disputed",
  "completed",
];

// Refunds come out of Farmkeke's held money, not the farm's, so they aren't listed.
const FARM_KINDS: Doc<"ledgerEntries">["kind"][] = ["release", "commission", "payout"];

async function viewerFarm(ctx: QueryCtx) {
  const user = await getViewer(ctx);
  if (user === null || user.isAnonymous) return null;
  return await ctx.db
    .query("farms")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();
}

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return null;
    const rules = await getRules(ctx);

    // Held: paid orders not yet released, at the farm's share after commission
    let heldKobo = 0;
    let heldOrders = 0;
    for (const status of HOLDING) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_farmId_and_status", (q) => q.eq("farmId", farm._id).eq("status", status))
        .take(200);
      for (const o of orders) {
        if (o.escrow !== "held") continue;
        heldKobo += o.itemsTotalKobo - commissionOn(o.itemsTotalKobo, rules.commissionBps);
        heldOrders++;
      }
    }

    let releasedKobo = 0;
    let commissionKobo = 0;
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
      .order("desc")
      .take(2000);
    for (const e of entries) {
      if (e.kind === "release" && e.status === "done") releasedKobo += e.amountKobo;
      if (e.kind === "commission" && e.status === "done") commissionKobo += e.amountKobo;
    }

    let paidOutKobo = 0;
    let pendingPayoutKobo = 0;
    let failedPayoutKobo = 0;
    let lastPayout: { amountKobo: number; sentAt: number | null; status: Doc<"payouts">["status"] } | null = null;
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
      .order("desc")
      .take(1000);
    for (const p of payouts) {
      if (p.status === "sent") paidOutKobo += p.amountKobo;
      else if (p.status === "pending") pendingPayoutKobo += p.amountKobo;
      else failedPayoutKobo += p.amountKobo;
      if (lastPayout === null && p.status === "sent") {
        lastPayout = { amountKobo: p.amountKobo, sentAt: p.sentAt ?? null, status: p.status };
      }
    }

    return {
      heldKobo,
      heldOrders,
      releasedKobo,
      paidOutKobo,
      pendingPayoutKobo,
      failedPayoutKobo,
      commissionKobo,
      commissionBps: rules.commissionBps,
      lastPayout,
      payoutAccount: { bankName: farm.bankName, accountLast4: farm.accountNumber.slice(-4), accountName: farm.accountName },
    };
  },
});

/** F-61: money movements on the farm's orders, newest first. */
export const transactions = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const farm = await viewerFarm(ctx);
    if (farm === null) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const numbers = new Map<string, string>();
    const page = [];
    for (const e of result.page) {
      if (!FARM_KINDS.includes(e.kind)) continue;
      if (!numbers.has(e.orderId)) numbers.set(e.orderId, (await ctx.db.get("orders", e.orderId))?.number ?? "");
      page.push({
        _id: e._id,
        at: e._creationTime,
        kind: e.kind,
        amountKobo: e.amountKobo,
        // release: the farm's share (already net of commission); commission: shown
        // for information; payout: sent to the bank
        direction: e.kind === "release" ? ("in" as const) : e.kind === "payout" ? ("paid_out" as const) : ("fee" as const),
        status: e.status,
        orderId: e.orderId,
        orderNumber: numbers.get(e.orderId) ?? "",
        note: e.note ?? null,
        simulated: e.simulated === true,
      });
    }
    return { ...result, page };
  },
});
