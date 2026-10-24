// The farmer's phone sign-in from the app (convex/lib/phoneAuth.ts): send a
// code, check it, then sign in with the code and the new PIN together, and
// log in later with phone and PIN.
import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useConvex } from "convex/react";
import { useCallback } from "react";
import { errorCode, errorData, errorMessage } from "@/lib/errors";
import { usePrefs } from "@/store/prefs";

const MESSAGES: Record<string, string> = {
  INVALID_PHONE: "Enter a Nigerian mobile number, like 0803 123 4567.",
  SMS_UNAVAILABLE: "We can't send texts right now. Please try again later.",
  SMS_FAILED: "The text didn't go through. Check the number and try again.",
  RATE_LIMITED: "Too many codes for this number. Wait an hour and try again.",
  CODE_EXPIRED: "That code has expired. Ask for a new one.",
  TOO_MANY_ATTEMPTS: "Too many wrong tries. Wait a little, then try again.",
  PHONE_TAKEN: "This number belongs to another account. Sign out first, then log in as a farmer.",
  BLOCKED: "This account can't be used. Contact support@farmkeke.com.",
  PIN_FORMAT: "Your PIN is 4 digits.",
  WEAK_PIN: "That PIN is too easy to guess. Avoid 1234 or 0000.",
  VERIFY_AGAIN: "For your safety, confirm your number again with a new code.",
};

/** Plain words for a phone sign-in error. */
export function phoneAuthMessage(error: unknown): string {
  const code = errorCode(error);
  if (code === "INVALID_CODE") {
    const left = errorData<{ attemptsLeft?: number }>(error).attemptsLeft;
    return left !== undefined ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "That code isn't right.";
  }
  if (code === "INVALID_CREDENTIALS") {
    const left = errorData<{ attemptsLeft?: number }>(error).attemptsLeft;
    return `That number and PIN don't match.${left !== undefined ? ` ${left} ${left === 1 ? "try" : "tries"} left.` : ""}`;
  }
  return (code && MESSAGES[code]) || errorMessage(error);
}

/** "08023453382" → "0802 *** 3382", as on the code screen. */
export function maskedPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const local = d.startsWith("234") ? `0${d.slice(3)}` : d;
  return local.length === 11 ? `${local.slice(0, 4)} *** ${local.slice(7)}` : phone;
}

/** The last 10 digits, so 0803…, +234803… and 234803… compare equal. */
const sameNumber = (a: string, b: string) => a.replace(/\D/g, "").slice(-10) === b.replace(/\D/g, "").slice(-10);

export function usePhoneAuth() {
  const { signIn } = useAuthActions();
  const convex = useConvex();
  const sendCode = useAction(api.phoneAuth.sendCode);
  const checkCode = useAction(api.phoneAuth.checkCode);
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);

  // The next screens need the new session in place: wait until the server
  // sees this phone's account (a guest session on the phone counts as
  // signed in already, so the auth state alone can't tell)
  const waitForSession = useCallback(
    async (phone: string) => {
      const started = Date.now();
      for (;;) {
        const mine = await convex.query(api.phoneAuth.mine, {}).catch(() => null);
        if (mine?.phone && sameNumber(mine.phone, phone) && mine.hasPin) return;
        if (Date.now() - started > 15_000) throw new Error("Couldn't sign in. Check your connection.");
        await new Promise((r) => setTimeout(r, 250));
      }
    },
    [convex],
  );

  const signInWith = useCallback(
    async (phone: string, params: Record<string, string>) => {
      await signIn("phone-code", { phone, ...params });
      setAccountSignedIn(true);
      await waitForSession(phone);
    },
    [signIn, setAccountSignedIn, waitForSession],
  );

  return {
    send: useCallback((phone: string) => sendCode({ phone }), [sendCode]),
    /** Is this the code? Doesn't sign in; the PIN step does. */
    check: useCallback((phone: string, code: string) => checkCode({ phone, code }), [checkCode]),
    /** Signs in with the checked code and sets the PIN. */
    verify: useCallback((phone: string, code: string, pin: string) => signInWith(phone, { flow: "verify", code, pin }), [signInWith]),
    login: useCallback((phone: string, pin: string) => signInWith(phone, { flow: "pin", pin }), [signInWith]),
  };
}
