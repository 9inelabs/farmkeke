"use client";

// W-22 Checkout · Delivery or pickup. Fees per farm come from checkout.quote
// for the chosen area; items a farm only offers one way block the other.
import { useQuery } from "convex/react";
import { MapPin, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { groupByFarm, useQuote } from "@/components/cart/parts";
import { draft } from "@/components/checkout/draft";
import {
  CheckoutShell,
  CheckoutSkeleton,
  checkoutCard,
  checkoutH1,
  FarmsSummary,
  StepActions,
} from "@/components/checkout/Shell";
import { useCheckoutGuard } from "@/components/checkout/Shell";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/api";
import type { CheckoutPickupPoint, QuoteBlocker } from "@/convex/returns/checkout";
import { areaPicker } from "@/lib/area";
import { naira, plural } from "@/lib/format";
import { routes } from "@/lib/routes";

export function DeliveryStep() {
  const ready = useCheckoutGuard(2);
  return ready ? <Choose /> : <CheckoutSkeleton />;
}

const blockerText = (b: QuoteBlocker[]) =>
  b.map((x) => `${x.name} (${x.farmName})`).join(", ");

function Choose() {
  const router = useRouter();
  const [mode, setMode] = useState<"delivery" | "pickup">(() => draft.get().fulfilment ?? "delivery");
  const { quote, lines, area } = useQuote("delivery");
  const points = useQuery(
    api.checkout.pickupPoints,
    area ? { serviceAreaId: area.id } : {},
  ) as CheckoutPickupPoint[] | undefined;
  const [error, setError] = useState<string | null>(null);

  const farms = groupByFarm(lines);
  const deliveryBlocked = quote?.deliveryBlockers ?? [];
  const pickupBlocked = quote?.pickupBlockers ?? [];
  const deliveryFee = quote?.area ? quote.deliveryFeeKobo : null;
  const inArea = area ? (points ?? []).filter((p) => p.lga === area.lga).length : 0;
  const pointsLine =
    points === undefined
      ? ""
      : area && inArea > 0
        ? `${plural(inArea, "pickup point")} in ${area.name}`
        : points.length > 0
          ? `${plural(points.length, "pickup point")}${area ? ` in ${area.state}` : ""}`
          : "No pickup points open yet";
  const appliesTo =
    farms.length === 1 ? "This applies to your whole order." : farms.length === 2 ? "This applies to both farms in your cart." : `This applies to all ${farms.length} farms in your cart.`;

  const pick = (m: "delivery" | "pickup") => {
    setMode(m);
    setError(null);
  };
  // Arrow keys move between the two options (radio group behaviour).
  const onKey = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const next = mode === "delivery" ? "pickup" : "delivery";
      pick(next);
      document.getElementById(`opt-${next}`)?.focus();
    }
  };

  const proceed = () => {
    if (mode === "delivery" && deliveryBlocked.length > 0) {
      setError(`Home delivery isn't offered for ${blockerText(deliveryBlocked)}. Choose pickup, or remove it from your cart.`);
      return;
    }
    if (mode === "pickup" && pickupBlocked.length > 0) {
      setError(`Pickup isn't offered for ${blockerText(pickupBlocked)}. Choose home delivery, or remove it from your cart.`);
      return;
    }
    if (mode === "delivery" && !area) {
      setError("Choose your area first, so we can work out the delivery fee.");
      areaPicker.open();
      return;
    }
    draft.patch({ fulfilment: mode });
    router.push(routes.checkoutDetails);
  };

  return (
    <CheckoutShell
      step={2}
      aside={<FarmsSummary lines={lines} quote={quote} fulfilment={mode} showMethod={false} />}
    >
      <section className={`${checkoutCard} p-8 m:p-5`}>
        <h1 className={checkoutH1}>How do you want to get your order?</h1>
        <p className="p mt-1.5">{appliesTo}</p>
        <div role="radiogroup" aria-label="Delivery or pickup" className="mt-6 flex flex-col gap-3" onKeyDown={onKey}>
          <Option
            id="opt-delivery"
            on={mode === "delivery"}
            onPick={() => pick("delivery")}
            icon={<Truck aria-hidden className="size-6" strokeWidth={1.75} />}
            title="Home delivery"
            price={deliveryFee === null ? (area ? "…" : "Choose area") : naira(deliveryFee)}
            body="A Farmkeke rider brings each farm's order to your door. Usually same day or next day."
            meta={
              deliveryBlocked.length > 0
                ? `Not available for ${blockerText(deliveryBlocked)}`
                : quote?.area
                  ? quote.farms.map((f) => `${f.farmName} ${naira(f.deliveryFeeKobo)}`).join(" · ")
                  : area
                    ? ""
                    : "Choose your area to see the delivery fee"
            }
          />
          <Option
            id="opt-pickup"
            on={mode === "pickup"}
            onPick={() => pick("pickup")}
            icon={<MapPin aria-hidden className="size-6" strokeWidth={1.75} />}
            title={
              <>
                Pickup point{" "}
                <span className="ml-1.5 inline-flex h-[22px] items-center rounded-md bg-lime-soft px-2 align-middle text-[11px] font-bold text-forest">
                  No fee
                </span>
              </>
            }
            price={naira(0)}
            body="Collect from a Farmkeke pickup point near you with your pickup code. Ready the day after the farms accept."
            meta={pickupBlocked.length > 0 ? `Not available for ${blockerText(pickupBlocked)}` : pointsLine}
          />
        </div>
        {mode === "delivery" && !area ? (
          <Button variant="ghost" size="sm" className="mt-3" onClick={areaPicker.open}>
            Choose your area
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="field-error mt-4">
            {error}
          </p>
        ) : null}
        <StepActions back={routes.checkout}>
          <Button variant="lime" size="lg" className="min-h-[54px] min-w-[220px] px-6 m:min-w-0" onClick={proceed}>
            Continue
          </Button>
        </StepActions>
      </section>
    </CheckoutShell>
  );
}

function Option({
  id,
  on,
  onPick,
  icon,
  title,
  price,
  body,
  meta,
}: {
  id: string;
  on: boolean;
  onPick: () => void;
  icon: React.ReactNode;
  title: React.ReactNode;
  price: string;
  body: string;
  meta: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={on}
      tabIndex={on ? 0 : -1}
      onClick={onPick}
      className={`flex w-full cursor-pointer items-start gap-4 rounded-2xl border-0 p-5 text-left text-ink transition-colors duration-150 m:gap-3 m:p-4 ${
        on ? "bg-[#F7FAF1] shadow-[inset_0_0_0_2px_var(--color-forest)]" : "bg-surface shadow-[inset_0_0_0_1px_#DCE0D6]"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-full ${
          on ? "shadow-[inset_0_0_0_1.5px_var(--color-forest)]" : "shadow-[inset_0_0_0_1.5px_var(--color-radio)]"
        }`}
      >
        {on ? <span className="size-3 rounded-full bg-forest" /> : null}
      </span>
      <span className="tile" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex justify-between gap-3">
          <span className="text-base font-bold">{title}</span>
          <span className="font-display text-base font-extrabold">{price}</span>
        </span>
        <span className="mt-1 block text-sm text-muted">{body}</span>
        {meta ? <span className="mt-1.5 block text-xs text-subtle">{meta}</span> : null}
      </span>
    </button>
  );
}
