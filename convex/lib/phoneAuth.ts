// Farmers sign up with their phone and a texted code, then log in with their
// phone and a 4-digit PIN (24 Oct 2026), through Convex Auth's
// signIn("phone-code", …):
//   { flow: "verify", phone, code }       signs in (see phoneAuth.useCode for whom)
//   { flow: "verify", phone, code, pin }  the same, and sets the PIN: sign-up
//                                         and Forgot PIN
//   { flow: "setPin", pin }               sets the PIN, within 30 minutes of a code
//   { flow: "pin", phone, pin }           logs in; 5 wrong tries pause it for a while
// Texting the code (phoneAuth.sendCode) and checking it before the PIN step
// (phoneAuth.checkCode) aren't sign-in calls: one that signs nobody in would
// sign out whoever is on the phone.
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { getAuthUserId, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";
import { internal } from "../_generated/api";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { PHONE_PROVIDER } from "../phoneAuth";
import { codeHash as hash } from "./codeHash";
import { normalizeNigerianPhone } from "./phone";

const PIN_WINDOW_MS = 30 * 60_000;


function phoneOf(value: unknown) {
  const phone = normalizeNigerianPhone(String(value ?? ""));
  if (phone === null) throw new ConvexError({ code: "INVALID_PHONE" });
  return phone;
}

/** Four digits, not all the same and not a straight run (1234, 9876). */
export function pinProblem(pin: string): "PIN_FORMAT" | "WEAK_PIN" | null {
  if (!/^\d{4}$/.test(pin)) return "PIN_FORMAT";
  const d = pin.split("").map(Number);
  const same = d.every((x) => x === d[0]);
  const up = d.every((x, i) => i === 0 || x === d[i - 1]! + 1);
  const down = d.every((x, i) => i === 0 || x === d[i - 1]! - 1);
  return same || up || down ? "WEAK_PIN" : null;
}

export const PhoneCode = ConvexCredentials<DataModel>({
  id: PHONE_PROVIDER,
  crypto: {
    hashSecret: async (pin) => await new Scrypt().hash(pin),
    verifySecret: async (pin, hashed) => await new Scrypt().verify(hashed, pin),
  },
  authorize: async (params, ctx): Promise<{ userId: Id<"users"> } | null> => {
    switch (params.flow) {
      case "verify": {
        const phone = phoneOf(params.phone);
        const code = String(params.code ?? "").replace(/\D/g, "");
        if (code.length !== 6) throw new ConvexError({ code: "INVALID_CODE" });
        const pin = params.pin === undefined ? null : String(params.pin);
        const problem = pin === null ? null : pinProblem(pin);
        if (problem) throw new ConvexError({ code: problem });
        const found: { userId: Id<"users"> } | { error: "INVALID_CODE"; attemptsLeft: number } = await ctx.runMutation(internal.phoneAuth.useCode, {
          phone,
          codeHash: await hash(code, phone),
          currentUserId: await getAuthUserId(ctx),
        });
        if ("error" in found) throw new ConvexError({ code: found.error, attemptsLeft: found.attemptsLeft });
        // The code just proved the phone, so the PIN is set in the same step (and unlocks it)
        if (pin !== null) {
          await modifyAccountCredentials(ctx, { provider: PHONE_PROVIDER, account: { id: phone, secret: pin } });
          await ctx.runMutation(internal.phoneAuth.pinCleared, { userId: found.userId });
        }
        return { userId: found.userId };
      }

      case "setPin": {
        const userId = await getAuthUserId(ctx);
        if (userId === null) throw new ConvexError({ code: "NOT_SIGNED_IN" });
        const pin = String(params.pin ?? "");
        const problem = pinProblem(pin);
        if (problem) throw new ConvexError({ code: problem });
        const gate: { phone: string | null; verifiedAt: number | null } | null = await ctx.runQuery(internal.phoneAuth.pinGate, { userId });
        // Only straight after proving the phone (sign-up, or Forgot PIN)
        if (gate === null || gate.phone === null || gate.verifiedAt === null || Date.now() - gate.verifiedAt > PIN_WINDOW_MS) {
          throw new ConvexError({ code: "VERIFY_AGAIN" });
        }
        await modifyAccountCredentials(ctx, { provider: PHONE_PROVIDER, account: { id: gate.phone, secret: pin } });
        await ctx.runMutation(internal.phoneAuth.pinCleared, { userId });
        return { userId };
      }

      case "pin": {
        const phone = phoneOf(params.phone);
        const pin = String(params.pin ?? "");
        const found: { accountId: Id<"authAccounts">; blocked: boolean; locked: boolean } | null = await ctx.runQuery(internal.phoneAuth.accountFor, { phone });
        if (found === null) throw new ConvexError({ code: "INVALID_CREDENTIALS" });
        if (found.blocked) throw new ConvexError({ code: "BLOCKED" });
        // Five wrong PINs in a row: only a new PIN, set with a texted code, opens it again
        if (found.locked) throw new ConvexError({ code: "PIN_LOCKED" });
        let user: Doc<"users">;
        try {
          ({ user } = await retrieveAccount(ctx, { provider: PHONE_PROVIDER, account: { id: phone, secret: pin } }));
        } catch (error) {
          if (error instanceof ConvexError) throw error;
          const reason = error instanceof Error ? error.message : "";
          if (reason === "TooManyFailedAttempts") throw new ConvexError({ code: "TOO_MANY_ATTEMPTS" });
          const counted: { locked: boolean; attemptsLeft: number } = await ctx.runMutation(internal.phoneAuth.pinFailed, { accountId: found.accountId });
          if (counted.locked) throw new ConvexError({ code: "PIN_LOCKED" });
          const hourly: number = await ctx.runQuery(internal.accountsInternal.signInAttemptsLeft, { accountId: found.accountId, now: Date.now() });
          if (hourly < 1) throw new ConvexError({ code: "TOO_MANY_ATTEMPTS" });
          // Tries before the PIN locks
          throw new ConvexError({ code: "INVALID_CREDENTIALS", attemptsLeft: Math.min(hourly, counted.attemptsLeft) });
        }
        await ctx.runMutation(internal.phoneAuth.pinCleared, { userId: user._id });
        return { userId: user._id };
      }

      default:
        throw new ConvexError({ code: "BAD_FLOW" });
    }
  },
});
