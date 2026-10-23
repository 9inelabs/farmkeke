// Where an order stands, in the shopper's words, matching the website
// (web/src/components/orders/rows.ts and OrderView): badges, the timing line
// on order cards, and how far along the happy path an order is.
import { dayLabel, hm, relDay } from "./format";

import type { BadgeTone } from "@/components/ui";

export type Tone = BadgeTone;

/** Rank on the happy path; used to mark timeline steps done. */
export const RANK: Record<string, number> = {
  awaiting_payment: 0,
  placed: 1,
  paid: 1,
  accepted: 2,
  preparing: 3,
  ready_for_rider: 3.5,
  out_for_delivery: 4,
  with_rider: 4,
  at_pickup_point: 4.5,
  ready_for_collection: 4.5,
  delivered: 5,
  collected: 5,
  disputed: 5,
  completed: 6,
};

export const ENDED = ["declined", "expired", "cancelled"];

export function badge(status: string, fulfilment: "delivery" | "pickup", paid = true): { label: string; tone: Tone } {
  switch (status) {
    case "awaiting_payment":
      return { label: "Awaiting payment", tone: "pending" };
    case "placed":
    case "paid":
      return { label: "Waiting for the farm", tone: "pending" };
    case "accepted":
      return { label: fulfilment === "delivery" && !paid ? "Accepted · bill next" : "Accepted", tone: "pending" };
    case "preparing":
      return { label: "Preparing", tone: "pending" };
    case "ready_for_rider":
      return { label: "Ready for rider", tone: "pending" };
    case "out_for_delivery":
      return { label: "Out for delivery", tone: "pending" };
    case "with_rider":
      return { label: "On its way", tone: "pending" };
    case "at_pickup_point":
    case "ready_for_collection":
      return { label: "Ready to collect", tone: "success" };
    case "delivered":
      return { label: "Delivered", tone: "success" };
    case "collected":
      return { label: "Collected", tone: "success" };
    case "completed":
      return { label: "Completed", tone: "success" };
    case "disputed":
      return { label: "Problem reported", tone: "error" };
    case "declined":
      return { label: "Declined by farm", tone: "error" };
    case "expired":
      return { label: "Expired", tone: "neutral" };
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" };
    default:
      return { label: "In progress", tone: "neutral" };
  }
}

type RowLike = {
  status: string;
  fulfilment: "delivery" | "pickup";
  placedAt: number;
  deliveredAt: number | null;
  paid?: boolean;
  billReady?: boolean;
};

/** "Delivered today, 10:52", "Your bill is ready. Pay now", "Waiting for the farm to accept" */
export function timingText(o: RowLike, now: number): string {
  if ((o.status === "delivered" || o.status === "collected") && o.deliveredAt) {
    return `${o.status === "collected" ? "Collected" : "Delivered"} ${relDay(o.deliveredAt, now)}, ${hm(o.deliveredAt)}`;
  }
  if (o.status === "placed" || o.status === "paid") return "Waiting for the farm to accept";
  if (o.fulfilment === "delivery" && o.paid === false && ["accepted", "preparing", "ready_for_rider"].includes(o.status)) {
    return o.billReady ? "Your bill is ready. Pay now" : "Waiting for your bill";
  }
  if (o.status === "ready_for_collection") return "Ready to collect at the farm";
  if (o.status === "at_pickup_point") return "Ready to collect at the pickup point";
  if (o.status === "out_for_delivery") return "On its way to you";
  if (o.fulfilment === "pickup" && ["accepted", "preparing"].includes(o.status)) return "Being prepared at the farm";
  if (["accepted", "preparing", "ready_for_rider"].includes(o.status)) return "Being prepared";
  return `Ordered ${dayLabel(o.placedAt)}`;
}

export const awaitsConfirm = (status: string) => status === "delivered" || status === "collected";
