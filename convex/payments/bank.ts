// Bank account checks (F-07, F-62) with Paystack's resolve endpoint.
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";
import { writeAudit } from "../lib/audit";
import { requireAccount, requireFarmer } from "../lib/auth";
import { bankName } from "../lib/banks";
import { notify } from "../lib/notify";
import { paymentsLive, paystack } from "../lib/paystack";
import { hitLimit } from "../lib/rateLimit";

const LOOKUP_LIMIT = { max: 10, windowMs: 10 * 60_000 };

/** Signed-in accounts only, and a few lookups per 10 minutes. */
export const lookupGate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAccount(ctx);
    await hitLimit(ctx, `bank:${user._id}`, LOOKUP_LIMIT.max, LOOKUP_LIMIT.windowMs);
    return { live: paymentsLive() };
  },
});

type Resolved = {
  accountNumber: string;
  bankCode: string;
  bankName: string | null;
  accountName: string | null;
  verified: boolean;
  simulated: boolean;
};

function checkInput(accountNumber: string, bankCode: string) {
  const number = accountNumber.replace(/\s/g, "");
  if (!/^\d{10}$/.test(number)) throw new ConvexError({ code: "INVALID_ACCOUNT_NUMBER" });
  if (!/^\d{3,6}$/.test(bankCode)) throw new ConvexError({ code: "INVALID_BANK" });
  return number;
}

async function resolve(accountNumber: string, bankCode: string, live: boolean): Promise<Resolved> {
  const base = { accountNumber, bankCode, bankName: bankName(bankCode) };
  // Test mode: no lookup; the name typed by the farmer is kept as is.
  if (!live) return { ...base, accountName: null, verified: false, simulated: true };
  const result = await paystack<{ account_number: string; account_name: string }>(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
  );
  if (!result.ok) throw new ConvexError({ code: "ACCOUNT_NOT_FOUND", message: "We couldn't find that account. Check the number and bank." });
  return { ...base, accountName: result.data.account_name, verified: true, simulated: false };
}

/** F-07 / F-62: the account holder's name for a bank and account number. */
export const resolveAccount = action({
  args: { accountNumber: v.string(), bankCode: v.string() },
  handler: async (ctx, args): Promise<Resolved> => {
    const number = checkInput(args.accountNumber, args.bankCode);
    const gate: { live: boolean } = await ctx.runMutation(internal.payments.bank.lookupGate, {});
    return await resolve(number, args.bankCode, gate.live);
  },
});

/** Saves the checked account on the caller's farm. */
export const applyPayoutAccount = internalMutation({
  args: { accountName: v.string(), accountNumber: v.string(), bankCode: v.string() },
  handler: async (ctx, args) => {
    const { user, farm } = await requireFarmer(ctx);
    const name = bankName(args.bankCode);
    if (name === null) throw new ConvexError({ code: "INVALID_BANK" });
    const accountName = args.accountName.trim().slice(0, 100);
    if (accountName.length === 0) throw new ConvexError({ code: "ACCOUNT_NAME_REQUIRED" });
    await ctx.db.patch("farms", farm._id, {
      bankCode: args.bankCode,
      bankName: name,
      accountNumber: args.accountNumber,
      accountName,
    });
    // The old Paystack recipient no longer matches.
    const recipients = await ctx.db
      .query("payoutRecipients")
      .withIndex("by_farmId", (q) => q.eq("farmId", farm._id))
      .take(10);
    for (const r of recipients) await ctx.db.delete("payoutRecipients", r._id);
    await writeAudit(ctx, {
      actorId: user._id,
      action: "farm.payoutAccount",
      targetTable: "farms",
      targetId: farm._id,
      reason: "Changed by the farmer (F-62)",
      details: { bankCode: args.bankCode, accountLast4: args.accountNumber.slice(-4) },
    });
    await notify(ctx, {
      userId: user._id,
      side: "farm",
      kind: "payout_account_changed",
      title: "Payout account changed",
      body: `Payouts now go to ${name} ••${args.accountNumber.slice(-4)}. If this wasn't you, contact Farmkeke support now.`,
      href: "/farm/payout-account",
      smsTo: farm.phone,
    });
    return { bankName: name, accountName, accountLast4: args.accountNumber.slice(-4) };
  },
});

/** F-62: change where released money goes; the name is checked with the bank. */
export const savePayoutAccount = action({
  args: { accountNumber: v.string(), bankCode: v.string(), accountName: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ bankName: string; accountName: string; accountLast4: string; verified: boolean }> => {
    const number = checkInput(args.accountNumber, args.bankCode);
    const gate: { live: boolean } = await ctx.runMutation(internal.payments.bank.lookupGate, {});
    const resolved = await resolve(number, args.bankCode, gate.live);
    const accountName = resolved.accountName ?? args.accountName ?? "";
    const saved: { bankName: string; accountName: string; accountLast4: string } = await ctx.runMutation(
      internal.payments.bank.applyPayoutAccount,
      { accountName, accountNumber: number, bankCode: args.bankCode },
    );
    return { ...saved, verified: resolved.verified };
  },
});
