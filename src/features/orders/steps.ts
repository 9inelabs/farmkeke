// The order timeline (M-63), the same steps the website shows (W-51, W-51b):
// delivery orders are placed, accepted, billed, paid, packed, delivered and
// confirmed; pickup orders are paid, packed, collected at the farm and
// confirmed. Orders that ended early show how they ended.
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
  const billFirst = o.fulfilment === "delivery" && (o.bill != null || o.paidAt === null);
  const placed: TimelineStep = billFirst
    ? { key: "placed", title: "Order placed", detail: at(o.placedAt), state: "done" }
    : { key: "paid", title: "Order placed and paid", detail: [at(o.paidAt ?? o.placedAt), "Money held by Farmkeke"].filter(Boolean).join(" · "), state: "done" };

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

  const confirm: TimelineStep = {
    key: "confirm",
    title: o.status === "disputed" ? "We're looking into your report" : "You confirm receipt",
    detail: o.status === "disputed" ? "Your payment stays held until it's resolved" : `Then ${farm} is paid`,
    state: state(r >= 6, r === 5),
  };

  if (o.fulfilment === "pickup") {
    // Older orders went to a pickup point; new ones are collected at the farm.
    const point = o.pickupPoint?.name;
    const waiting = point ? `Waiting at ${point}` : `Ready to collect at ${farm}`;
    return [
      placed,
      {
        key: "packed",
        title: r >= 4 ? `Accepted and packed by ${farm}` : r <= 1 ? `Waiting for ${farm} to accept` : `${farm} is preparing your order`,
        detail: r >= 4 ? at(o.readyAt ?? o.packedAt ?? o.acceptedAt) : r <= 1 && o.respondBy ? `They have until ${dayTime(o.respondBy)}` : at(o.acceptedAt),
        state: state(r >= 4.5, r < 4.5),
      },
      {
        key: "ready",
        title: waiting,
        detail: r >= 4.5 && o.collectBy ? `Collect by ${dayLabel(o.collectBy)}` : undefined,
        state: state(r >= 5, r >= 4.5 && r < 5),
      },
      { key: "collected", title: o.status === "disputed" ? "Collected · Problem reported" : "Collected", detail: at(o.deliveredAt), state: state(r >= 5, false) },
      confirm,
    ];
  }

  const isPaid = o.escrow !== "none";
  const bill: TimelineStep[] = billFirst
    ? [
        {
          key: "bill",
          title: isPaid ? "Bill paid" : o.bill?.state === "ready_to_pay" ? "Pay your bill" : "We price the delivery and send your bill",
          detail: isPaid
            ? [at(o.paidAt), "Money held by Farmkeke"].filter(Boolean).join(" · ")
            : o.bill?.state === "ready_to_pay"
              ? `${formatNaira(o.bill.totalKobo)}, delivery included. Pay by ${o.bill.payBy ? dayTime(o.bill.payBy) : "the time on your bill"}`
              : r >= 2
                ? "By email, text and in the app, once a rider is arranged"
                : undefined,
          state: state(isPaid, r >= 2 && !isPaid),
        },
      ]
    : [];
  return [
    placed,
    {
      key: "accepted",
      title: r >= 2 ? `Accepted by ${farm}` : `Waiting for ${farm} to accept`,
      detail: r >= 2 ? at(o.acceptedAt) : o.respondBy ? `They have until ${dayTime(o.respondBy)}` : undefined,
      state: state(r >= 2, r < 2),
    },
    ...bill,
    {
      key: "packed",
      title: r >= 4 ? "Packed and handed to the rider" : r >= 3.5 ? "Packed, waiting for the rider" : "Being prepared",
      detail: r >= 4 ? at(o.outForDeliveryAt ?? o.packedAt) : r >= 3.5 ? at(o.readyAt ?? o.packedAt) : r >= 2 ? at(o.preparingAt) : undefined,
      state: state(r >= 4, r >= 2 && r < 4 && (isPaid || !billFirst)),
    },
    { key: "out", title: "Out for delivery", detail: r === 4 ? riderCard : undefined, state: state(r >= 5, r === 4) },
    { key: "delivered", title: o.status === "disputed" ? "Delivered · Problem reported" : "Delivered", detail: at(o.deliveredAt), state: state(r >= 5, false) },
    confirm,
  ];
}
