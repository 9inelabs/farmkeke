import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useCallback } from "react";
import { claimPendingGuestOrders } from "@/store/claim";
import { showToast } from "@/store/toast";

/**
 * After signing in or creating an account: if this phone has a guest claim
 * waiting (M-49 "Sign in instead"), move the guest's orders into the account.
 */
export function useGuestClaim() {
  const claim = useMutation(api.orders.consumer.claimGuestOrders);
  return useCallback(async () => {
    try {
      const moved = await claimPendingGuestOrders(claim);
      if (moved) showToast({ message: `${moved === 1 ? "Your order is" : `${moved} orders are`} now in your account`, action: { label: "View", href: "/orders" } });
    } catch {
      // The claim expired or was used; the account is signed in either way.
    }
  }, [claim]);
}
