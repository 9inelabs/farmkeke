// Farmers sign up with their phone and a texted code, then log in with their
// phone and a 4-digit PIN (24 Oct 2026). Through Convex Auth's
// signIn("phone-code", …):
//   { flow: "send", phone }          texts a 6-digit code (signs nobody in)
//   { flow: "verify", phone, code }  signs in (see phoneAuth.useCode for whom)
//   { flow: "setPin", pin }          sets the PIN, within 30 minutes of a code
//   { flow: "pin", phone, pin }      logs in; 5 wrong tries pause it for a while
// Texts go through Termii (lib/sms.ts). Without a Termii key, codes are only
// written to the Convex logs when AUTH_DEV_LOG_EMAILS is "true"; otherwise
// sending fails with SMS_UNAVAILABLE.
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { getAuthUserId, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";
import { internal } from "../_generated/api";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { env } from "../_generated/server";
import { PHONE_PROVIDER } from "../phoneAuth";
import { normalizeNigerianPhone } from "./phone";
import { sendSms, smsConfigured } from "./sms";

const PIN_WINDOW_MS = 30 * 60_000;

async function hash(code: string, phone: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${phone}:${code}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sixDigits() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0]! % 1_000_000).padStart(6, "0");
}

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
      case "send": {
        const phone = phoneOf(params.phone);
        const devLog = env.AUTH_DEV_LOG_EMAILS === "true";
        if (!smsConfigured() && !devLog) throw new ConvexError({ code: "SMS_UNAVAILABLE" });
        const code = sixDigits();
        await ctx.runMutation(internal.phoneAuth.issueCode, { phone, codeHash: await hash(code, phone) });
        if (smsConfigured()) {
          const sent = await sendSms(phone, `Your Farmkeke code is ${code}. It expires in 10 minutes. Don't share it with anyone.`);
          if (sent.status === "failed") {
            console.error("Sign-up code not sent", sent.error);
            throw new ConvexError({ code: "SMS_FAILED" });
          }
        } else {
          console.log(`[dev] Farmkeke code for ${phone}: ${code}`);
        }
        return null;
      }

      case "verify": {
        const phone = phoneOf(params.phone);
        const code = String(params.code ?? "").replace(/\D/g, "");
        if (code.length !== 6) throw new ConvexError({ code: "INVALID_CODE" });
        const found: { userId: Id<"users"> } | { error: "INVALID_CODE"; attemptsLeft: number } = await ctx.runMutation(internal.phoneAuth.useCode, {
          phone,
          codeHash: await hash(code, phone),
          currentUserId: await getAuthUserId(ctx),
        });
        if ("error" in found) throw new ConvexError({ code: found.error, attemptsLeft: found.attemptsLeft });
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
        return { userId };
      }

      case "pin": {
        const phone = phoneOf(params.phone);
        const pin = String(params.pin ?? "");
        const found: { accountId: Id<"authAccounts">; blocked: boolean } | null = await ctx.runQuery(internal.phoneAuth.accountFor, { phone });
        if (found === null) throw new ConvexError({ code: "INVALID_CREDENTIALS" });
        if (found.blocked) throw new ConvexError({ code: "BLOCKED" });
        try {
          const { user }: { user: Doc<"users"> } = await retrieveAccount(ctx, { provider: PHONE_PROVIDER, account: { id: phone, secret: pin } });
          return { userId: user._id };
        } catch (error) {
          if (error instanceof ConvexError) throw error;
          const reason = error instanceof Error ? error.message : "";
          if (reason === "TooManyFailedAttempts") throw new ConvexError({ code: "TOO_MANY_ATTEMPTS" });
          const attemptsLeft: number = await ctx.runQuery(internal.accountsInternal.signInAttemptsLeft, { accountId: found.accountId, now: Date.now() });
          throw new ConvexError(attemptsLeft < 1 ? { code: "TOO_MANY_ATTEMPTS" } : { code: "INVALID_CREDENTIALS", attemptsLeft });
        }
      }

      default:
        throw new ConvexError({ code: "BAD_FLOW" });
    }
  },
});
