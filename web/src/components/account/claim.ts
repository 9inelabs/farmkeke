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

// What the guest had, kept for W-42 "We found 2 earlier orders" (the orders
// can't be read again once the new account is signed in, until claimed).
export type ClaimSnapshot = {
  orders: Array<{ id: string; number: string; farmId: string; farmName: string; totalKobo: number; status: string; fulfilment: "delivery" | "pickup" }>;
  email: string | null;
  phone: string | null;
};
const SNAPSHOT_KEY = "fk.guestClaim.orders";

export function saveClaimSnapshot(s: ClaimSnapshot) {
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: W-42 shows a shorter message.
  }
}

export function claimSnapshot(): ClaimSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as ClaimSnapshot) : null;
  } catch {
    return null;
  }
}

export function forgetClaimSnapshot() {
  try {
    window.sessionStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // Nothing stored.
  }
}
