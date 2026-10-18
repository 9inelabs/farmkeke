"use client";

// Loads an order for the order pages. The owner (account, or the guest's
// browser) gets it from orders.consumer.get; anyone who looked it up in Find my
// order on this tab gets the view-only version from orders.consumer.find.
import { useConvexAuth, useQuery } from "convex/react";
import { useHydrated } from "@/components/cart/parts";
import { api } from "@/convex/api";
import type { OrderDetail } from "@/convex/returns/orders";
import { lookupFor, type FoundOrder } from "./lookup";

export type OrderAccess =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "ok"; order: OrderDetail; lookup: FoundOrder | null };

export function useOrder(orderId: string): OrderAccess {
  const { isLoading } = useConvexAuth();
  const hydrated = useHydrated();
  const own = useQuery(api.orders.consumer.get, isLoading ? "skip" : { orderId }) as OrderDetail | null | undefined;
  const lookup = hydrated ? lookupFor(orderId) : null;
  const found = useQuery(
    api.orders.consumer.find,
    own === null && lookup ? { number: lookup.number, phone: lookup.phone } : "skip",
  ) as OrderDetail | null | undefined;
  if (!hydrated || isLoading || own === undefined) return { state: "loading" };
  if (own) return { state: "ok", order: own, lookup };
  if (!lookup) return { state: "missing" };
  if (found === undefined) return { state: "loading" };
  return found ? { state: "ok", order: found, lookup } : { state: "missing" };
}
