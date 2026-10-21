"use client";

// W-22 Checkout · Delivery or pickup. Home delivery is priced per order once
// the farm accepts (the shopper pays the bill then); pickup is at each farm
// and paid now. Items a farm only offers one way block the other.
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
import type { QuoteBlocker } from "@/convex/returns/checkout";
import { areaPicker } from "@/lib/area";
import { naira } from "@/lib/format";
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
  const [error, setError] = useState<string | null>(null);

  const farms = groupByFarm(lines);
  const deliveryBlocked = quote?.deliveryBlockers ?? [];
  const pickupBlocked = quote?.pickupBlockers ?? [];
  // Where each farm is, roughly ("Owerri North, Imo"); the exact address comes when it's ready
  const farmAreas = (quote?.farms ?? []).map((f) => (f.collectionArea ? `${f.farmName}, ${f.collectionArea}` : f.farmName)).join(" · ");
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
      setError("Choose your area first, so we know where to send the rider.");
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
      <section className={`${checkoutCard} p-8 m:p-4`}>
        <h1 className={checkoutH1}>How do you want to get your order?</h1>
        <p className="p mt-1.5">{appliesTo}</p>
        <div role="radiogroup" aria-label="Delivery or pickup" className="mt-6 flex flex-col gap-3 m:mt-4 m:gap-2.5" onKeyDown={onKey}>
          <Option
            id="opt-delivery"
            on={mode === "delivery"}
            onPick={() => pick("delivery")}
            icon={<Truck aria-hidden className="size-6" strokeWidth={1.75} />}
            title="Home delivery"
            price="Priced later"
            body="Nothing to pay now. When the farm accepts, we price the delivery and send your bill by email, text and in the app. Once you pay, a Farmkeke rider brings your order."
            meta={
              deliveryBlocked.length > 0
                ? `Not available for ${blockerText(deliveryBlocked)}`
                : area
                  ? `Delivering to ${area.name}, ${area.state}`
                  : "Choose your area so we know where to send the rider"
            }
          />
          <Option
            id="opt-pickup"
            on={mode === "pickup"}
            onPick={() => pick("pickup")}
            icon={<MapPin aria-hidden className="size-6" strokeWidth={1.75} />}
            title={
              <>
                Pickup at the farm{" "}
                <span className="ml-1.5 inline-flex h-[22px] items-center rounded-md bg-lime-soft px-2 align-middle text-[11px] font-bold text-forest m:ml-1 m:h-5 m:px-1.5 m:text-[10px]">
                  No fee
                </span>
              </>
            }
            price={naira(0)}
            body="Pay now and collect from the farm. When it's ready, we send the address and your 4-digit pickup code. You have 3 days to collect."
            meta={pickupBlocked.length > 0 ? `Not available for ${blockerText(pickupBlocked)}` : farmAreas}
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
          <Button variant="lime" size="lg" className="min-h-[54px] min-w-[220px] px-6 m:min-h-12 m:min-w-0 m:flex-1 m:max-w-[240px]" onClick={proceed}>
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
      className={`flex w-full cursor-pointer items-start gap-4 rounded-2xl border-0 p-5 text-left text-ink transition-colors duration-150 m:gap-3 m:rounded-[14px] m:p-3.5 ${
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
      <span className="tile m:hidden" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex justify-between gap-3 m:flex-col m:gap-0">
          <span className="text-base font-bold m:flex m:items-center m:gap-1.5 m:text-[15px] m:leading-[21px]">
            <span className="hidden m:inline-flex m:text-forest [&>svg]:size-4" aria-hidden>
              {icon}
            </span>
            {title}
          </span>
          <span className="font-display text-base font-extrabold m:text-[13px] m:leading-[18px] m:text-forest">{price}</span>
        </span>
        <span className="mt-1 block text-sm text-muted m:text-[13px] m:leading-[19px]">{body}</span>
        {meta ? <span className="mt-1.5 block text-xs text-subtle m:mt-1 m:text-[11.5px]">{meta}</span> : null}
      </span>
    </button>
  );
}
