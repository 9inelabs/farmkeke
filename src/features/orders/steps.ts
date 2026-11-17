// The order timeline (M-63), the same steps the website shows (W-51, W-51b).
// Every order is placed, accepted, billed and paid (Paystack splits the
// payment at once), then delivered or collected at the farm, and closes a
// day later unless a problem is reported. Orders that ended early show how
// they ended.
import type { ReactNode } from "react";
import type { TimelineStep } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { dayLabel, dayTime } from "./format";
import { ENDED, RANK } from "./status";
import type { OrderDetail } from "./useOrder";

const at = (ms: number | null | undefined) => (ms ? dayTime(ms) : undefined);

export function orderSteps(o: OrderDetail, riderCard: ReactNode): TimelineStep[] {
  const r = RANK[o.status] ?? 0;
  const state = (done: boolean, current: boolean): TimelineStep["state"] => (done ? "done" : current ? "current" : "todo");
  const farm = o.farmName;
  const pickup = o.fulfilment === "pickup";
  // Older pickup orders were paid at checkout, with no bill
  const billFirst = o.bill != null || o.paidAt === null;
  const placed: TimelineStep = billFirst
    ? { key: "placed", title: "Order placed", detail: at(o.placedAt), state: "done" }
    : { key: "paid", title: "Order placed and paid", detail: at(o.paidAt ?? o.placedAt), state: "done" };

  if (ENDED.includes(o.status)) {
    const title =
      o.status === "declined"
        ? `Declined by ${farm}`
        : o.status === "expired"
          ? `${farm} didn't accept in time`
          : o.cancelReason === "bill_not_paid"
            ? "Cancelled: the bill wasn't paid in time"
            : "Order cancelled";
    return [
      placed,
      {
        key: "ended",
        title,
        detail: o.escrow === "none" ? "You weren't charged" : o.escrow === "refunded" ? `${formatNaira(o.totalKobo)} refunded in full` : `Your ${formatNaira(o.totalKobo)} is being refunded in full`,
        state: "current",
      },
    ];
  }

  // A day after delivery or collection the order closes, unless a problem is reported
  const close: TimelineStep = {
    key: "close",
    title: o.status === "disputed" ? "We're looking into your report" : r >= 6 ? "Closed" : "Order closes",
    detail:
      o.status === "disputed"
        ? "We'll text you with the outcome"
        : r >= 6
          ? at(o.endedAt)
          : o.reportBy
            ? `${dayTime(o.reportBy)}, unless you report a problem`
            : "A day after it reaches you, unless you report a problem",
    state: state(r >= 6, r === 5),
  };

  const isPaid = o.paid;
  const accepted: TimelineStep = {
    key: "accepted",
    title: r >= 2 ? `Accepted by ${farm}` : `Waiting for ${farm} to accept`,
    detail: r >= 2 ? at(o.acceptedAt) : o.respondBy ? `They have until ${dayTime(o.respondBy)}` : undefined,
    state: state(r >= 2, r < 2),
  };
  const bill: TimelineStep[] = billFirst
    ? [
        {
          key: "bill",
          title: isPaid ? "Bill paid" : o.bill?.state === "ready_to_pay" ? "Pay your bill" : pickup ? "We send your bill" : "We price the delivery and send your bill",
          detail: isPaid
            ? at(o.paidAt)
            : o.bill?.state === "ready_to_pay"
              ? `${formatNaira(o.bill.totalKobo)}${pickup ? "" : ", delivery included"}. Pay by ${o.bill.payBy ? dayTime(o.bill.payBy) : "the time on your bill"}`
              : r >= 2
                ? pickup
                  ? "By email, text and in the app"
                  : "By email, text and in the app, once a rider is arranged"
                : undefined,
          state: state(isPaid, r >= 2 && !isPaid),
        },
      ]
    : [];

  if (pickup) {
    // Older orders went to a pickup point; new ones are collected at the farm.
    const point = o.pickupPoint?.name;
    const waiting = point ? `Waiting at ${point}` : `Ready to collect at ${farm}`;
    return [
      placed,
      ...(billFirst ? [accepted, ...bill] : []),
      {
        key: "packed",
        title: r >= 4 ? `Packed by ${farm}` : `${farm} is preparing your order`,
        detail: r >= 4 ? at(o.readyAt ?? o.packedAt) : r >= 2 ? at(o.preparingAt ?? o.acceptedAt) : undefined,
        state: state(r >= 4.5, r >= 2 && r < 4.5 && isPaid),
      },
      {
        key: "ready",
        title: waiting,
        detail: r >= 4.5 && o.collectBy ? `Collect by ${dayLabel(o.collectBy)}` : undefined,
        state: state(r >= 5, r >= 4.5 && r < 5),
      },
      { key: "collected", title: o.status === "disputed" ? "Collected · Problem reported" : "Collected", detail: at(o.deliveredAt), state: state(r >= 5, false) },
      close,
    ];
  }

  return [
    placed,
    accepted,
    ...bill,
    {
      key: "packed",
      title: r >= 4 ? "Packed and handed to the rider" : r >= 3.5 ? "Packed, waiting for the rider" : "Being prepared",
      detail: r >= 4 ? at(o.outForDeliveryAt ?? o.packedAt) : r >= 3.5 ? at(o.readyAt ?? o.packedAt) : r >= 2 ? at(o.preparingAt) : undefined,
      state: state(r >= 4, r >= 2 && r < 4 && (isPaid || !billFirst)),
    },
    { key: "out", title: "Out for delivery", detail: r === 4 ? riderCard : undefined, state: state(r >= 5, r === 4) },
    { key: "delivered", title: o.status === "disputed" ? "Delivered · Problem reported" : "Delivered", detail: at(o.deliveredAt), state: state(r >= 5, false) },
    close,
  ];
}
