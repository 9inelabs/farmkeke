"use client";

// W-51 Order tracking (home delivery), W-51b (pickup at the farm, with the
// pickup code) and W-51c (view only: opened with Find my order on another
// device). Delivery orders are paid by bill once the delivery is priced, so
// an unpaid one shows where its bill stands and, when it's ready, Pay.
import { ChevronLeft, Eye, Flag, LifeBuoy, MapPin, MessageCircle, Phone, Receipt, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { capitalise, Thumb } from "@/components/cart/parts";
import { ConfirmReceiptModal } from "@/components/orders/ConfirmReceipt";
import { dayLabel, dayTime, hoursSummary, shortName, weekdayTime, windowLabel } from "@/components/orders/format";
import { PickupQr } from "@/components/orders/PickupQr";
import { relDay } from "@/components/orders/rows";
import { useOrder } from "@/components/orders/useOrder";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { Timeline, type TimelineStep } from "@/components/ui/Timeline";
import { stageOf, statusBadge, type OrderBill, type OrderDetail } from "@/convex/returns/orders";
import { useViewer } from "@/lib/auth";
import { initials, naira, plural } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";

export function OrderSkeleton() {
  return (
    <div className="wrap pt-7 pb-24">
      <LoadingRegion label="Loading your order">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-4 h-10 w-72" />
        <Skeleton className="mt-2 h-5 w-96 max-w-full" />
        <div className="mt-6 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-6 m:grid-cols-1">
          <Skeleton className="h-[420px] w-full" rounded={18} />
          <Skeleton className="h-[320px] w-full" rounded={18} />
        </div>
      </LoadingRegion>
    </div>
  );
}

export function OrderView({ orderId }: { orderId: string }) {
  const access = useOrder(orderId);
  if (access.state === "loading") return <OrderSkeleton />;
  if (access.state === "missing") return <Missing />;
  const { order } = access;
  return (
    <Reveal>
      {order.viewOnly ? <ViewOnly order={order} /> : <Tracking order={order} />}
    </Reveal>
  );
}

function Missing() {
  return (
    <div className="mx-auto max-w-[560px] px-5 pt-16 pb-24">
      <section className="card flex flex-col items-center gap-3 px-8 py-12 text-center m:px-5">
        <h1 className="m-0 font-display text-[26px] leading-[34px] font-extrabold">We couldn&apos;t open this order</h1>
        <p className="p">
          It may belong to another account or device. Look it up with the order number and phone number, or sign in to see
          your orders.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5">
          <ButtonLink href={routes.findOrder} variant="lime">
            Find my order
          </ButtonLink>
          <ButtonLink href={routes.signIn(routes.myOrders)} variant="ghost">
            Sign in
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Where the order is

const RANK: Record<string, number> = {
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
const ENDED = ["declined", "expired", "cancelled"];
const at = (ms: number | null | undefined) => (ms ? dayTime(ms) : undefined);
/** A delivery order not paid yet (its bill hasn't been paid). */
const unpaidDelivery = (o: OrderDetail) => o.fulfilment === "delivery" && o.escrow === "none";
/** The bill is out and this device can pay it. */
const payable = (o: OrderDetail): o is OrderDetail & { bill: OrderBill & { payToken: string } } =>
  o.bill?.state === "ready_to_pay" && !!o.bill.payToken && !o.viewOnly;

function steps(o: OrderDetail, now: number, riderCard: ReactNode): TimelineStep[] {
  const r = RANK[o.status] ?? 0;
  const state = (done: boolean, current: boolean): TimelineStep["state"] => (done ? "done" : current ? "current" : "todo");
  const farm = o.farmName;
  // Delivery orders are placed first and paid by bill later
  const billFirst = o.fulfilment === "delivery" && (o.bill != null || o.paidAt === null);
  const placed: TimelineStep = billFirst
    ? { key: "placed", title: "Order placed", detail: at(o.placedAt), state: "done" }
    : {
        key: "paid",
        title: "Order placed and paid",
        detail: [at(o.paidAt ?? o.placedAt), "Money held by Farmkeke"].filter(Boolean).join(" · "),
        state: "done",
      };

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
        detail:
          o.escrow === "none"
            ? "You weren't charged"
            : o.escrow === "refunded"
              ? `${naira(o.totalKobo)} refunded in full`
              : `Your ${naira(o.totalKobo)} is being refunded in full`,
        state: "current",
      },
    ];
  }

  if (o.fulfilment === "pickup" && !o.pickupPoint) {
    return [
      placed,
      {
        key: "packed",
        title: r >= 4.5 ? `Accepted and packed by ${farm}` : r <= 1 ? `Waiting for ${farm} to accept` : `${farm} is preparing your order`,
        detail: r >= 4.5 ? at(o.readyAt ?? o.packedAt) : r <= 1 && o.respondBy ? `They have until ${dayTime(o.respondBy)}` : at(o.acceptedAt),
        state: state(r >= 4.5, r < 4.5),
      },
      {
        key: "farm",
        title: "Ready to collect at the farm",
        detail: r >= 4.5 && o.collectBy ? `Collect by ${dayLabel(o.collectBy)}` : undefined,
        state: state(r >= 5, r >= 4.5 && r < 5),
      },
      { key: "collected", title: o.status === "disputed" ? "Collected · Problem reported" : "Collected", detail: at(o.deliveredAt), state: state(r >= 5, false) },
      {
        key: "confirm",
        title: o.status === "disputed" ? "We're looking into your report" : "You confirm receipt",
        detail: o.status === "disputed" ? "Your payment stays held until it's resolved" : `Then ${farm} is paid`,
        state: state(r >= 6, r === 5),
      },
    ];
  }

  if (o.fulfilment === "pickup") {
    // Older orders went to a pickup point; new ones are collected at the farm
    const point = o.pickupPoint?.name;
    const waiting = point ? "Waiting at the pickup point" : `Ready to collect at ${farm}`;
    return [
      placed,
      {
        key: "packed",
        title: r >= 4 ? `Accepted and packed by ${farm}` : r <= 1 ? `Waiting for ${farm} to accept` : `${farm} is preparing your order`,
        detail: r >= 4 ? at(o.packedAt ?? o.readyAt ?? o.acceptedAt) : r <= 1 && o.respondBy ? `They have until ${dayTime(o.respondBy)}` : at(o.acceptedAt),
        state: state(r >= 4, r < 4),
      },
      {
        key: "point",
        title: r >= 4.5 ? waiting : r >= 4 && point ? `On its way to ${point}` : waiting,
        detail:
          r >= 4.5
            ? [o.arrivedAt ? `Arrived ${dayTime(o.arrivedAt)}` : "", o.collectBy ? `Collect by ${dayLabel(o.collectBy)}` : ""]
                .filter(Boolean)
                .join(" · ")
            : undefined,
        state: state(r >= 5, r >= 4 && r < 5),
      },
      { key: "collected", title: o.status === "disputed" ? "Collected · Problem reported" : "Collected", detail: at(o.deliveredAt), state: state(r >= 5, false) },
      {
        key: "confirm",
        title: o.status === "disputed" ? "We're looking into your report" : "You confirm receipt",
        detail: o.status === "disputed" ? "Your payment stays held until it's resolved" : `Then ${farm} is paid`,
        state: state(r >= 6, r === 5),
      },
    ];
  }

  const arriving = o.window ? `Arriving ${relDay(o.window.day, now)}, ${windowLabel(o.window.from, o.window.to)}` : undefined;
  const isPaid = o.escrow !== "none";
  const bill: TimelineStep[] = billFirst
    ? [
        {
          key: "bill",
          title: isPaid ? "Bill paid" : o.bill?.state === "ready_to_pay" ? "Pay your bill" : "We price the delivery and send your bill",
          detail: isPaid
            ? [at(o.paidAt), "Money held by Farmkeke"].filter(Boolean).join(" · ")
            : o.bill?.state === "ready_to_pay"
              ? `${naira(o.bill.totalKobo)}, delivery included. Pay by ${o.bill.payBy ? dayTime(o.bill.payBy) : "the time on your bill"}`
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
    {
      key: "out",
      title: "Out for delivery",
      detail:
        r === 4 ? (
          <>
            {arriving}
            {riderCard}
          </>
        ) : r < 4 ? (
          arriving
        ) : undefined,
      state: state(r >= 5, r === 4),
    },
    { key: "delivered", title: o.status === "disputed" ? "Delivered · Problem reported" : "Delivered", detail: at(o.deliveredAt), state: state(r >= 5, false) },
    {
      key: "confirm",
      title: o.status === "disputed" ? "We're looking into your report" : "You confirm receipt",
      detail: o.status === "disputed" ? "Your payment stays held until it's resolved" : `Then ${farm} is paid`,
      state: state(r >= 6, r === 5),
    },
  ];
}

// ---------------------------------------------------------------------------
// W-51 / W-51b

function Tracking({ order: o }: { order: OrderDetail }) {
  const { status: viewer } = useViewer();
  const [now] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const badge = statusBadge({ stage: stageOf(o.status), fulfilment: o.fulfilment });
  const held = o.escrow === "held";
  const pickup = o.fulfilment === "pickup";

  const riderCard = o.rider ? (
    <span className="mt-3 flex items-center gap-3 rounded-[14px] bg-soft px-3.5 py-3 text-ink">
      <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-full bg-lime-soft text-[13px] font-bold text-forest">
        {initials(o.rider.name)}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{shortName(o.rider.name)}</span>
        <span className="cap block">Your Farmkeke rider</span>
      </span>
      {o.rider.phone ? (
        <a href={`tel:${o.rider.phone}`} className="btn ghost sm">
          <Phone aria-hidden className="size-[15px]" strokeWidth={1.75} />
          Call rider
        </a>
      ) : null}
    </span>
  ) : null;

  return (
    <div className="wrap pt-7 pb-24">
      {viewer === "signed-in" ? (
        <Link href={routes.myOrders} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
          My orders
        </Link>
      ) : (
        <Link href={routes.shop} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
          Back to the shop
        </Link>
      )}
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1">Order {o.number}</h1>
          <p className="p mt-1">
            {o.farmName}
            {pickup ? " · Pickup" : ""} · Ordered {pickup ? dayLabel(o.placedAt) : dayTime(o.placedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge h-[26px] rounded-lg px-2.5 ${badge.cls}`}>{badge.label}</span>
          {held ? (
            <span className="badge b-held h-[26px] rounded-lg px-2.5">
              <ShieldCheck aria-hidden className="size-[13px]" strokeWidth={2} />
              {naira(o.totalKobo)} held
            </span>
          ) : unpaidDelivery(o) && o.isActive ? (
            <span className="badge b-grey h-[26px] rounded-lg px-2.5">Not paid yet</span>
          ) : null}
        </div>
      </div>
      {payable(o) ? (
        <section className="mb-6 flex flex-wrap items-center gap-4 rounded-[20px] bg-pend-bg px-6 py-5 m:px-4">
          <Receipt aria-hidden className="size-6 flex-none text-pend" strokeWidth={1.75} />
          <div className="min-w-[220px] flex-1">
            <div className="text-[15px] font-semibold text-ink">Your bill is ready: {naira(o.bill.totalKobo)}</div>
            <div className="sm">
              Delivery included. Pay by {o.bill.payBy ? dayTime(o.bill.payBy) : "the time on your bill"}, or the order is cancelled.
            </div>
          </div>
          <ButtonLink href={routes.payBill(o.bill.payToken)} variant="lime" className="min-h-[52px] rounded-[14px] px-[22px]">
            Pay {naira(o.bill.totalKobo)}
          </ButtonLink>
        </section>
      ) : null}

      <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-5">
          {pickup && o.pickupCode ? (
            <section aria-label="Your pickup code" className="flex flex-wrap items-center gap-7 rounded-[22px] bg-forest p-7 text-white m:p-5">
              <div className="min-w-[260px] flex-1 m:min-w-0">
                <div className="text-[13px] font-semibold text-lime">Your pickup code</div>
                <div className="mt-3 flex gap-2.5" aria-label={`Pickup code ${o.pickupCode.split("").join(" ")}`} role="img">
                  {o.pickupCode.split("").map((d, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="flex h-[68px] w-14 items-center justify-center rounded-[14px] bg-white font-display text-[34px] font-extrabold text-forest m:h-14 m:w-12 m:text-[28px]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="mt-3.5 text-sm leading-[21px] text-on-forest">
                  Show this code at {o.pickupPoint ? "the counter" : "the farm"}. Only hand it over when you&apos;re collecting your order.
                </p>
              </div>
              <PickupQr code={o.pickupCode} />
            </section>
          ) : null}

          <section aria-labelledby="progress-title" className="card p-6 m:px-4">
            <h2 id="progress-title" className="h3">
              Progress
            </h2>
            <div className="mt-5">
              <Timeline steps={steps(o, now, riderCard)} />
            </div>
          </section>

          {pickup ? null : (
            <section aria-labelledby="items-title" className="card p-6 m:px-4">
              <h2 id="items-title" className="h3">
                Items
              </h2>
              <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                {o.items.map((it) => (
                  <li key={it.index} className="flex items-center gap-3.5">
                    <Thumb id={it.listingId} imageUrl={it.imageUrl} size={56} radius={12} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">{it.name}</div>
                      <div className="cap">
                        {capitalise(it.unitSingular)} × {it.quantity}
                      </div>
                    </div>
                    <span className="font-semibold">{naira(it.lineTotalKobo)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-col gap-1.5 pt-3.5 text-sm text-ink-3 shadow-[inset_0_1px_0_#EEF0EB]">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{naira(o.itemsTotalKobo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{o.deliveryPricedAt || o.paid ? naira(o.deliveryFeeKobo) : "Priced after the farm accepts"}</span>
                </div>
                <div className="flex justify-between pt-1.5 font-bold text-ink">
                  <span>{o.paid ? "Total paid" : o.deliveryPricedAt ? "Total to pay" : "Products total"}</span>
                  <span>{naira(o.totalKobo)}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          {pickup ? o.pickupPoint ? <PickupPointCard order={o} /> : <CollectFromCard order={o} /> : null}
          <NextStep order={o} onConfirm={() => setConfirming(true)} />
          {pickup ? (
            <section aria-labelledby="pitems-title" className="card p-5">
              <h2 id="pitems-title" className="m-0 text-sm font-semibold">
                Items
              </h2>
              <ul className="m-0 list-none p-0">
                {o.items.map((it, i) => (
                  <li key={it.index} className={`flex justify-between text-sm ${i === 0 ? "mt-2.5" : "mt-1.5"}`}>
                    <span>
                      {it.name} × {it.quantity}
                    </span>
                    <span>{naira(it.lineTotalKobo)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 flex justify-between pt-2.5 text-sm font-bold shadow-[inset_0_1px_0_#EEF0EB]">
                <span>Total paid</span>
                <span>{naira(o.totalKobo)}</span>
              </div>
            </section>
          ) : (
            <section className="card px-[22px] py-1.5">
              {o.address ? (
                <div className="flex gap-3 py-3.5">
                  <MapPin aria-hidden className="size-5 flex-none text-forest" strokeWidth={1.75} />
                  <div>
                    <div className="cap">Delivering to</div>
                    <div className="mt-0.5 text-sm font-semibold">
                      {[o.address.street, o.address.areaName ?? o.address.lga].filter(Boolean).join(", ")}
                    </div>
                    {o.address.landmark ? <div className="cap">{o.address.landmark}</div> : null}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-3 py-3.5 [&:not(:first-child)]:shadow-[inset_0_1px_0_#EEF0EB]">
                <ShieldCheck aria-hidden className="size-5 flex-none text-forest" strokeWidth={1.75} />
                <PaymentLine order={o} />
              </div>
            </section>
          )}
          <section aria-label="Need help?" className="card p-2.5">
            <div className="cap px-3.5 pt-2 pb-1">Need help?</div>
            <HelpLink href={routes.chat(o._id)} icon={<MessageCircle className="size-[18px]" strokeWidth={1.75} />}>
              Message the farmer
            </HelpLink>
            {o.disputeId ? (
              <HelpLink href={routes.dispute(o._id)} icon={<Flag className="size-[18px]" strokeWidth={1.75} />}>
                View your problem report
              </HelpLink>
            ) : (
              <HelpLink href={routes.reportProblem(o._id)} icon={<Flag className="size-[18px]" strokeWidth={1.75} />}>
                Report a problem
              </HelpLink>
            )}
            <HelpLink href={routes.contact} icon={<LifeBuoy className="size-[18px]" strokeWidth={1.75} />}>
              Contact Farmkeke support
            </HelpLink>
          </section>
        </aside>
      </div>
      {confirming ? <ConfirmReceiptModal orderId={o._id} open onClose={() => setConfirming(false)} /> : null}
    </div>
  );
}

function HelpLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className="flex h-12 items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium text-ink hover:bg-canvas hover:text-ink">
      <span aria-hidden className="text-forest">
        {icon}
      </span>
      {children}
    </Link>
  );
}

function PaymentLine({ order: o }: { order: OrderDetail }) {
  const [title, sub] =
    o.escrow === "held"
      ? [`${naira(o.totalKobo)} held safely by Farmkeke`, o.status === "disputed" ? "Held until your report is resolved" : "Released only when you confirm"]
      : o.escrow === "released"
        ? [`${naira(o.totalKobo)} released to ${o.farmName}`, o.releasedAt ? dayTime(o.releasedAt) : "After you confirmed receipt"]
        : o.escrow === "refunded"
          ? [`${naira(o.totalKobo)} refunded to you`, "Back to how you paid"]
          : o.escrow === "split"
            ? ["Part refunded, part released", "See the refund for details"]
            : o.bill?.state === "ready_to_pay"
              ? [`Bill ready: ${naira(o.bill.totalKobo)}`, o.bill.payBy ? `Pay by ${dayTime(o.bill.payBy)}` : "Delivery included"]
              : o.bill?.state === "waiting_for_price"
                ? ["Nothing to pay yet", "We'll send your bill once the delivery is priced"]
                : o.bill?.state === "not_paid"
                  ? ["Not paid", "The bill wasn't paid in time, so you weren't charged"]
                  : ["Payment pending", "We'll update this once your payment is confirmed"];
  return (
    <div>
      <div className="cap">Payment</div>
      <div className="mt-0.5 text-sm font-semibold">{title}</div>
      <div className="cap">{sub}</div>
    </div>
  );
}

function NextStep({ order: o, onConfirm }: { order: OrderDetail; onConfirm: () => void }) {
  const pickup = o.fulfilment === "pickup";
  const r = RANK[o.status] ?? 0;
  const rider = o.rider ? shortName(o.rider.name).split(" ")[0] : null;
  const first = o.items[0]?.name.toLowerCase();

  let title: string;
  let body: string;
  let action: ReactNode;
  const disabledConfirm = (label: string, note: string) => (
    <>
      <Button variant="lime" fullWidth disabled className="mt-4 min-h-[52px] rounded-[14px]">
        {label}
      </Button>
      <div className={`mt-2 text-center text-xs ${pickup ? "text-subtle" : "text-on-forest"}`}>{note}</div>
    </>
  );

  if (o.status === "completed") {
    title = "All done";
    body = `${naira(o.totalKobo)} was released to ${o.farmName}. Thanks for buying direct from the farm.`;
    action = o.reviewed ? null : (
      <ButtonLink href={routes.review(o._id)} variant="lime" fullWidth className="mt-4 min-h-[52px] rounded-[14px]">
        Rate your order
      </ButtonLink>
    );
  } else if (o.status === "disputed") {
    title = "We're looking into your report";
    body = "Your payment stays held while the farm replies and our team reviews it.";
    action = (
      <ButtonLink href={routes.dispute(o._id)} variant="lime" fullWidth className="mt-4 min-h-[52px] rounded-[14px]">
        Follow this case
      </ButtonLink>
    );
  } else if (ENDED.includes(o.status)) {
    title = o.status === "declined" ? "The farm couldn't take this order" : o.status === "expired" ? "The farm didn't accept in time" : "This order was cancelled";
    body =
      o.escrow === "none"
        ? "You weren't charged for this order."
        : "Your money comes back to you in full. Banks can take a few working days to show it.";
    action = o.hasRefund ? (
      <ButtonLink href={routes.refund(o._id)} variant="lime" fullWidth className="mt-4 min-h-[52px] rounded-[14px]">
        View refund
      </ButtonLink>
    ) : null;
  } else if (unpaidDelivery(o)) {
    if (payable(o)) {
      title = "Pay your bill";
      body = `${o.farmName} has packed your order and a rider is arranged. Pay ${naira(o.bill.totalKobo)}, delivery included, and the rider brings it.`;
      action = (
        <ButtonLink href={routes.payBill(o.bill.payToken)} variant="lime" fullWidth className="mt-4 min-h-[52px] rounded-[14px]">
          Pay {naira(o.bill.totalKobo)}
        </ButtonLink>
      );
    } else {
      title = r <= 1 ? `Waiting for ${o.farmName} to accept` : "We're pricing your delivery";
      body = "Nothing to pay yet. We'll send your bill by email, text and in the app once a rider is arranged. You'll have 12 hours to pay.";
      action = null;
    }
  } else if (pickup) {
    const where = o.pickupPoint ? "the counter" : "the farm";
    title = "Collect your order, then confirm";
    body = `Check everything at ${where}. Something wrong? Report it before confirming.`;
    action = o.canConfirm ? (
      <Button variant="lime" fullWidth className="mt-4 min-h-[52px] rounded-[14px]" onClick={onConfirm}>
        I&apos;ve collected my order
      </Button>
    ) : (
      disabledConfirm("I've collected my order", o.pickupPoint ? "Available once the pickup point hands it over" : "Available once the farm hands it over")
    );
  } else if (o.canConfirm) {
    title = "Check everything arrived";
    body = "Then confirm receipt here to release payment to the farm. Something wrong? Report it first.";
    action = (
      <Button variant="lime" fullWidth className="mt-4 min-h-[52px] rounded-[14px]" onClick={onConfirm}>
        I received everything
      </Button>
    );
  } else if (r >= 4) {
    title = first ? `Check your ${first} when ${o.items.length > 1 ? "your order arrives" : "it arrives"}` : "Check your order when it arrives";
    body = `Once ${rider ?? "the rider"} hands ${o.items.length > 1 ? "everything" : "it"} over, confirm receipt here to release payment to the farm.`;
    action = disabledConfirm("I received everything", "Available once the order is delivered");
  } else {
    title = r <= 1 ? `Waiting for ${o.farmName} to accept` : `${o.farmName} is getting your order ready`;
    body = "We'll text you when it's on its way. Your payment stays held until you confirm delivery.";
    action = disabledConfirm("I received everything", "Available once the order is delivered");
  }

  return (
    <section
      aria-labelledby="next-step"
      className={pickup ? "card p-[22px]" : "rounded-[18px] bg-forest p-[22px] text-white"}
    >
      <div className={`text-xs font-semibold ${pickup ? "text-[#4C7A1F]" : "text-lime"}`}>Next step</div>
      <h2 id="next-step" className={`m-0 mt-1.5 font-display font-bold ${pickup ? "text-[17px] leading-6" : "text-lg leading-[25px]"}`}>
        {title}
      </h2>
      <p className={`mt-1.5 text-sm leading-[21px] ${pickup ? "text-muted" : "text-on-forest"}`}>{body}</p>
      {action}
    </section>
  );
}

function PickupPointCard({ order: o }: { order: OrderDetail }) {
  const p = o.pickupPoint;
  if (!p) return null;
  const hours = hoursSummary(p.hours);
  return (
    <section aria-labelledby="point-title" className="card overflow-hidden">
      <div role="img" aria-label="Map showing the pickup point" className="relative h-[140px] bg-[#EEF2E8]">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(30,59,22,0.05) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(30,59,22,0.05) 0 1px, transparent 1px 28px)",
          }}
        />
        <div aria-hidden className="absolute right-0 left-0 top-[55%] h-3 bg-white" />
        <svg aria-hidden width="34" height="34" viewBox="0 0 24 24" fill="#A9D654" stroke="#1E3B16" strokeWidth="1.5" className="absolute top-[22%] left-[46%]">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        </svg>
      </div>
      <div className="p-5">
        <h2 id="point-title" className="m-0 text-base font-bold">
          {p.name}
        </h2>
        <div className="mt-1 text-sm text-muted">{[p.address, p.lga].filter(Boolean).join(", ")}</div>
        {hours ? <div className="cap mt-2">{hours}</div> : null}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <a
            className="btn ghost sm"
            href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Get directions<span className="sr-only"> (opens Google Maps)</span>
          </a>
          {p.phone ? (
            <a className="btn ghost sm" href={`tel:${p.phone}`}>
              Call pickup point
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Pickup at the farm: where to collect, once it's ready. */
function CollectFromCard({ order: o }: { order: OrderDetail }) {
  const f = o.collectFrom;
  if (!f) return null;
  const hours = hoursSummary(f.hours);
  const ready = (RANK[o.status] ?? 0) >= 4.5;
  const place = [f.address, f.lga, f.state].filter(Boolean).join(", ");
  return (
    <section aria-labelledby="farm-title" className="card p-5">
      <div className="cap">Collect at the farm</div>
      <h2 id="farm-title" className="m-0 mt-1 text-base font-bold">
        {f.farmName}
      </h2>
      <div className="mt-1 text-sm text-muted">{place}</div>
      {hours ? <div className="cap mt-2">Hands over orders: {hours}</div> : null}
      <p className="cap mt-2">
        {ready && o.collectBy
          ? `Ready now. Collect by ${dayLabel(o.collectBy)}.`
          : `We'll tell you when it's ready. You'll have ${f.collectWithinDays} days to collect.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <a
          className="btn ghost sm"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.farmName}, ${place}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Get directions<span className="sr-only"> (opens Google Maps)</span>
        </a>
        {f.phone ? (
          <a className="btn ghost sm" href={`tel:${f.phone}`}>
            Call the farm
          </a>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// W-51c View only

function ViewOnly({ order: o }: { order: OrderDetail }) {
  const r = RANK[o.status] ?? 0;
  const badge = statusBadge({ stage: stageOf(o.status), fulfilment: o.fulfilment });
  const area = o.address?.areaName ?? o.address?.lga ?? o.pickupPoint?.name;
  const rows: Array<{ title: string; at?: number | null; current?: boolean }> = [
    { title: o.fulfilment === "delivery" && o.paidAt === null ? "Order placed" : "Order placed and paid", at: o.paidAt ?? o.placedAt },
  ];
  if (r >= 3 || o.packedAt) rows.push({ title: "Accepted and packed", at: o.packedAt ?? o.acceptedAt });
  else if (r >= 2) rows.push({ title: `Accepted by ${o.farmName}`, at: o.acceptedAt });
  if (r >= 5)
    rows.push({
      title: o.fulfilment === "pickup" ? (o.pickupPoint ? "Collected from the pickup point" : "Collected from the farm") : `Delivered${area ? ` to ${area}` : ""}`,
      at: o.deliveredAt,
    });
  const current =
    o.status === "completed"
      ? null
      : ENDED.includes(o.status)
        ? o.status === "declined"
          ? "Declined by the farm · Refunded in full"
          : "Order ended · Refunded in full"
        : o.status === "disputed"
          ? "Problem reported · Farmkeke is looking into it"
          : r >= 5
            ? "Waiting for receipt to be confirmed"
            : r >= 4.5
              ? o.pickupPoint
                ? "Waiting at the pickup point"
                : "Ready to collect at the farm"
              : r >= 4
                ? o.fulfilment === "pickup"
                  ? o.pickupPoint
                    ? "On its way to the pickup point"
                    : "Being prepared at the farm"
                  : "Out for delivery"
                : r >= 2
                  ? "Being prepared"
                  : "Waiting for the farm to accept";
  if (o.status === "completed") rows.push({ title: "Receipt confirmed", at: o.confirmedAt });

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-[18px] px-5 pt-8 pb-24">
      <Link href={routes.findOrder} className="inline-flex min-h-11 w-max items-center gap-1 text-sm font-semibold">
        <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
        Find another order
      </Link>
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-pend-bg px-[18px] py-4 shadow-[inset_0_0_0_1px_#F2DDB5]">
        <Eye aria-hidden className="mt-px size-5 flex-none text-pend" strokeWidth={1.75} />
        <div className="flex-1">
          <div className="text-[15px] font-bold text-[#5E3E08]">You&apos;re viewing this order</div>
          <div className="mt-0.5 text-[13px] leading-[19px] text-[#7A5A1E]">
            {/* Orders are added to an account by the email they were placed with, never by phone number alone */}
            {o.linkEmailHint
              ? "To confirm delivery or report a problem, open it on the phone or browser you ordered on, or create an account with the same email."
              : "To confirm delivery or report a problem, open it on the phone or browser you ordered on."}
          </div>
        </div>
      </div>
      <section className="card p-6 m:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 font-display text-2xl leading-8 font-extrabold">Order {o.number}</h1>
            <div className="mt-0.5 text-sm text-muted">
              {o.farmName} · Ordered {dayLabel(o.placedAt)}
            </div>
          </div>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
        </div>
        <ol className="m-0 mt-[18px] list-none p-0 pt-3.5 shadow-[inset_0_1px_0_#EEF0EB]">
          {rows.map((row) => (
            <li key={row.title} className="flex items-center gap-3 py-[9px] text-sm">
              <span aria-hidden className="flex size-[22px] flex-none items-center justify-center rounded-full bg-forest text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span className="flex-1">
                {row.title}
                <span className="sr-only"> (done)</span>
              </span>
              {row.at ? <span className="cap">{weekdayTime(row.at)}</span> : null}
            </li>
          ))}
          {current ? (
            <li className="flex items-center gap-3 py-[9px] text-sm font-semibold" aria-current="step">
              <span aria-hidden className="size-[22px] flex-none rounded-full bg-lime shadow-[0_0_0_4px_var(--color-lime-soft)]" />
              <span className="flex-1">{current}</span>
            </li>
          ) : null}
        </ol>
        <div className="mt-3.5 flex flex-wrap justify-between gap-2 rounded-xl bg-soft px-3.5 py-3 text-sm">
          <span className="text-muted">
            {plural(o.items.length, "item")} · {naira(o.totalKobo)}
          </span>
          <span className="font-semibold text-forest">
            {o.escrow === "held"
              ? "Payment held by Farmkeke"
              : o.escrow === "released"
                ? "Paid to the farm"
                : o.escrow === "refunded"
                  ? "Refunded"
                  : o.escrow === "split"
                    ? "Part refunded"
                    : "Payment pending"}
          </span>
        </div>
      </section>
      {o.linkEmailHint ? (
        <section className="card flex flex-wrap items-center gap-4 p-[22px] m:px-4">
          <div className="min-w-[240px] flex-1 m:min-w-0">
            <h2 className="h3">Create an account to manage this order</h2>
            <p className="mt-1 text-[13px] leading-[19px] text-muted-2">
              Use {o.linkEmailHint} and this order will be added, so you can confirm it here.
            </p>
          </div>
          <ButtonLink href={routes.signUp(routes.order(o._id))} variant="lime">
            Create account
          </ButtonLink>
        </section>
      ) : null}
      <p className="m-0 text-center text-[13px] text-muted-2">
        Something wrong with this order?{" "}
        <Link href={routes.contact} className="font-semibold">
          Contact Farmkeke support
        </Link>
      </p>
    </div>
  );
}
