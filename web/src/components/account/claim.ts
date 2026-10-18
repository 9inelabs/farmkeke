"use client";

// Moving a guest's orders into an account (PRD "save your details"):
// 1. W-30 calls orders.consumer.startGuestClaim while still the guest and keeps
//    the token here, in this tab's sessionStorage.
// 2. Once signed up or signed in, claimPendingGuestOrders() hands the token to
//    orders.consumer.claimGuestOrders and forgets it.
import { errorCode } from "@/lib/auth";

export const GUEST_CLAIM_KEY = "fk.guestClaim";

export function saveClaimToken(token: string) {
  try {
    window.sessionStorage.setItem(GUEST_CLAIM_KEY, token);
  } catch {
    // Storage blocked: the orders stay findable with Find my order.
  }
}

export function pendingClaimToken(): string | null {
  try {
    return window.sessionStorage.getItem(GUEST_CLAIM_KEY);
  } catch {
    return null;
  }
}

export function forgetClaimToken() {
  try {
    window.sessionStorage.removeItem(GUEST_CLAIM_KEY);
  } catch {
    // Nothing to forget.
  }
}

/**
 * Claims the guest orders saved in this tab, if any. Returns how many moved,
 * or null when there was nothing to claim or the link had expired.
 * Retries briefly while the new session token reaches the server.
 */
export async function claimPendingGuestOrders(
  claim: (args: { token: string }) => Promise<unknown>,
): Promise<number | null> {
  const token = pendingClaimToken();
  if (!token) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = (await claim({ token })) as { claimed?: number } | null;
      forgetClaimToken();
      return result?.claimed ?? 0;
    } catch (e) {
      const code = errorCode(e);
      if (code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED") {
        forgetClaimToken();
        return null;
      }
      // ACCOUNT_REQUIRED / NOT_AUTHENTICATED right after sign-in: wait and retry.
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return null;
}
