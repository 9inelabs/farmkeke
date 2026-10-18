"use client";

// Small pieces shared by the mini-cart (W-08), cart (W-20) and checkout
// summaries (W-21 to W-25): product thumbnails, the quantity stepper, and the
// live cart quote from the server.
import { useQuery } from "convex/react";
import { Leaf } from "lucide-react";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { api } from "@/convex/api";
import type { Quote } from "@/convex/returns/checkout";
import { area } from "@/lib/area";
import { cart, quoteItems, useCart, type CartLine } from "@/lib/cart";
import { tintFor } from "@/lib/format";

/** "basket" → "Basket" (designs: "Basket · ₦4,500") */
export const capitalise = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** Product photo, or the tinted box with a muted leaf when there is none. */
export function Thumb({
  id,
  imageUrl,
  size,
  radius,
  dim = false,
}: {
  id: string;
  imageUrl: string | null | undefined;
  size: number;
  radius: number;
  dim?: boolean;
}) {
  return (
    <span
      aria-hidden
      className="relative flex flex-none items-center justify-center overflow-hidden text-[rgba(30,59,22,0.32)]"
      style={{ width: size, height: size, borderRadius: radius, background: tintFor(id), opacity: dim ? 0.5 : 1 }}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <Leaf className="size-[45%]" strokeWidth={1.3} />
      )}
    </span>
  );
}

/**
 * − qty + stepper. Going below the minimum order removes the line. Buttons are
 * 44px tap targets (approved difference from the designs' 32–38px).
 */
export function QtyStepper({ line, size = "md" }: { line: CartLine; size?: "sm" | "md" }) {
  const min = Math.max(1, line.minOrder);
  const atMax = line.quantity >= line.stock;
  const dec = () => cart.setQuantity(line, line.quantity - 1 < min ? 0 : line.quantity - 1);
  const inc = () => !atMax && cart.setQuantity(line, line.quantity + 1);
  const unit = line.quantity === 1 ? line.unitSingular : line.unitPlural;
  return (
    <div
      role="group"
      aria-label={`Quantity of ${line.name}`}
      className="flex h-11 flex-none items-center rounded-[11px] bg-surface shadow-[inset_0_0_0_1px_#DCE0D6]"
    >
      <button
        type="button"
        onClick={dec}
        aria-label={line.quantity - 1 < min ? `Remove ${line.name}` : `Decrease ${line.name}`}
        className={`flex h-11 min-w-11 cursor-pointer items-center justify-center border-0 bg-transparent font-semibold text-forest ${size === "sm" ? "text-base" : "text-lg"}`}
      >
        −
      </button>
      <span
        aria-live="polite"
        className={`text-center font-semibold ${size === "sm" ? "w-5 text-sm" : "w-6"}`}
      >
        {line.quantity}
        <span className="sr-only"> {unit}</span>
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={atMax}
        aria-label={atMax ? `Only ${line.stock} left` : `Increase ${line.name}`}
        className={`flex h-11 min-w-11 cursor-pointer items-center justify-center border-0 bg-transparent font-semibold text-forest disabled:cursor-not-allowed disabled:opacity-40 ${size === "sm" ? "text-base" : "text-lg"}`}
      >
        +
      </button>
    </div>
  );
}

/** Cart lines grouped by farm, in the order they were added (one order per farm). */
export function groupByFarm(lines: CartLine[]) {
  const groups = new Map<string, { farmId: string; farmName: string; lines: CartLine[] }>();
  for (const l of lines) {
    const g = groups.get(l.farmId) ?? { farmId: l.farmId, farmName: l.farmName, lines: [] };
    g.lines.push(l);
    groups.set(l.farmId, g);
  }
  return [...groups.values()];
}

/**
 * The cart checked against the server (prices, stock, fees). `undefined` while
 * loading; skipped when the cart is empty.
 */
export function useQuote(fulfilment?: "delivery" | "pickup") {
  const { lines } = useCart();
  const chosen = area.use();
  const quote = useQuery(
    api.checkout.quote,
    lines.length === 0
      ? "skip"
      : { items: quoteItems(lines), fulfilment, serviceAreaId: chosen?.id },
  ) as Quote | undefined;
  return { quote, lines, area: chosen };
}

const noop = () => () => {};
/**
 * False during server render and hydration, true after. The cart lives in
 * localStorage, so pages show a skeleton until then instead of flashing "empty".
 */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
