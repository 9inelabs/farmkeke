// M-49: a guest saving their details. The guest's one-time claim token is kept
// on the phone between "Create account" (or "Sign in instead", when the email
// already has an account) and moving the guest's orders into the account.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type Claim = { token: string | null; save: (token: string) => void; forget: () => void };

export const useClaim = create<Claim>()(
  persist(
    (set) => ({
      token: null,
      save: (token) => set({ token }),
      forget: () => set({ token: null }),
    }),
    { name: "farmkeke-claim", storage: createJSONStorage(() => AsyncStorage), partialize: ({ token }) => ({ token }) },
  ),
);

/**
 * Once signed in to an account: moves the guest's orders over if a claim is
 * waiting. Returns how many moved, or null when there was nothing to claim.
 */
export async function claimPendingGuestOrders(claim: (args: { token: string }) => Promise<{ claimed: number } | unknown>): Promise<number | null> {
  const token = useClaim.getState().token;
  if (!token) return null;
  try {
    const result = (await claim({ token })) as { claimed?: number } | undefined;
    return result?.claimed ?? 0;
  } finally {
    useClaim.getState().forget();
  }
}
