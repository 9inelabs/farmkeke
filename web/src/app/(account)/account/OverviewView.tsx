"use client";

// W-43 Account overview: greeting, a "was delivered" banner when an order
// waits for confirmation, three summary cards, active orders and Buy again
// (orders.consumer.recentItems: recently bought items that can still be bought).
import { useQuery } from "convex/react";
import { PackageCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccountShell, AccountTitle } from "@/components/account/AccountShell";
import { AddListing } from "@/components/account/AddListing";
import { Thumb } from "@/components/cart/parts";
import { ConfirmReceiptModal } from "@/components/orders/ConfirmReceipt";
import { firstName } from "@/components/orders/format";
import { awaitsConfirm, badgeFor, timingText } from "@/components/orders/rows";
import { Button, ButtonLink } from "@/components/ui/Button";
import { QuietBoundary } from "@/components/system/QuietBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { FavoriteItem, RecentItem, SavedAddress } from "@/convex/returns/account";
import type { OrderRow } from "@/convex/returns/checkout";
import { useViewer } from "@/lib/auth";
import { initials, LAGOS_TZ, naira, plural, tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

function greeting(now: number) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS_TZ, hour: "numeric", hour12: false }).format(now));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const LABEL = { home: "Home", work: "Work", other: "Other" } as const;

export function OverviewView() {
  return (
    <AccountShell>
      <Overview />
    </AccountShell>
  );
}

function Overview() {
  const { viewer } = useViewer();
  const [now] = useState(() => Date.now());
  const orders = useQuery(api.orders.consumer.list, {}) as OrderRow[] | undefined;
  const saved = useQuery(api.favorites.list, {}) as FavoriteItem[] | undefined;
  const addresses = useQuery(api.addresses.list, {}) as SavedAddress[] | undefined;
  const [confirming, setConfirming] = useState<string | null>(null);

  const active = (orders ?? []).filter((o) => o.isActive && o.status !== "awaiting_payment");
  const held = active.reduce((s, o) => s + (o.escrow === "held" ? o.totalKobo : 0), 0);
  const delivered = active.find(awaitsConfirm);
  const backInStock = (saved ?? []).filter((s) => s.backInStock).length;
  const availableNow = (saved ?? []).filter((s) => s.available).length;
  const def = addresses?.find((a) => a.isDefault);
  const name = firstName(viewer?.name ?? undefined);

  return (
    <>
      <AccountTitle title={`${greeting(now)}${name ? `, ${name}` : ""}`} sub="Here's what's happening with your orders." />

      {delivered ? (
        <section role="status" className="flex flex-wrap items-center gap-4 rounded-[18px] bg-forest px-[22px] py-5 text-white">
          <span aria-hidden className="tile bg-lime text-forest">
            <PackageCheck className="size-6" strokeWidth={2} />
          </span>
          <div className="min-w-[240px] flex-1 m:min-w-0">
            <div className="text-base font-bold">
              {delivered.number} from {delivered.farmName} was {delivered.status === "collected" ? "collected" : "delivered"}
            </div>
            <div className="mt-0.5 text-sm text-on-forest">Check everything arrived, then confirm so the farmer gets paid.</div>
          </div>
          <Button variant="lime" className="text-sm" onClick={() => setConfirming(delivered._id)}>
            Confirm receipt
          </Button>
        </section>
      ) : null}

      <div className="grid grid-cols-3 gap-4 m:grid-cols-1">
        <Stat href={routes.myOrders} label="Active orders" value={orders ? String(active.length) : undefined} detail={`${naira(held)} held safely`} />
        <Stat
          href={routes.saved}
          label="Saved items"
          value={saved ? String(saved.length) : undefined}
          detail={saved && backInStock > 0 ? `${backInStock} back in stock` : saved ? `${availableNow} available now` : ""}
        />
        <Stat
          href={routes.addresses}
          label="Saved addresses"
          value={addresses ? String(addresses.length) : undefined}
          detail={def ? `${LABEL[def.label]} is your default` : addresses && addresses.length ? "No default yet" : "Add one for faster checkout"}
        />
      </div>

      <section aria-labelledby="active-title" className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-[18px] shadow-[inset_0_-1px_0_#EEF0EB]">
          <h2 id="active-title" className="h3">
            Active orders
          </h2>
          <Link href={routes.myOrders} className="inline-flex min-h-11 items-center text-[13px] font-semibold">
            View all orders
          </Link>
        </div>
        {orders === undefined ? (
          <div className="p-5">
            <Skeleton className="h-11 w-full" />
          </div>
        ) : active.length === 0 ? (
          <p className="sm px-5 py-5">
            No orders on the way right now.{" "}
            <Link href={routes.shop} className="font-semibold">
              Start shopping
            </Link>
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {active.map((o) => {
              const badge = badgeFor(o);
              return (
                <li key={o._id} className="flex flex-wrap items-center gap-3.5 px-5 py-4 [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
                  <span
                    aria-hidden
                    className="flex size-11 flex-none items-center justify-center rounded-full font-display text-[13px] font-bold text-forest"
                    style={{ background: tintFor(o.farmId) }}
                  >
                    {initials(o.farmName)}
                  </span>
                  <div className="min-w-[180px] flex-1">
                    <div className="text-[15px] font-semibold">
                      {o.number} · {o.farmName}
                    </div>
                    <div className="sm">
                      {plural(o.itemCount, "item")} · {naira(o.totalKobo)} · {timingText(o, now)}
                    </div>
                  </div>
                  <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  {awaitsConfirm(o) ? (
                    <Button variant="lime" size="sm" onClick={() => setConfirming(o._id)}>
                      Confirm receipt
                    </Button>
                  ) : (
                    <ButtonLink href={routes.order(o._id)} variant="ghost" size="sm">
                      Track<span className="sr-only"> {o.number}</span>
                    </ButtonLink>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <QuietBoundary>
        <BuyAgain />
      </QuietBoundary>

      {confirming ? <ConfirmReceiptModal orderId={confirming} open onClose={() => setConfirming(null)} /> : null}
    </>
  );
}

function Stat({ href, label, value, detail }: { href: string; label: string; value?: string; detail: string }) {
  return (
    <Link href={href} className="card block p-5 text-ink hover:text-ink">
      <div className="cap">{label}</div>
      {value === undefined ? (
        <Skeleton className="mt-2 h-8 w-12" />
      ) : (
        <div className="mt-1 font-display text-[28px] font-extrabold">{value}</div>
      )}
      <div className="sm mt-0.5">{detail}</div>
    </Link>
  );
}

/** Recently bought items that can still be bought, newest first (three, as designed). */
function BuyAgain() {
  const items = useQuery(api.orders.consumer.recentItems, { limit: 3 }) as RecentItem[] | undefined;
  if (items === undefined || items.length === 0) return null;
  return (
    <section aria-labelledby="again-title" className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-[18px] shadow-[inset_0_-1px_0_#EEF0EB]">
        <h2 id="again-title" className="h3">
          Buy again
        </h2>
        <Link href={routes.shop} className="inline-flex min-h-11 items-center text-[13px] font-semibold">
          Shop all
        </Link>
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 px-5 pt-4 pb-5 m:grid-cols-1">
        {items.map((it) => (
          <li key={it.listingId} className="flex items-center gap-3 rounded-[14px] bg-soft p-2.5">
            <Thumb id={it.listingId} imageUrl={it.imageUrl} size={52} radius={12} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{it.name}</div>
              <div className="cap">
                {naira(it.priceKobo)} / {it.unitSingular}
              </div>
            </div>
            <AddListing listingId={it.listingId} name={it.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}
