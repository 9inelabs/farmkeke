"use client";

// Product card from W-01 (also used on category, search, farm, saved items).
// The "+" button adds one of the listing's first unit and opens the mini-cart.
// Listings sold in several units go to the product page to choose instead.
// Shows the farm with its verified tick, the freshness badge, the distance
// once the shopper's area is known, and a sold-out state.
import { useConvex } from "convex/react";
import { BadgeCheck, Leaf, Loader2, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/api";
import type { ListingForCart, ListingSummary } from "@/convex/returns/common";
import { cart, miniCart } from "@/lib/cart";
import { naira, tintFor } from "@/lib/format";
import { m, pressable } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { Skeleton } from "@/components/ui/Skeleton";
import { distanceText } from "./live";

export function ProductCard({
  item,
  freshness,
  farmName,
  showFarm = true,
  variant = "full",
  priority = false,
}: {
  item: ListingSummary;
  /** Overrides item.freshness, e.g. "Harvested today" */
  freshness?: string;
  farmName?: string;
  /** W-07 lists one farm's products, so the farm line is left out there. */
  showFarm?: boolean;
  /** "mini": the W-06 "More from" card (photo, name, price; the whole card is a link). */
  variant?: "full" | "mini";
  priority?: boolean;
}) {
  const farm = farmName ?? item.farmName;
  const fresh = freshness ?? item.freshness ?? undefined;
  const soldOut = item.inStock === false;
  const distance = distanceText(item.distanceKm);
  const photo = item.imageUrl ? (
    <Image
      src={item.imageUrl}
      alt=""
      fill
      sizes="(max-width: 760px) 50vw, 300px"
      className={`object-cover ${soldOut ? "opacity-60" : ""}`}
      priority={priority}
    />
  ) : (
    <Leaf aria-hidden className="size-11" strokeWidth={1.3} />
  );
  const price = (
    <div className="min-w-0 font-display text-[17px] leading-[22px] font-extrabold text-forest m:text-[15px] m:leading-5">
      {naira(item.priceKobo)}{" "}
      <span className="font-sans text-xs font-medium text-subtle m:block m:truncate m:text-[11px] m:leading-[15px]">/ {item.unit}</span>
    </div>
  );

  if (variant === "mini") {
    return (
      <Link
        href={routes.product(item.id)}
        className="flex flex-col gap-2.5 rounded-2xl bg-surface p-2.5 text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-ink"
      >
        <span
          className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[11px] text-[rgba(30,59,22,0.32)]"
          style={{ background: tintFor(item.id) }}
        >
          {photo}
          {soldOut ? <span className="badge absolute top-2 left-2 bg-white text-ink-3">Sold out</span> : null}
        </span>
        <span className="block px-1">
          <span className="block truncate text-[15px] leading-5 font-semibold m:text-sm">{item.name}</span>
          <span className="mt-1.5 block">{price}</span>
        </span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-surface p-2.5 shadow-[inset_0_0_0_1px_var(--color-line)] m:gap-2 m:rounded-[14px] m:p-2">
      <Link
        href={routes.product(item.id)}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[11px] text-[rgba(30,59,22,0.32)]"
        style={{ background: tintFor(item.id) }}
        aria-label={soldOut ? `${item.name} (sold out)` : item.name}
      >
        {photo}
        {soldOut ? (
          <span className="badge absolute top-2 left-2 bg-white text-ink-3">Sold out</span>
        ) : fresh ? (
          <span className="badge absolute top-2 left-2 bg-white text-forest">{fresh}</span>
        ) : null}
      </Link>
      <div className="px-1">
        <Link href={routes.product(item.id)} className="block truncate text-[15px] leading-5 font-semibold text-ink m:text-sm">
          {item.name}
        </Link>
        {showFarm && farm ? (
          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs leading-4 text-muted-2 m:text-[11px]">
            <span className="truncate">{farm}</span>
            {item.farmVerified !== false ? (
              <BadgeCheck aria-label="Verified farm" role="img" className="size-[13px] flex-none text-forest" strokeWidth={2} />
            ) : null}
            {distance ? <span className="flex-none">· {distance}</span> : null}
          </div>
        ) : null}
        <div className="mt-2.5 flex items-end justify-between gap-2 m:mt-2 m:gap-1.5">
          {price}
          {soldOut ? (
            <span className="inline-flex h-11 flex-none items-center rounded-[11px] bg-soft px-3 text-sm font-semibold text-muted m:h-9 m:rounded-[10px] m:px-2 m:text-xs">
              Sold out
            </span>
          ) : (
            <AddToCartButton listingId={item.id} name={item.name} />
          )}
        </div>
      </div>
    </div>
  );
}

export function AddToCartButton({ listingId, name }: { listingId: string; name: string }) {
  const convex = useConvex();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const l = (await convex.query(api.checkout.listingForCart, { listingId })) as ListingForCart | null;
      const unit = l?.units[0];
      if (!l || !l.available || !unit || unit.stock < 1) {
        router.push(routes.product(listingId));
        return;
      }
      if (l.units.length > 1) {
        router.push(routes.product(listingId));
        return;
      }
      cart.add({
        listingId: l.id,
        unitId: unit.unitId,
        quantity: Math.max(1, unit.minOrder),
        priceKobo: unit.priceKobo,
        name: l.name,
        unitSingular: unit.singular,
        unitPlural: unit.plural,
        farmId: l.farmId,
        farmName: l.farmName,
        imageUrl: l.imageUrl,
        minOrder: unit.minOrder,
        stock: unit.stock,
      });
      miniCart.open();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <m.button
      type="button"
      onClick={add}
      aria-label={error ? `Couldn't add ${name}. Try again` : `Add ${name} to cart`}
      aria-busy={busy || undefined}
      className="inline-flex h-11 flex-none cursor-pointer items-center gap-1 rounded-[11px] bg-lime px-3 text-sm font-semibold text-ink hover:bg-lime-hover m:size-10 m:justify-center m:rounded-full m:px-0"
      {...pressable}
    >
      {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Plus aria-hidden className="size-[18px]" strokeWidth={2.25} />}
      <span className="m:sr-only">{error ? "Retry" : "Add"}</span>
    </m.button>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-surface p-2.5 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <Skeleton className="aspect-[4/3] w-full" rounded={11} />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-1 flex items-end justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-11 w-16" rounded={11} />
        </div>
      </div>
    </div>
  );
}
