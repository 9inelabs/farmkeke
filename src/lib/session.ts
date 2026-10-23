import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { usePrefs } from "@/store/prefs";

/**
 * Signing out on purpose. Clears the "account signed in" flag first so the
 * session-expired sheet (M-S6) isn't shown for a sign-out the person chose.
 */
export function useSignOut() {
  const { signOut } = useAuthActions();
  const setAccountSignedIn = usePrefs((s) => s.setAccountSignedIn);
  const setMode = usePrefs((s) => s.setMode);
  return useCallback(async () => {
    setAccountSignedIn(false);
    setMode("shop");
    try {
      await signOut();
    } catch {
      // The session may already be gone on the server (deleted account).
    }
  }, [setAccountSignedIn, setMode, signOut]);
}

/** Rules shown as you type on M-51 and M-55 (same as the server's). */
export function passwordRules(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One number", met: /\d/.test(password) },
    { label: "One letter", met: /[a-zA-Z]/.test(password) },
  ];
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Before a guest's first order: a guest identity on this phone (anonymous
 * sign-in), which is what lets only this phone confirm delivery later. Does
 * nothing when someone (guest or account) is already signed in.
 */
export function useEnsureIdentity() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const authed = useRef(isAuthenticated);
  useEffect(() => {
    authed.current = isAuthenticated;
  }, [isAuthenticated]);
  return useCallback(async () => {
    if (authed.current) return;
    await signIn("anonymous");
    const started = Date.now();
    while (!authed.current) {
      if (Date.now() - started > 10_000) throw new Error("Couldn't start a guest session. Check your connection.");
      await new Promise((r) => setTimeout(r, 50));
    }
  }, [signIn]);
}
