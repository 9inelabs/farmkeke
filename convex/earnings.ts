// Farmer earnings (F-60, F-61). Since the Paystack split (17 Nov 2026) the
// farm is paid the moment the shopper pays: Paystack sends the farm's share
// (products minus Farmkeke's fee, minus anything owed for refunds) straight to
// its bank. Nothing is held and there are no payouts. Refunds Farmkeke paid on
// the farm's behalf are owed back and taken from its next orders.
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getViewer } from "./lib/auth";
import { paymentsLive } from "./lib/paystack";
import { getRules } from "./lib/settings";

// What the farm sees: its shares, Farmkeke's fee, and its refund debts
const FARM_KINDS: Doc<"ledgerEntries">["kind"][] = ["farm_share", "commission", "farm_debt", "debt_recovered"];

const DIRECTION = {
  farm_share: "in",
  commission: "fee",
  farm_debt: "owed",
  debt_recovered: "recovered",
} as const;

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

    let earnedKobo = 0;
    let commissionKobo = 0;
    let recoveredKobo = 0;
    let paidOrders = 0;
    let lastPaid: { amountKobo: number; at: number } | null = null;
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
      .order("desc")
      .take(2000);
    for (const e of entries) {
      if (e.status !== "done") continue;
      if (e.kind === "farm_share") {
        earnedKobo += e.amountKobo;
        paidOrders++;
        if (lastPaid === null) lastPaid = { amountKobo: e.amountKobo, at: e._creationTime };
      }
      if (e.kind === "commission") commissionKobo += e.amountKobo;
      if (e.kind === "debt_recovered") recoveredKobo += e.amountKobo;
    }

    const owed = farm.owedKobo ?? 0;
    return {
      /** Everything Paystack has sent the farm */
      earnedKobo,
      paidOrders,
      lastPaid,
      commissionKobo,
      commissionBps: rules.commissionBps,
      /** Refunds Farmkeke paid that the farm still owes, taken from its next orders */
      owedKobo: Math.max(owed, 0),
      /** Money Farmkeke owes the farm, added to its next order */
      creditKobo: Math.max(-owed, 0),
      /** Taken from the farm's shares so far to pay refunds back (negative: credits paid) */
      recoveredKobo,
      // Paystack has to know the farm's bank account before shoppers can pay it
      paystack: !paymentsLive()
        ? ("test" as const)
        : farm.subaccountError !== undefined
          ? ("problem" as const)
          : farm.paystackSubaccountCode !== undefined
            ? ("ready" as const)
            : ("setting_up" as const),
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
        // farm_share: sent to the farm by Paystack (net of fee and any debt);
        // commission: shown for information; farm_debt: a refund the farm owes;
        // debt_recovered: taken from a share to pay a debt back
        direction: DIRECTION[e.kind as keyof typeof DIRECTION],
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
