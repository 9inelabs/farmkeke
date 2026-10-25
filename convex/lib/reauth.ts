// Asking a signed-in person to prove it's still them before a sensitive
// change (the farm's payout account): their PIN if they log in by phone, or
// their password. Wrong PINs here count towards the same lock as logging in,
// so this can't be used to guess a PIN either.
import { retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { PASSWORD_PROVIDER } from "../accountsInternal";
import { PHONE_PROVIDER } from "../phoneAuth";

export async function confirmItsYou(ctx: ActionCtx, secret: string | undefined): Promise<void> {
  const who: { phone: string | null; email: string | null; locked: boolean; accountId: Id<"authAccounts"> | null } | null = await ctx.runQuery(
    internal.phoneAuth.credentialsOf,
    {},
  );
  if (who === null) throw new ConvexError({ code: "NOT_SIGNED_IN" });
  const value = String(secret ?? "");
  if (value.length === 0) throw new ConvexError({ code: "CONFIRM_REQUIRED", pin: who.phone !== null });

  if (who.phone !== null && /^\d{4}$/.test(value)) {
    if (who.locked) throw new ConvexError({ code: "PIN_LOCKED" });
    try {
      await retrieveAccount(ctx, { provider: PHONE_PROVIDER, account: { id: who.phone, secret: value } });
    } catch (error) {
      if (error instanceof Error && error.message === "TooManyFailedAttempts") throw new ConvexError({ code: "TOO_MANY_ATTEMPTS" });
      const counted: { locked: boolean; attemptsLeft: number } = await ctx.runMutation(internal.phoneAuth.pinFailed, {
        accountId: who.accountId!,
      });
      throw new ConvexError(counted.locked ? { code: "PIN_LOCKED" } : { code: "WRONG_PIN", attemptsLeft: counted.attemptsLeft });
    }
    return;
  }
  if (who.email !== null) {
    try {
      await retrieveAccount(ctx, { provider: PASSWORD_PROVIDER, account: { id: who.email, secret: value } });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      throw new ConvexError({ code: reason === "TooManyFailedAttempts" ? "TOO_MANY_ATTEMPTS" : "WRONG_PASSWORD" });
    }
    return;
  }
  throw new ConvexError({ code: who.phone !== null ? "WRONG_PIN" : "WRONG_PASSWORD" });
}
