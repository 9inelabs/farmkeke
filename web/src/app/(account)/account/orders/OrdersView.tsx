"use client";

// W-44 My orders (Active / Past tabs) and W-44b Orders empty.
import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { AccountShell, AccountTitle } from "@/components/account/AccountShell";
import { Thumb } from "@/components/cart/parts";
import { ConfirmReceiptModal } from "@/components/orders/ConfirmReceipt";
import { hm, lagosDay } from "@/components/orders/format";
import { awaitsConfirm, badgeFor, relDay, timingText } from "@/components/orders/rows";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { OrderRow } from "@/convex/returns/checkout";
import { dayMonth, naira } from "@/lib/format";
import { routes } from "@/lib/routes";

export function OrdersView() {
  return (
    <AccountShell>
      <Orders />
    </AccountShell>
  );
}

const ITEMS_RE = /^\d+ × /;
/** "2 × Puna yam + 1 more" → "Puna yam + 1 more" */
const itemsText = (summary: string) => summary.replace(ITEMS_RE, "");

function Orders() {
  const orders = useQuery(api.orders.consumer.list, {}) as OrderRow[] | undefined;
  const [tab, setTab] = useState<"active" | "past">("active");
  const [now] = useState(() => Date.now());
  const [confirming, setConfirming] = useState<string | null>(null);

  if (orders === undefined)
    return (
      <>
        <AccountTitle title="My orders" sub="Track deliveries, confirm receipt and get help with an order." />
        <Skeleton className="h-[200px] w-full" rounded={18} />
        <Skeleton className="h-[160px] w-full" rounded={18} />
      </>
    );

  const visible = orders.filter((o) => o.status !== "awaiting_payment");
  if (visible.length === 0) return <Empty />;

  const active = visible.filter((o) => o.isActive);
  const past = visible.filter((o) => !o.isActive);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = tab === "active" ? "past" : "active";
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <>
      <AccountTitle
        title="My orders"
        sub="Track deliveries, confirm receipt and get help with an order."
        aside={
          <div role="tablist" aria-label="Orders" onKeyDown={onKey} className="flex w-max gap-1 rounded-xl bg-tabs p-1">
            {(["active", "past"] as const).map((t) => (
              <button
                key={t}
                id={`tab-${t}`}
                type="button"
                role="tab"
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                className={`min-h-11 cursor-pointer rounded-[9px] border-0 px-[18px] text-sm font-semibold ${
                  tab === t ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "bg-transparent text-muted"
                }`}
              >
                {t === "active" ? `Active (${active.length})` : `Past (${past.length})`}
              </button>
            ))}
          </div>
        }
      />

      {tab === "active" ? (
        <div id="panel-active" role="tabpanel" aria-labelledby="tab-active" className="flex flex-col gap-5">
          {active.length === 0 ? (
            <p className="card sm p-5">Nothing on the way right now. Your past orders are under Past.</p>
          ) : (
            active.map((o) => <ActiveCard key={o._id} o={o} now={now} onConfirm={() => setConfirming(o._id)} />)
          )}
          {past.length > 0 ? <PastList orders={past.slice(0, 3)} total={past.length} onSeeAll={() => setTab("past")} /> : null}
        </div>
      ) : (
        <div id="panel-past" role="tabpanel" aria-labelledby="tab-past">
          {past.length === 0 ? <p className="card sm p-5">No past orders yet.</p> : <PastList orders={past} total={past.length} />}
        </div>
      )}

      {confirming ? <ConfirmReceiptModal orderId={confirming} open onClose={() => setConfirming(null)} /> : null}
    </>
  );
}

function ActiveCard({ o, now, onConfirm }: { o: OrderRow; now: number; onConfirm: () => void }) {
  const badge = badgeFor(o);
  const toConfirm = awaitsConfirm(o);
  return (
    <section aria-labelledby={`o-${o._id}`} className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1 m:min-w-0">
          <h2 id={`o-${o._id}`} className="m-0 text-base font-bold">
            {o.number} · {o.farmName}
          </h2>
          <div className="sm">
            Ordered {dayMonth(o.placedAt)} · {o.fulfilment === "pickup" ? "Pickup" : "Home delivery"} · {naira(o.totalKobo)}
          </div>
        </div>
        <span className={`badge ${badge.cls}`}>{badge.label}</span>
        {o.escrow === "held" ? <span className="badge b-held">Payment held</span> : null}
      </div>
      <div className="mt-3.5 flex gap-2">
        <Thumb id={o._id} imageUrl={o.imageUrl} size={48} radius={10} />
        {o.itemCount > 1 ? (
          <span className="flex size-12 items-center justify-center rounded-[10px] bg-soft text-xs font-semibold text-muted">
            +{o.itemCount - 1}
            <span className="sr-only"> more items</span>
          </span>
        ) : null}
      </div>
      {toConfirm ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[14px] bg-[#F7FAF1] px-4 py-3.5">
          <span className="min-w-[220px] flex-1 text-sm text-[#2E3A28] m:min-w-0">
            {o.status === "collected" ? "Collected" : "Delivered"}
            {o.deliveredAt ? ` ${relDay(lagosDay(o.deliveredAt), now)} at ${hm(o.deliveredAt)}` : ""}. Check your items, then
            confirm to release payment to the farm.
          </span>
          <ButtonLink href={routes.reportProblem(o._id)} variant="ghost" size="sm">
            There&apos;s a problem
          </ButtonLink>
          <Button variant="lime" size="sm" onClick={onConfirm}>
            I received everything
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="sm min-w-[220px] flex-1 m:min-w-0">{timingText(o, now)}</span>
          <ButtonLink href={routes.chat(o._id)} variant="ghost" size="sm">
            Message farmer
          </ButtonLink>
          <ButtonLink href={routes.order(o._id)} variant="dark" size="sm">
            Track order
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

function PastList({ orders, total, onSeeAll }: { orders: OrderRow[]; total: number; onSeeAll?: () => void }) {
  return (
    <section aria-labelledby="past-title" className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-[18px] shadow-[inset_0_-1px_0_#EEF0EB]">
        <h2 id="past-title" className="h3">
          Past orders
        </h2>
        {onSeeAll && total > orders.length ? (
          <Button variant="link" size="sm" className="text-[13px]" onClick={onSeeAll}>
            See all {total}
          </Button>
        ) : null}
      </div>
      <ul className="m-0 list-none p-0">
        {orders.map((o) => {
          const badge = badgeFor(o);
          return (
            <li key={o._id} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5 [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
              <Thumb id={o._id} imageUrl={o.imageUrl} size={48} radius={10} />
              <div className="min-w-[160px] flex-1">
                <div className="text-sm font-semibold">
                  {o.number} · {o.farmName}
                </div>
                <div className="cap">
                  {dayMonth(o.placedAt)} · {itemsText(o.summary)} · {naira(o.totalKobo)}
                </div>
              </div>
              <span className={`badge ${badge.cls}`}>{badge.label}</span>
              {o.status === "completed" ? (
                <>
                  <ButtonLink href={routes.review(o._id)} variant="ghost" size="sm">
                    Rate<span className="sr-only"> {o.number}</span>
                  </ButtonLink>
                  <ButtonLink href={routes.farm(o.farmId)} variant="ghost" size="sm">
                    Buy again<span className="sr-only"> from {o.farmName}</span>
                  </ButtonLink>
                </>
              ) : o.escrow === "refunded" || o.escrow === "split" ? (
                <ButtonLink href={routes.refund(o._id)} variant="ghost" size="sm">
                  View refund<span className="sr-only"> for {o.number}</span>
                </ButtonLink>
              ) : (
                <ButtonLink href={routes.order(o._id)} variant="ghost" size="sm">
                  Details<span className="sr-only"> of {o.number}</span>
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Empty() {
  return (
    <>
      <AccountTitle title="My orders" />
      <section className="card flex flex-col items-center gap-3.5 px-8 py-16 text-center m:px-5 m:py-12">
        <span aria-hidden className="flex size-20 items-center justify-center rounded-3xl bg-tint text-forest">
          <Package className="size-9" strokeWidth={1.5} />
        </span>
        <h2 className="m-0 mt-1 font-display text-2xl leading-8 font-extrabold">Your first order starts here</h2>
        <p className="p max-w-[420px]">
          When you buy from a farm, you&apos;ll follow it here, from the farm accepting to the rider at your door.
        </p>
        <ButtonLink href={routes.shop} variant="lime" className="mt-1.5 text-sm">
          Start shopping
        </ButtonLink>
      </section>
      <section className="card flex flex-wrap items-center gap-4 px-6 py-5">
        <div className="min-w-[240px] flex-1 m:min-w-0">
          <div className="text-[15px] font-semibold">Ordered as a guest before you signed up?</div>
          <div className="sm mt-0.5">Find it with the order number and phone number, then add it to your account.</div>
        </div>
        <ButtonLink href={routes.findOrder} variant="ghost" className="text-sm">
          Find my order
        </ButtonLink>
      </section>
    </>
  );
}
