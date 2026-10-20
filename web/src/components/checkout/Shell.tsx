"use client";

// Layout and order summaries shared by the checkout steps (W-21 to W-25):
// 1160px column, the step bar, a 7/5 grid, and the summary card on the right.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { capitalise, groupByFarm, Thumb, useHydrated } from "@/components/cart/parts";
import { NARROW_WRAP } from "@/components/layout/SimpleHeaders";
import { CHECKOUT_STEPS, CheckoutSteps } from "@/components/ui/Steps";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import type { Quote } from "@/convex/returns/checkout";
import { useCart, type CartLine } from "@/lib/cart";
import { naira, plural } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { draft, looksLikeEmail, validPhone, type CheckoutDraft } from "./draft";

export const checkoutWrap = `${NARROW_WRAP} pt-8`;
export const checkoutH1 = "m-0 font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em]";
export const checkoutCard = "rounded-[20px] bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]";

export function CheckoutShell({
  step,
  pickup = false,
  children,
  aside,
}: {
  step: 1 | 2 | 3 | 4;
  /** W-24 names step 2 "Pickup" */
  pickup?: boolean;
  children: ReactNode;
  aside: ReactNode;
}) {
  const labels = pickup ? ["Contact", "Pickup", "Details", "Review and pay"] : CHECKOUT_STEPS;
  return (
    <div className={checkoutWrap}>
      <CheckoutSteps current={step} labels={labels} />
      <Reveal className="mt-7 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-7 m:grid-cols-1">
        {children}
        {aside}
      </Reveal>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className={checkoutWrap}>
      <LoadingRegion label="Loading checkout">
        <Skeleton className="h-[26px] w-[520px] max-w-full" />
        <div className="mt-7 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-7 m:grid-cols-1">
          <Skeleton className="h-[460px] w-full" rounded={20} />
          <Skeleton className="h-[320px] w-full" rounded={20} />
        </div>
      </LoadingRegion>
    </div>
  );
}

/** Which earlier step is still missing, if any. */
export function missingStep(d: CheckoutDraft, upTo: 2 | 3 | 4): string | null {
  const c = d.contact;
  if (!c.name.trim() || !validPhone(c.phone) || (c.email.trim() && !looksLikeEmail(c.email))) return routes.checkout;
  if (upTo === 2) return null;
  if (!d.fulfilment) return routes.checkoutDelivery;
  if (upTo === 3) return null;
  if (d.fulfilment === "delivery" && (!d.address.street.trim() || !d.address.landmark.trim())) return routes.checkoutDetails;
  return null;
}

/**
 * Sends the shopper back when the cart is empty or an earlier step isn't done.
 * Returns true once it's fine to show the step.
 */
export function useCheckoutGuard(step: 1 | 2 | 3 | 4) {
  const hydrated = useHydrated();
  const { lines } = useCart();
  const d = draft.use();
  const router = useRouter();
  const target = !hydrated ? null : lines.length === 0 ? routes.cart : step === 1 ? null : missingStep(d, step);
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);
  return hydrated && !target;
}

function SummaryHead({ meta }: { meta: string }) {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h2 className="h3 text-lg leading-[26px]">Order summary</h2>
        <Link href={routes.cart} className="inline-flex min-h-11 items-center text-[13px] font-semibold">
          Edit<span className="sr-only"> your cart</span>
        </Link>
      </div>
      <div className="cap -mt-2.5">{meta}</div>
    </>
  );
}

const Row = ({ label, value, valueClass }: { label: ReactNode; value: ReactNode; valueClass?: string }) => (
  <div className="flex justify-between gap-3 py-1.5 text-sm text-ink-3">
    <span>{label}</span>
    <span className={valueClass}>{value}</span>
  </div>
);

/** Prices from the server once the quote arrives, the browser cart until then. */
function priced(lines: CartLine[], quote: Quote | undefined) {
  const server = new Map(
    (quote?.farms ?? []).flatMap((f) => f.lines.map((l) => [`${l.listingId}:${l.unitId}`, l] as const)),
  );
  return lines.map((l) => {
    const s = server.get(`${l.listingId}:${l.unitId}`);
    return { ...l, priceKobo: s?.priceKobo ?? l.priceKobo, quantity: s?.quantity ?? l.quantity };
  });
}

/** W-21: every item, by farm, with "Total so far". */
export function ItemsSummary({ lines, quote }: { lines: CartLine[]; quote: Quote | undefined }) {
  const rows = priced(lines, quote);
  const groups = groupByFarm(rows);
  const items = rows.reduce((s, l) => s + l.priceKobo * l.quantity, 0);
  return (
    <aside aria-label="Order summary" className={`${checkoutCard} p-6`}>
      <SummaryHead meta={`${plural(groups.length, "farm")} · ${plural(lines.length, "item")}`} />
      <div className="mt-3.5">
        {groups.map((g, gi) => (
          <div key={g.farmId}>
            <div className={`cap font-semibold text-ink-3 ${gi > 0 ? "mt-2.5" : ""}`}>{g.farmName}</div>
            <ul className="m-0 list-none p-0">
              {g.lines.map((l) => (
                <li key={`${l.listingId}:${l.unitId}`} className="flex items-center gap-3 py-2">
                  <Thumb id={l.listingId} imageUrl={l.imageUrl} size={44} radius={10} />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold">{l.name}</div>
                    <div className="cap">
                      {capitalise(l.unitSingular)} × {l.quantity}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{naira(l.priceKobo * l.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 shadow-[inset_0_1px_0_#EEF0EB]">
        <Row label="Items" value={naira(items)} />
        <Row label="Delivery" value="Priced after the farm accepts" valueClass="text-subtle" />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between pt-3 shadow-[inset_0_1px_0_#EEF0EB]">
        <span className="font-semibold">Total so far</span>
        <span className="font-display text-[22px] font-extrabold text-forest">{naira(items)}</span>
      </div>
    </aside>
  );
}

/** W-22 to W-24: one line per farm, then the fee and the total. */
export function FarmsSummary({
  lines,
  quote,
  fulfilment,
  showMethod = true,
}: {
  lines: CartLine[];
  quote: Quote | undefined;
  fulfilment: "delivery" | "pickup" | null;
  /** Adds "· Home delivery" / "· Pickup" to the counts line (W-23, W-24) */
  showMethod?: boolean;
}) {
  const rows = priced(lines, quote);
  const groups = groupByFarm(rows);
  const items = rows.reduce((s, l) => s + l.priceKobo * l.quantity, 0);
  const meta = [
    plural(groups.length, "farm"),
    plural(lines.length, "item"),
    showMethod && fulfilment ? (fulfilment === "delivery" ? "Home delivery" : "Pickup") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <aside aria-label="Order summary" className={`${checkoutCard} p-6`}>
      <SummaryHead meta={meta} />
      <div className="mt-4">
        {groups.map((g) => (
          <Row
            key={g.farmId}
            label={`${g.farmName} (${plural(g.lines.length, "item")})`}
            value={naira(g.lines.reduce((s, l) => s + l.priceKobo * l.quantity, 0))}
          />
        ))}
      </div>
      <div className="mt-2.5 pt-2.5 shadow-[inset_0_1px_0_#EEF0EB]">
        <Row label="Items" value={naira(items)} />
        {fulfilment === "pickup" ? (
          <Row label="Pickup at the farm" value="No fee" valueClass="font-semibold text-ok" />
        ) : fulfilment === "delivery" ? (
          <Row label={`Delivery (${plural(groups.length, "order")})`} value="Added to your bill" valueClass="text-subtle" />
        ) : (
          <Row label="Delivery" value="Choose below" valueClass="text-subtle" />
        )}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between pt-3 shadow-[inset_0_1px_0_#EEF0EB]">
        <span className="font-semibold">{fulfilment === "delivery" ? "Products total" : "Total"}</span>
        <span className="font-display text-[22px] font-extrabold text-forest">{naira(items)}</span>
      </div>
      {fulfilment === "delivery" ? (
        <p className="cap mt-2.5">
          Nothing to pay now. Once the farm accepts, we price the delivery and send your bill. You&apos;ll have 12 hours to pay.
        </p>
      ) : null}
    </aside>
  );
}

/** Back link + Continue button row at the bottom of each step card. */
export function StepActions({ back, children }: { back: string; children: ReactNode }) {
  return (
    <div className="mt-7 flex items-center justify-between gap-4 pt-6 shadow-[inset_0_1px_0_#EEF0EB]">
      <Link href={back} className="inline-flex min-h-11 items-center text-sm font-semibold">
        Back
      </Link>
      {children}
    </div>
  );
}
