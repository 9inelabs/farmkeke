"use client";

// "Keep me signed in" (W-40). Sessions are always kept in this browser by
// Convex Auth, so when the box is unticked we remember that here and sign out
// on the first visit after the browser was closed. A session cookie (no
// expiry) marks a browser that is still open, across all its tabs.
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect } from "react";

const SHORT_SESSION = "fk.shortSession";
const ALIVE = "fk_alive";

const setAlive = () => {
  document.cookie = `${ALIVE}=1; path=/; SameSite=Lax`;
};

/** Called after a successful sign-in with the box's value. */
export function rememberSignIn(keep: boolean) {
  try {
    if (keep) window.localStorage.removeItem(SHORT_SESSION);
    else {
      window.localStorage.setItem(SHORT_SESSION, "1");
      setAlive();
    }
  } catch {
    // Storage blocked: the session simply stays.
  }
}

export function forgetShortSession() {
  try {
    window.localStorage.removeItem(SHORT_SESSION);
  } catch {
    // Nothing stored.
  }
}

/** Mounted once in the root layout. */
export function SessionKeeper() {
  const { signOut } = useAuthActions();
  useEffect(() => {
    let short = false;
    try {
      short = window.localStorage.getItem(SHORT_SESSION) === "1";
    } catch {
      return;
    }
    if (!short) return;
    if (document.cookie.split("; ").some((c) => c === `${ALIVE}=1`)) return;
    forgetShortSession();
    void signOut();
  }, [signOut]);
  return null;
}
