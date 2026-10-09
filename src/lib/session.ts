import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback } from "react";
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
