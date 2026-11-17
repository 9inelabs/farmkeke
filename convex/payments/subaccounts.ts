// Paystack subaccounts (17 Nov 2026). Each approved farm is a Paystack
// subaccount on its own bank account, so Paystack can split every payment:
// the farm's share goes straight to the farm, Farmkeke keeps its commission
// and the delivery fee (lib/split.ts). Made when a farm is approved, updated
// when its bank account changes, and retried hourly for any farm still
// without one. Without a Paystack key nothing is sent.
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { notifyStaff } from "../lib/notify";
import { paymentsLive, paystack } from "../lib/paystack";
import { getRules } from "../lib/settings";

export const farmForSync = internalQuery({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) return null;
    const rules = await getRules(ctx);
    return {
      name: farm.name,
      bankCode: farm.bankCode,
      accountNumber: farm.accountNumber,
      phone: farm.phone,
      code: farm.paystackSubaccountCode ?? null,
      // The subaccount's default; every payment overrides it with its own split
      percentage: rules.commissionBps / 100,
    };
  },
});

export const saveResult = internalMutation({
  args: { farmId: v.id("farms"), code: v.optional(v.string()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const farm = await ctx.db.get("farms", args.farmId);
    if (farm === null) return null;
    if (args.error === undefined) {
      await ctx.db.patch("farms", farm._id, {
        paystackSubaccountCode: args.code ?? farm.paystackSubaccountCode,
        subaccountSyncedAt: Date.now(),
        subaccountError: undefined,
      });
      return null;
    }
    // Tell staff once per new problem, not on every hourly retry
    if (farm.subaccountError !== args.error) {
      await notifyStaff(
        ctx,
        {
          kind: "subaccount_failed",
          title: `${farm.name} can't be paid yet`,
          body: `Paystack didn't accept the farm's bank account: ${args.error}. Shoppers can't pay this farm's orders until it's fixed.`,
          href: `/admin/farmers/${farm._id}`,
        },
        "farmers.manage",
      );
    }
    await ctx.db.patch("farms", farm._id, { subaccountError: args.error });
    return null;
  },
});

/** Creates the farm's subaccount, or updates it to the farm's current bank account. */
export const sync = internalAction({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    if (!paymentsLive()) return null;
    const farm: {
      name: string;
      bankCode: string;
      accountNumber: string;
      phone: string;
      code: string | null;
      percentage: number;
    } | null = await ctx.runQuery(internal.payments.subaccounts.farmForSync, args);
    if (farm === null) return null;
    const body = {
      business_name: farm.name,
      settlement_bank: farm.bankCode,
      account_number: farm.accountNumber,
      percentage_charge: farm.percentage,
      description: "Farm selling on Farmkeke",
      primary_contact_phone: farm.phone,
    };
    const result = farm.code
      ? await paystack<{ subaccount_code?: string }>(`/subaccount/${encodeURIComponent(farm.code)}`, { method: "PUT", body })
      : await paystack<{ subaccount_code?: string }>("/subaccount", { body });
    await ctx.runMutation(
      internal.payments.subaccounts.saveResult,
      result.ok ? { farmId: args.farmId, code: result.data.subaccount_code ?? farm.code ?? undefined } : { farmId: args.farmId, error: result.message },
    );
    return null;
  },
});

/** Cron: farms still without a working subaccount get another try. */
export const syncMissing = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (!paymentsLive()) return { scheduled: 0 };
    const farms = await ctx.db
      .query("farms")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(500);
    const todo = farms.filter((f) => f.paystackSubaccountCode === undefined || f.subaccountError !== undefined).slice(0, 20);
    for (const f of todo) await ctx.scheduler.runAfter(0, internal.payments.subaccounts.sync, { farmId: f._id });
    return { scheduled: todo.length };
  },
});
