// Loads an order for the order screens. The owner (account, or the guest's
// phone) gets it from orders.consumer.get; anyone who looked it up with Find
// my order on this phone gets the view-only version from orders.consumer.find.
import { api } from "@convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { create } from "zustand";

export type OrderDetail = NonNullable<FunctionReturnType<typeof api.orders.consumer.get>>;

type Lookup = { orderId: string; number: string; phone: string };

/** The last Find my order lookup, for this app session only. */
export const useLookup = create<{ lookup: Lookup | null; remember: (l: Lookup) => void }>()((set) => ({
  lookup: null,
  remember: (lookup) => set({ lookup }),
}));

export type OrderAccess = { state: "loading" } | { state: "missing" } | { state: "ok"; order: OrderDetail };

export function useOrder(orderId: string): OrderAccess {
  const { isLoading } = useConvexAuth();
  const own = useQuery(api.orders.consumer.get, isLoading ? "skip" : { orderId });
  const lookup = useLookup((s) => (s.lookup?.orderId === orderId ? s.lookup : null));
  const found = useQuery(api.orders.consumer.find, own === null && lookup ? { number: lookup.number, phone: lookup.phone } : "skip");
  if (isLoading || own === undefined) return { state: "loading" };
  if (own) return { state: "ok", order: own };
  if (!lookup) return { state: "missing" };
  if (found === undefined) return { state: "loading" };
  return found ? { state: "ok", order: found } : { state: "missing" };
}
