// The farmer's phone sign-in from the app (convex/lib/phoneAuth.ts): send a
// code, check it (signs in), set the PIN, and log in with phone and PIN.
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
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

export function usePhoneAuth() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const authed = useRef(isAuthenticated);
  useEffect(() => {
    authed.current = isAuthenticated;
  }, [isAuthenticated]);

  // Setting the PIN needs the new session's token in place
  const waitForSession = useCallback(async () => {
    const started = Date.now();
    while (!authed.current) {
      if (Date.now() - started > 10_000) throw new Error("Couldn't sign in. Check your connection.");
      await new Promise((r) => setTimeout(r, 50));
    }
  }, []);

  return {
    send: useCallback((phone: string) => signIn("phone-code", { flow: "send", phone }), [signIn]),
    verify: useCallback(
      async (phone: string, code: string) => {
        await signIn("phone-code", { flow: "verify", phone, code });
        setAccountSignedIn(true);
        await waitForSession();
      },
      [signIn, setAccountSignedIn, waitForSession],
    ),
    setPin: useCallback((pin: string) => signIn("phone-code", { flow: "setPin", pin }), [signIn]),
    login: useCallback(
      async (phone: string, pin: string) => {
        await signIn("phone-code", { flow: "pin", phone, pin });
        setAccountSignedIn(true);
        await waitForSession();
      },
      [signIn, setAccountSignedIn, waitForSession],
    ),
  };
}
