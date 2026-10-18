"use client";

// W-56 Refund status (payments/refunds.forOrder), with the case it came from
// (disputes.forOrder) and the order's totals (orders.consumer.get).
import { useConvexAuth, useQuery } from "convex/react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { FocusMissing, FocusShell, FocusSkeleton } from "@/components/orders/FocusBits";
import { dayTime } from "@/components/orders/format";
import { useOrder } from "@/components/orders/useOrder";
import { ButtonLink } from "@/components/ui/Button";
import { Timeline, type TimelineStep } from "@/components/ui/Timeline";
import { api, type Id } from "@/convex/api";
import type { DisputeDetail, OrderDetail, RefundRow } from "@/convex/returns/orders";
import { useViewer } from "@/lib/auth";
import { naira, plural } from "@/lib/format";
import { routes } from "@/lib/routes";

/** "Card ending 4081" → "card ending 4081"; "Your bank account" → "bank account" */
const methodPhrase = (label: string) => label.replace(/^Your /, "").replace(/^\w/, (c) => c.toLowerCase());

export function RefundView({ orderId }: { orderId: string }) {
  const { isLoading } = useConvexAuth();
  const access = useOrder(orderId);
  const refunds = useQuery(api.payments.refunds.forOrder, isLoading ? "skip" : { orderId }) as RefundRow[] | undefined;
  const dispute = useQuery(api.disputes.forOrder, isLoading ? "skip" : { orderId: orderId as Id<"orders"> }) as
    | DisputeDetail
    | null
    | undefined;
  if (access.state === "loading" || refunds === undefined) return <FocusSkeleton orderId={orderId} width={720} />;
  if (access.state === "missing") return <FocusMissing orderId={orderId} />;
  const refund = refunds[refunds.length - 1];
  if (!refund)
    return (
      <FocusShell orderId={orderId} width={720}>
        <section className="card flex flex-col items-center gap-3 px-8 py-12 text-center m:px-5">
          <h1 className="m-0 font-display text-[26px] leading-[34px] font-extrabold">No refund on this order yet</h1>
          <p className="p">If a refund is decided, you&apos;ll see where it&apos;s up to here, and we&apos;ll text you.</p>
          <ButtonLink href={routes.order(orderId)} variant="ghost" className="mt-2">
            Back to order
          </ButtonLink>
        </section>
      </FocusShell>
    );
  return <Refund refund={refund} order={access.order} dispute={dispute ?? null} />;
}

function Refund({ refund: r, order: o, dispute: d }: { refund: RefundRow; order: OrderDetail; dispute: DisputeDetail | null }) {
  const { status } = useViewer();
  const sent = r.status === "processing" || r.status === "processed" || !!r.sentAt;
  const settled = r.status === "processed" && !!r.settledAt;
  const failed = r.status === "failed";
  const pill = failed ? "Delayed, we're on it" : settled ? "In your account" : sent ? "On its way to you" : "Being sent";
  const what = d
    ? d.items.map((it) => `${plural(it.quantity, it.unitLabel, it.unitLabel)} of ${it.name.toLowerCase()}`).join(", ")
    : r.reason;

  const steps: TimelineStep[] = [
    {
      key: "decided",
      title: `Decision made: ${r.kind === "part" ? "part refund" : "full refund"}`,
      detail: `${dayTime(r.decidedAt)} · ${d ? "Farmkeke support" : "Farmkeke"}`,
      state: "done",
    },
    {
      key: "sent",
      title: failed ? "Refund delayed" : "Refund sent",
      detail: failed
        ? "Something went wrong sending it. Our team is retrying and will contact you."
        : sent
          ? `${r.sentAt ? `${dayTime(r.sentAt)} · ` : ""}Back to your ${methodPhrase(r.methodLabel)}`
          : "Usually within a few minutes",
      state: sent ? "done" : "current",
    },
    {
      key: "bank",
      title: "With your bank",
      detail: sent && !settled ? "Banks can take a few working days to show it on your statement" : undefined,
      state: settled ? "done" : sent ? "current" : "todo",
    },
    { key: "account", title: "In your account", detail: r.settledAt ? dayTime(r.settledAt) : undefined, state: settled ? "done" : "todo" },
  ];

  const released = d?.decision?.releaseKobo ?? (r.kind === "part" ? Math.max(0, o.totalKobo - r.amountKobo) : 0);
  const rows: Array<[string, string]> = [
    ["Refund method", r.methodLabel],
    ["Refund reference", r.reference],
    ...(released > 0 ? ([[`Released to ${o.farmName}`, `${naira(released)} for items delivered`]] as Array<[string, string]>) : []),
    ...(o.fulfilment === "delivery" ? ([["Delivery fee", naira(o.deliveryFeeKobo)]] as Array<[string, string]>) : []),
    ["Order total", naira(o.totalKobo)],
  ];

  return (
    <FocusShell orderId={o._id} width={720}>
      <Link href={status === "signed-in" ? routes.myOrders : routes.order(o._id)} className="inline-flex min-h-11 w-max items-center gap-1 text-sm font-semibold">
        <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
        {status === "signed-in" ? "My orders" : "Back to order"}
      </Link>
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-[22px] bg-forest p-7 text-white m:p-5">
        <div>
          <div className="text-[13px] font-semibold text-lime">{d ? `Refund for case ${d.number}` : `Refund for order ${o.number}`}</div>
          <div className="mt-1.5 font-display text-[40px] leading-[48px] font-extrabold tracking-[-0.02em]">{naira(r.amountKobo)}</div>
          <div className="mt-1 text-sm text-on-forest">
            {what} · Order {o.number}
          </div>
        </div>
        <span className="inline-flex h-[30px] items-center rounded-full bg-lime px-3 text-[13px] font-bold text-forest">{pill}</span>
      </section>
      <section aria-labelledby="progress-title" className="card p-6 m:px-4">
        <h1 id="progress-title" className="m-0 font-display text-[17px] font-bold">
          Refund progress
        </h1>
        <div className="mt-[18px]">
          <Timeline steps={steps} label="Refund progress" />
        </div>
      </section>
      <section className="card px-6 py-1.5 m:px-4">
        <dl className="m-0">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-3 text-sm [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
              <dt className="text-muted-2">{k}</dt>
              <dd className="m-0 text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="card flex flex-wrap items-center gap-3.5 px-[22px] py-[18px]">
        <div className="min-w-[240px] flex-1 m:min-w-0">
          <div className="text-[15px] font-semibold">Not received after 7 working days?</div>
          <div className="cap mt-0.5">Share the refund reference with your bank, or ask us to check.</div>
        </div>
        <ButtonLink href={routes.contact} variant="dark" size="sm">
          Contact support
        </ButtonLink>
      </section>
    </FocusShell>
  );
}
