"use client";

// W-06 Product detail: interactive parts. The gallery with Save, and the
// buy box (unit choice, quantity stepper, add to cart, delivery rows).
// Both are server-rendered first, so the product name, price and stock are
// in the HTML for search engines.
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, Calendar, Heart, Minus, Plus, ShieldCheck, Sprout, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { api, type Id } from "@/convex/api";
import type { ProductDetail } from "@/convex/returns/storefront";
import { useViewer } from "@/lib/auth";
import { cart, miniCart } from "@/lib/cart";
import { naira, tintFor } from "@/lib/format";
import { m, pressable } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { distanceText, useShopper } from "./live";

/**
 * storefront.product asked again with the shopper's area (delivery fee) and
 * position (farm distance). One subscription, shared by every caller.
 */
function useProductForArea(id: string, today: string) {
  const { chosen, point } = useShopper();
  const data = useQuery(
    api.storefront.product,
    chosen ? { id, today, serviceAreaId: chosen.id, ...point } : "skip",
  ) as ProductDetail | null | undefined;
  return { chosen, data: data && "farm" in data ? data : undefined };
}

/** " · 4 km from you" once the shopper's position is known (W-06 farm card). */
export function FarmDistance({ id, today, after = "" }: { id: string; today: string; after?: string }) {
  const { data } = useProductForArea(id, today);
  const dist = distanceText(data?.farm.distanceKm);
  return dist ? <>{` · ${dist}${after}`}</> : null;
}

export function ProductGallery({
  id,
  name,
  photos,
  freshness,
  canSave,
}: {
  id: string;
  name: string;
  photos: string[];
  freshness?: string;
  canSave: boolean;
}) {
  const [index, setIndex] = useState(0);
  const current = photos[index];
  return (
    <div>
      <div
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl text-[rgba(107,59,44,0.35)]"
        style={{ background: tintFor(id) }}
      >
        {current ? (
          <Image src={current} alt={`${name}, photo ${index + 1} of ${photos.length}`} fill priority sizes="(max-width: 760px) 100vw, 700px" className="object-cover" />
        ) : (
          <Sprout aria-hidden className="size-16 text-[rgba(30,59,22,0.32)]" strokeWidth={1.3} />
        )}
        {freshness ? <span className="badge absolute top-4 left-4 bg-white text-forest">{freshness}</span> : null}
        {canSave ? <SaveButton listingId={id} /> : null}
        {photos.length > 1 ? (
          <span className="absolute right-4 bottom-4 rounded-full bg-[rgba(26,26,26,0.7)] px-2.5 py-1 text-xs font-semibold text-white">
            {index + 1} / {photos.length}
          </span>
        ) : null}
      </div>
      {photos.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {photos.slice(0, 8).map((p, i) => (
            <button
              key={p}
              type="button"
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={`relative aspect-square cursor-pointer overflow-hidden rounded-[14px] border-0 ${
                i === index ? "shadow-[inset_0_0_0_2px_var(--color-forest)]" : ""
              }`}
              style={{ background: tintFor(p) }}
            >
              <Image src={p} alt="" fill sizes="160px" className={`object-cover ${i === index ? "p-[2px] rounded-[14px]" : ""}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Save / Saved. Only signed-in shoppers can save; others are sent to sign in. */
function SaveButton({ listingId }: { listingId: string }) {
  const { status } = useViewer();
  const pathname = usePathname();
  const saved = useQuery(api.favorites.isSaved, status === "signed-in" ? { listingId } : "skip") as boolean | undefined;
  const toggle = useMutation(api.favorites.toggle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const cls =
    "absolute top-4 right-4 inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-white px-4 text-sm font-semibold text-ink hover:bg-soft hover:text-ink";

  if (status === "loading") {
    return (
      <button type="button" className={cls} disabled aria-busy>
        <Heart aria-hidden className="size-5" strokeWidth={1.75} />
        Save
      </button>
    );
  }
  if (status !== "signed-in") {
    return (
      <Link href={routes.signIn(pathname)} className={cls} aria-label="Sign in to save this to your list">
        <Heart aria-hidden className="size-5" strokeWidth={1.75} />
        Save
      </Link>
    );
  }
  const on = saved === true;
  return (
    <m.button
      type="button"
      className={cls}
      aria-pressed={on}
      aria-busy={busy || saved === undefined || undefined}
      disabled={busy || saved === undefined}
      onClick={async () => {
        setBusy(true);
        setError(false);
        try {
          await toggle({ listingId: listingId as Id<"listings"> });
        } catch {
          setError(true);
        } finally {
          setBusy(false);
        }
      }}
      {...pressable}
    >
      <Heart aria-hidden className={`size-5 ${on ? "fill-error text-error" : ""}`} strokeWidth={1.75} />
      {error ? "Try again" : on ? "Saved" : "Save"}
    </m.button>
  );
}

export function BuyBox({
  product,
  harvestedText,
  today,
  subtype,
}: {
  product: ProductDetail;
  harvestedText?: string;
  today: string;
  /** The subtype's display name, e.g. "Tomatoes" */
  subtype?: string;
}) {
  const units = product.units;
  const firstInStock = Math.max(0, units.findIndex((u) => u.stock > 0));
  const [unitIndex, setUnitIndex] = useState(firstInStock);
  const unit = units[unitIndex];
  const minQty = Math.max(1, unit?.minOrder ?? 1);
  const [qty, setQty] = useState(minQty);
  const soldOut = !unit || unit.stock < minQty;
  const buyable = product.available && !soldOut;
  const farm = product.farm;

  const pick = (i: number) => {
    setUnitIndex(i);
    setQty(Math.max(1, units[i]?.minOrder ?? 1));
  };

  const add = () => {
    if (!unit || !buyable) return;
    cart.add({
      listingId: product.id,
      unitId: unit.unitId,
      quantity: qty,
      priceKobo: unit.priceKobo,
      name: product.name,
      unitSingular: unit.singular,
      unitPlural: unit.plural,
      farmId: farm.id,
      farmName: farm.name,
      imageUrl: product.photos[0] ?? null,
      minOrder: unit.minOrder,
      stock: unit.stock,
    });
    miniCart.open();
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap gap-2">
          {product.category ? <span className="badge b-fresh">{product.category.name}</span> : null}
          {subtype ? <span className="badge b-fresh">{subtype}</span> : null}
          {!product.available ? (
            <span className="badge b-grey">Not available right now</span>
          ) : soldOut ? (
            <span className="badge b-err">Sold out</span>
          ) : (
            <span className="badge b-ok">
              In stock · {unit.stock} {unit.stock === 1 ? unit.singular : unit.plural} left
            </span>
          )}
        </div>
        <h1 className="h1 mt-3">{product.name}</h1>
        <Link href={routes.farm(farm.id)} className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-sm font-semibold">
          {farm.name}
          {farm.verified ? <BadgeCheck role="img" aria-label="Verified farm" className="size-4 text-forest" strokeWidth={2} /> : null}
          <span className="font-medium text-muted-2">
            {farm.rating ? `· ${farm.rating.toFixed(1)} ★ (${farm.ratingCount} ${farm.ratingCount === 1 ? "review" : "reviews"}) ` : ""}· {farm.lga}
          </span>
        </Link>
      </div>

      {unit ? (
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[34px] font-extrabold tracking-[-0.02em] text-forest">{naira(unit.priceKobo)}</span>
          <span className="p">per {unit.singular}</span>
        </div>
      ) : null}

      {units.length > 0 ? (
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-sm font-semibold">Choose a size</legend>
          <div className="grid grid-cols-3 gap-2.5 m:grid-cols-2">
            {units.map((u, i) => {
              const on = i === unitIndex;
              const out = u.stock < Math.max(1, u.minOrder);
              return (
                <button
                  key={u.unitId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(i)}
                  className={`flex min-h-11 cursor-pointer flex-col items-start gap-0.5 rounded-[14px] border-0 px-3.5 py-3 text-left text-ink ${
                    on ? "bg-[#F7FAF1] shadow-[inset_0_0_0_2px_var(--color-forest)]" : "bg-surface shadow-[inset_0_0_0_1px_var(--color-line-2)]"
                  }`}
                >
                  <span className="text-sm font-semibold first-letter:uppercase">{u.singular}</span>
                  <span className="cap">
                    {naira(u.priceKobo)} · {out ? "Sold out" : u.minOrder > 1 ? `min ${u.minOrder}` : `${u.stock} left`}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {buyable ? (
        <div className="flex gap-3 m:flex-col">
          <div className="flex h-[54px] items-center rounded-[14px] bg-surface shadow-[inset_0_0_0_1px_var(--color-line-2)] m:self-start">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={qty <= minQty}
              onClick={() => setQty((q) => Math.max(minQty, q - 1))}
              className="flex h-[54px] w-[52px] cursor-pointer items-center justify-center border-0 bg-transparent text-forest disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus aria-hidden className="size-5" />
            </button>
            <span className="min-w-7 text-center text-base font-bold" aria-live="polite">
              <span className="sr-only">Quantity </span>
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={qty >= unit.stock}
              onClick={() => setQty((q) => Math.min(unit.stock, q + 1))}
              className="flex h-[54px] w-[52px] cursor-pointer items-center justify-center border-0 bg-transparent text-forest disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus aria-hidden className="size-5" />
            </button>
          </div>
          <m.button type="button" className="btn lime lg flex-1" onClick={add} {...pressable}>
            Add to cart · {naira(unit.priceKobo * qty)}
          </m.button>
        </div>
      ) : (
        <div className="rounded-[14px] bg-soft px-4 py-3.5">
          <p className="m-0 text-sm font-semibold">
            {product.available ? "This size is sold out right now" : "This product isn't available right now"}
          </p>
          <p className="cap mt-0.5">
            {product.available && units.some((u) => u.stock >= Math.max(1, u.minOrder))
              ? "Choose another size, or see similar items below."
              : "See similar items below, or check back later."}
          </p>
        </div>
      )}
      {buyable && unit.minOrder > 1 ? <p className="cap -mt-3">Minimum order: {unit.minOrder} {unit.plural}</p> : null}

      <div className="card px-[18px] py-1">
        {harvestedText ? (
          <Row icon={<Calendar aria-hidden className="mt-px size-5 flex-none text-forest" strokeWidth={1.75} />} title={harvestedText} sub="Picked to order and packed the same day" />
        ) : null}
        <DeliveryRow id={product.id} today={today} delivery={product.delivery} pickup={product.pickup} />
        <Row
          icon={<ShieldCheck aria-hidden className="mt-px size-5 flex-none text-forest" strokeWidth={1.75} />}
          title="Your payment is held until you confirm"
          sub={
            <>
              The farmer is paid only after your order arrives.{" "}
              <Link href={routes.escrow} className="font-semibold">
                How it works
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}

function Row({ icon, title, sub }: { icon: React.ReactNode; title: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5 [&+&]:shadow-[inset_0_1px_0_var(--color-line-soft)]">
      {icon}
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="cap mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function DeliveryRow({ id, today, delivery, pickup }: { id: string; today: string; delivery: boolean; pickup: boolean }) {
  const { chosen, data } = useProductForArea(id, today);
  const icon = <Truck aria-hidden className="mt-px size-5 flex-none text-forest" strokeWidth={1.75} />;
  if (!delivery) {
    return <Row icon={icon} title="Pickup only" sub="Collect for free at the farm" />;
  }
  const where = data?.deliveryArea?.name ?? chosen?.name;
  // Delivery is priced per order once the farm accepts; it's added to the bill then
  const title = where ? `Delivery to ${where}` : "Delivery by Farmkeke riders";
  return (
    <Row
      icon={icon}
      title={title}
      sub={
        pickup
          ? "Priced once the farm accepts, and added to your bill. Or collect for free at the farm."
          : "Priced once the farm accepts, and added to your bill. Pickup isn't offered for this product."
      }
    />
  );
}
