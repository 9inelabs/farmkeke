// Checkout progress (W-21 to W-25): Contact → Delivery → Details → Review and pay.
// On phones only the numbers show, with the current step's name read aloud.
import { Check } from "lucide-react";
import { Fragment } from "react";

export const CHECKOUT_STEPS = ["Contact", "Delivery", "Details", "Review and pay"] as const;

export function CheckoutSteps({
  current,
  labels = CHECKOUT_STEPS,
}: {
  current: 1 | 2 | 3 | 4;
  /** Step names; W-24 names step 2 "Pickup" when pickup was chosen. */
  labels?: readonly string[];
}) {
  return (
    <nav aria-label="Checkout steps" className="flex items-center gap-2.5">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "cur" : "todo";
        return (
          <Fragment key={label}>
            {i > 0 ? <span aria-hidden className="h-px w-9 flex-none bg-line-3 m:w-4" /> : null}
            <span
              aria-current={state === "cur" ? "step" : undefined}
              className={`flex items-center gap-2 text-sm font-semibold whitespace-nowrap ${
                state === "done" ? "text-forest" : state === "cur" ? "text-ink" : "text-[#9A9E95]"
              }`}
            >
              <span
                className={`flex size-[26px] items-center justify-center rounded-full text-xs font-bold ${
                  state === "done" ? "bg-forest text-white" : state === "cur" ? "bg-lime text-ink" : "bg-[#ECEEE8] text-muted-2"
                }`}
              >
                {state === "done" ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : n}
              </span>
              <span className={state === "cur" ? "m:sr-only" : "m:hidden"}>
                {label}
                {state === "done" ? <span className="sr-only"> (done)</span> : null}
              </span>
            </span>
          </Fragment>
        );
      })}
    </nav>
  );
}
