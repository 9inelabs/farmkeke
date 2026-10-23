// Order states in the farmer's words (F-40 to F-47).
import type { BadgeTone } from "@/components/ui";

export type FarmTab = "new" | "to_prepare" | "with_rider" | "completed" | "cancelled" | "disputed";

export const FARM_TABS: { key: FarmTab; label: string }[] = [
  { key: "new", label: "New" },
  { key: "to_prepare", label: "To prepare" },
  { key: "with_rider", label: "Out" },
  { key: "completed", label: "Completed" },
  { key: "disputed", label: "Disputed" },
  { key: "cancelled", label: "Cancelled" },
];

export function farmBadge(o: { status: string; fulfilment: "delivery" | "pickup"; paid?: boolean; packedAt?: number | null }): { label: string; tone: BadgeTone } {
  switch (o.status) {
    case "paid":
    case "placed":
      return { label: "New", tone: "brand" };
    case "accepted":
      return { label: "Accepted", tone: "pending" };
    case "preparing":
      return { label: o.packedAt ? "Packed" : "Preparing", tone: "pending" };
    case "ready_for_rider":
      return o.fulfilment === "delivery" && o.paid === false ? { label: "Awaiting payment", tone: "neutral" } : { label: "Ready for rider", tone: "pending" };
    case "ready_for_collection":
      return { label: "Ready for buyer", tone: "pending" };
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
