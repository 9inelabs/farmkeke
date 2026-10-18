// Words for order rows in the account (W-43, W-44): timing lines and badges,
// in Nigerian time, matching the designs.
import type { OrderRow } from "@/convex/returns/checkout";
import { stageOf, statusBadge } from "@/convex/returns/orders";
import { dayMonth } from "@/lib/format";
import { hm, isoDayLabel, lagosDay, windowLabel } from "./format";

/** "today" / "tomorrow" / "yesterday" / "Sat 17 Oct" for a "YYYY-MM-DD" day. */
export function relDay(day: string, now: number): string {
  if (day === lagosDay(now)) return "today";
  if (day === lagosDay(now + 86_400_000)) return "tomorrow";
  if (day === lagosDay(now - 86_400_000)) return "yesterday";
  return isoDayLabel(day);
}

/** "Delivered today, 10:52", "Arriving today, 12pm – 3pm", "Waiting for the farm to accept" */
export function timingText(o: OrderRow, now: number): string {
  const stage = stageOf(o.status);
  if ((stage === "delivered" || stage === "collected") && o.deliveredAt) {
    return `${stage === "collected" ? "Collected" : "Delivered"} ${relDay(lagosDay(o.deliveredAt), now)}, ${hm(o.deliveredAt)}`;
  }
  if (stage === "paid") return "Waiting for the farm to accept";
  if (stage === "at_pickup_point") return "Ready to collect at the pickup point";
  if (o.fulfilment === "delivery" && o.window && ["accepted", "preparing", "ready", "out_for_delivery"].includes(stage)) {
    return `Arriving ${relDay(o.window.day, now)}, ${windowLabel(o.window.from, o.window.to)}`;
  }
  if (o.fulfilment === "pickup" && ["accepted", "preparing", "ready", "out_for_delivery"].includes(stage)) {
    return "On its way to the pickup point";
  }
  return `Ordered ${dayMonth(o.placedAt)}`;
}

export const badgeFor = (o: Pick<OrderRow, "status" | "fulfilment">) =>
  statusBadge({ stage: stageOf(o.status), fulfilment: o.fulfilment });

export const awaitsConfirm = (o: Pick<OrderRow, "status">) => o.status === "delivered" || o.status === "collected";
