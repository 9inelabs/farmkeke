"use client";

// Before a guest signs in or creates an account on this browser: if they have
// orders, start a claim (orders.consumer.startGuestClaim) so those orders can
// be moved into the account afterwards.
import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/api";
import type { ContactDefaults, OrderRow } from "@/convex/returns/checkout";
import { useViewer } from "@/lib/auth";
import { pendingClaimToken, saveClaimSnapshot, saveClaimToken } from "./claim";

export function usePrepareGuestClaim() {
  const { status } = useViewer();
  const guest = status === "guest";
  const orders = useQuery(api.orders.consumer.list, guest ? {} : "skip") as OrderRow[] | undefined;
  const contact = useQuery(api.checkout.contactDefaults, guest ? {} : "skip") as ContactDefaults | undefined;
  const start = useMutation(api.orders.consumer.startGuestClaim);

  return useCallback(async () => {
    if (!guest || !orders || orders.length === 0) return;
    if (!pendingClaimToken()) {
      try {
        const { token } = (await start({})) as { token: string };
        saveClaimToken(token);
      } catch {
        return; // The orders stay findable with Find my order.
      }
    }
    saveClaimSnapshot({
      orders: orders.map((o) => ({
        id: o._id,
        number: o.number,
        farmId: o.farmId,
        farmName: o.farmName,
        totalKobo: o.totalKobo,
        status: o.status,
        fulfilment: o.fulfilment,
      })),
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
    });
  }, [guest, orders, contact, start]);
}
