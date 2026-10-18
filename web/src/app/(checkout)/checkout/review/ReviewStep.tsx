"use client";

// W-25 Checkout · Review. "Pay" places the cart with checkout.place (one
// checkout, one order per farm, stock held for an hour) and opens the payment
// page. Guests get an anonymous identity on this browser first, which is what
// lets only this device confirm delivery later.
import { useMutation, useQuery } from "convex/react";
import { Lock, MapPin, Truck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { capitalise, groupByFarm, Thumb, useQuote } from "@/components/cart/parts";
import { draft, validPhone } from "@/components/checkout/draft";
import { CheckoutShell, CheckoutSkeleton, checkoutCard, checkoutH1, useCheckoutGuard } from "@/components/checkout/Shell";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/api";
import type { CheckoutPickupPoint, DeliveryWindows, PlaceResult } from "@/convex/returns/checkout";
import { errorCode, errorData, useEnsureIdentity } from "@/lib/auth";
import { quoteItems } from "@/lib/cart";
import { clock, displayPhone, naira, plural } from "@/lib/format";
import { isoDayLabel } from "@/components/orders/format";
import { routes } from "@/lib/routes";

export function ReviewStep() {
  const ready = useCheckoutGuard(4);
  return ready ? <Review /> : <CheckoutSkeleton />;
}

const ESCROW = [
  { title: "You pay Farmkeke", body: "Not the farm directly" },
  { title: "We hold it safely", body: "While the farm prepares and delivers" },
  { title: "You confirm, they're paid", body: "Problem? Report it and we step in" },
];

type Problem = { message: string; fix?: { href: string; label: string } };

function problemFor(e: unknown): Problem {
  const code = errorCode(e);
  switch (code) {
    case "TOTAL_CHANGED":
      return {
        message: `The total changed to ${naira(errorData<{ totalKobo: number }>(e)?.totalKobo)} while you were checking out. Check the new total, then pay.`,
      };
    case "WINDOW_UNAVAILABLE":
    case "WINDOW_REQUIRED":
      return {
        message: "That delivery time is no longer available. Choose another time to continue.",
        fix: { href: routes.checkoutDetails, label: "Choose another time" },
      };
    case "FULFILMENT_NOT_OFFERED":
      return {
        message: "One of the farms doesn't offer this option for an item in your cart. Choose delivery or pickup again.",
        fix: { href: routes.checkoutDelivery, label: "Change delivery or pickup" },
      };
    case "AREA_NOT_SERVED":
      return {
        message: "We don't deliver to that area yet. Choose another area, or pick up instead.",
        fix: { href: routes.checkoutDelivery, label: "Change delivery or pickup" },
      };
    case "PICKUP_POINT_REQUIRED":
      return {
        message: "That pickup point isn't taking orders right now. Choose another one.",
        fix: { href: routes.checkoutDetails, label: "Choose another pickup point" },
      };
    case "STREET_REQUIRED":
    case "LANDMARK_REQUIRED":
    case "ADDRESS_REQUIRED":
      return {
        message: "Your address is missing a street or landmark. Add it to continue.",
        fix: { href: routes.checkoutDetails, label: "Add your address" },
      };
    case "NAME_REQUIRED":
    case "INVALID_PHONE":
    case "INVALID_EMAIL":
      return {
        message: "Please check your name, phone number and email.",
        fix: { href: routes.checkout, label: "Edit contact details" },
      };
    case "BLOCKED":
      return {
        message: "This account can't place orders right now. Please contact support.",
        fix: { href: routes.contact, label: "Contact support" },
      };
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return { message: "You've started a lot of checkouts in the last hour. Wait a little, then try again." };
    default:
      return { message: "We couldn't place your order. Check your connection and try again. You haven't been charged." };
  }
}

function Review() {
  const router = useRouter();
  const d = draft.use();
  const fulfilment = d.fulfilment ?? "delivery";
  const { quote, lines, area } = useQuote(fulfilment);
  const farms = groupByFarm(lines);
  const place = useMutation(api.checkout.place);
  const ensureIdentity = useEnsureIdentity();
  const points = useQuery(api.checkout.pickupPoints, fulfilment === "pickup" ? (area ? { serviceAreaId: area.id } : {}) : "skip") as
    | CheckoutPickupPoint[]
    | undefined;
  const [now] = useState(() => Date.now());
  const windows = useQuery(
    api.checkout.deliveryWindows,
    fulfilment === "pickup" && farms.length ? { farmIds: farms.map((f) => f.farmId), now } : "skip",
  ) as DeliveryWindows | undefined;
  const point = points?.find((p) => p._id === d.pickupPointId);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  const total = quote?.totalKobo;
  const phone = validPhone(d.contact.phone);
  const farmQuote = new Map((quote?.farms ?? []).map((f) => [f.farmId, f]));
  const linePrice = new Map(
    (quote?.farms ?? []).flatMap((f) => f.lines.map((l) => [`${l.listingId}:${l.unitId}`, l] as const)),
  );

  const pay = async () => {
    if (busy || !quote || total === undefined) return;
    if (quote.changes.length > 0) {
      router.push(routes.cart);
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      await ensureIdentity();
      const result = (await place({
        items: quoteItems(lines),
        fulfilment,
        expectedTotalKobo: total,
        address:
          fulfilment === "delivery"
            ? {
                street: d.address.street,
                landmark: d.address.landmark,
                serviceAreaId: area?.id,
                latitude: d.address.latitude,
                longitude: d.address.longitude,
              }
            : undefined,
        pickupPointId: fulfilment === "pickup" ? (d.pickupPointId ?? undefined) : undefined,
        window: fulfilment === "delivery" ? (d.window ?? undefined) : undefined,
        contact: {
          name: d.contact.name,
          phone: phone ? `+234${phone}` : d.contact.phone,
          email: d.contact.email || undefined,
        },
        replaces: d.checkoutId ?? undefined,
      })) as PlaceResult;
      draft.patch({
        checkoutId: result.checkoutId,
        placed: {
          checkoutId: result.checkoutId,
          street: fulfilment === "delivery" ? d.address.street : undefined,
          pointName: point?.name,
        },
      });
      router.push(routes.pay(result.checkoutId));
    } catch (e) {
      if (errorCode(e) === "CART_CHANGED") {
        router.push(routes.cart);
        return;
      }
      setProblem(problemFor(e));
      setBusy(false);
    }
  };

  return (
    <CheckoutShell
      step={4}
      pickup={fulfilment === "pickup"}
      aside={
        <aside aria-labelledby="pay-summary" className={`${checkoutCard} p-6`}>
          <h2 id="pay-summary" className="h3 text-lg leading-[26px]">
            Payment summary
          </h2>
          <div className="mt-3.5">
            <div className="flex justify-between py-1.5 text-sm text-ink-3">
              <span>Items ({lines.length})</span>
              <span>{quote ? naira(quote.itemsTotalKobo) : "…"}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm text-ink-3">
              {fulfilment === "pickup" ? (
                <>
                  <span>Pickup</span>
                  <span className="font-semibold text-ok">No fee</span>
                </>
              ) : (
                <>
                  <span>Delivery ({plural(farms.length, "order")})</span>
                  <span>{quote ? naira(quote.deliveryFeeKobo) : "…"}</span>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between pt-3.5 shadow-[inset_0_1px_0_#EEF0EB]">
            <span className="font-semibold">Total to pay</span>
            <span className="font-display text-[26px] font-extrabold text-forest">{total !== undefined ? naira(total) : "…"}</span>
          </div>
          <Button
            variant="lime"
            size="lg"
            fullWidth
            className="mt-5 min-h-[54px]"
            icon={<Lock aria-hidden className="size-[18px]" strokeWidth={2} />}
            loading={busy}
            disabled={!quote}
            onClick={pay}
          >
            {total !== undefined ? `Pay ${naira(total)}` : "Pay"}
          </Button>
          {problem ? (
            <div role="alert" className="mt-3 rounded-xl bg-err-bg px-3.5 py-3 text-[13px] leading-[18px] text-err">
              {problem.message}{" "}
              {problem.fix ? (
                <Link href={problem.fix.href} className="font-semibold text-err underline">
                  {problem.fix.label}
                </Link>
              ) : null}
            </div>
          ) : null}
          <div className="cap mt-2.5 text-center">Card, bank transfer or USSD · Secured by Paystack</div>
          <p className="cap mt-4 text-center">
            By paying you agree to the{" "}
            <Link href={routes.legal("terms")} className="font-semibold">
              Terms of use
            </Link>{" "}
            and{" "}
            <Link href={routes.legal("refunds")} className="font-semibold">
              Refund and dispute policy
            </Link>
            .
          </p>
        </aside>
      }
    >
      <div className="flex flex-col gap-5">
        <section className={checkoutCard}>
          <div className="px-6 pt-7 pb-2 m:px-4">
            <h1 className={checkoutH1}>Check your order</h1>
            <p className="p mt-1">Make sure everything is right before you pay.</p>
          </div>
          <Block
            icon={<User className="size-5" strokeWidth={1.75} />}
            label="Contact"
            title={d.contact.name}
            detail={[phone ? displayPhone(phone) : d.contact.phone, d.contact.email].filter(Boolean).join(" · ")}
            edit={routes.checkout}
            editLabel="contact details"
          />
          {fulfilment === "delivery" ? (
            <Block
              icon={<Truck className="size-5" strokeWidth={1.75} />}
              label="Home delivery"
              title={[d.address.street, area?.name].filter(Boolean).join(", ")}
              detail={[
                d.address.landmark,
                d.window ? `${isoDayLabel(d.window.day)}, ${clock(d.window.from)} – ${clock(d.window.to)}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              edit={routes.checkoutDetails}
              editLabel="delivery address and time"
            />
          ) : (
            <Block
              icon={<MapPin className="size-5" strokeWidth={1.75} />}
              label="Pickup point"
              title={point?.name ?? "…"}
              detail={[
                point ? [point.address, point.lga].filter(Boolean).join(", ") : "",
                windows?.readyDay ? `Ready from ${isoDayLabel(windows.readyDay)}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              edit={routes.checkoutDetails}
              editLabel="pickup point"
            />
          )}
        </section>

        <section aria-label="Your orders" className={`${checkoutCard} px-6 py-2 m:px-4`}>
          {farms.map((g, gi) => {
            const fq = farmQuote.get(g.farmId);
            return (
              <div key={g.farmId}>
                <div
                  className={`flex items-center justify-between gap-3 pt-4 pb-1.5 ${gi > 0 ? "mt-1.5 shadow-[inset_0_1px_0_#EEF0EB]" : ""}`}
                >
                  <h2 className="h3 text-lg leading-[26px]">
                    Order {gi + 1} · {g.farmName}
                  </h2>
                  <span className="badge flex-none bg-canvas text-ink-3">
                    {fulfilment === "pickup" ? "Pickup · No fee" : fq ? `Delivery ${naira(fq.deliveryFeeKobo)}` : "Delivery"}
                  </span>
                </div>
                <ul className="m-0 list-none p-0">
                  {g.lines.map((l, li) => {
                    const s = linePrice.get(`${l.listingId}:${l.unitId}`);
                    return (
                      <li
                        key={`${l.listingId}:${l.unitId}`}
                        className={`flex items-center gap-3 py-2.5 text-sm ${gi === farms.length - 1 && li === g.lines.length - 1 ? "pb-[18px]" : ""}`}
                      >
                        <Thumb id={l.listingId} imageUrl={l.imageUrl} size={44} radius={10} />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{l.name}</div>
                          <div className="cap">
                            {capitalise(l.unitSingular)} × {s?.quantity ?? l.quantity}
                          </div>
                        </div>
                        <span className="font-semibold">{naira(s?.lineTotalKobo ?? l.priceKobo * l.quantity)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <section aria-labelledby="escrow-title" className={`${checkoutCard} p-6`}>
          <h2 id="escrow-title" className="h3 text-lg leading-[26px]">
            How your money is protected
          </h2>
          <ol className="m-0 mt-3.5 grid list-none grid-cols-3 gap-3 p-0 m:grid-cols-1">
            {ESCROW.map((s, i) => (
              <li key={s.title} className="rounded-[14px] bg-soft p-3.5">
                <div className="font-display text-lg font-extrabold text-lime" aria-hidden>
                  {i + 1}
                </div>
                <div className="mt-1 text-sm font-semibold">{s.title}</div>
                <div className="cap mt-0.5">{s.body}</div>
              </li>
            ))}
          </ol>
          <p className="cap mt-3.5">If a farm declines or doesn&apos;t accept within 24 hours, that order is refunded in full.</p>
        </section>
      </div>
    </CheckoutShell>
  );
}

function Block({
  icon,
  label,
  title,
  detail,
  edit,
  editLabel,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  detail: string;
  edit: string;
  editLabel: string;
}) {
  return (
    <div className="flex items-start gap-3.5 px-6 py-5 [&+&]:shadow-[inset_0_1px_0_#EEF0EB] m:px-4">
      <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-xl bg-tint text-forest">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="cap">{label}</div>
        <div className="mt-0.5 text-[15px] font-semibold">{title}</div>
        {detail ? <div className="sm">{detail}</div> : null}
      </div>
      <Link href={edit} className="-mt-3 inline-flex min-h-11 items-center text-[13px] font-semibold">
        Edit<span className="sr-only"> {editLabel}</span>
      </Link>
    </div>
  );
}
