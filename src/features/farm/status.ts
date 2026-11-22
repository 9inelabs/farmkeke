// Order states in the farmer's words (F-40 to F-47). Since 22 Nov 2026 the
// farm only accepts or declines; Farmkeke (and the shopper) take it from there.
import type { BadgeTone } from "@/components/ui";

export type FarmTab = "new" | "accepted" | "completed" | "cancelled" | "disputed";

export const FARM_TABS: { key: FarmTab; label: string }[] = [
  { key: "new", label: "New" },
  { key: "accepted", label: "Accepted" },
  { key: "completed", label: "Completed" },
  { key: "disputed", label: "Disputed" },
  { key: "cancelled", label: "Cancelled" },
];

export function farmBadge(o: { status: string; fulfilment: "delivery" | "pickup"; paid?: boolean; packedAt?: number | null }): { label: string; tone: BadgeTone } {
  switch (o.status) {
    case "paid":
    case "placed":
      return { label: "New", tone: "brand" };
    // "preparing" and "ready_for_rider" are older orders' stages: they read the same as accepted
    case "accepted":
    case "preparing":
    case "ready_for_rider":
      if (o.paid === false) return { label: "Awaiting payment", tone: "neutral" };
      return o.fulfilment === "delivery" ? { label: "Rider collecting", tone: "pending" } : { label: "Accepted", tone: "pending" };
    case "ready_for_collection":
      return o.paid === false ? { label: "Awaiting payment", tone: "neutral" } : { label: "Ready for buyer", tone: "pending" };
    case "with_rider":
    case "out_for_delivery":
      return { label: "With rider", tone: "pending" };
    case "at_pickup_point":
      return { label: "At pickup point", tone: "pending" };
    case "delivered":
      return { label: "Delivered", tone: "success" };
    case "collected":
      return { label: "Collected", tone: "success" };
    case "completed":
      return { label: "Paid out", tone: "success" };
    case "disputed":
      return { label: "Problem reported", tone: "error" };
    case "declined":
      return { label: "Declined", tone: "neutral" };
    case "expired":
      return { label: "Expired", tone: "neutral" };
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" };
    default:
      return { label: "In progress", tone: "neutral" };
  }
}

export const DECLINE_REASONS = [
  { value: "out_of_stock", label: "Out of stock" },
  { value: "cannot_deliver_in_time", label: "Can't prepare in time" },
  { value: "other", label: "Something else" },
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number]["value"];
