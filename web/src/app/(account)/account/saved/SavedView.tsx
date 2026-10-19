"use client";

// W-47 Saved items and W-47b Saved empty (favorites.list / .toggle).
// "Back in stock" comes from the server (stock returned since the last visit;
// favorites.markSeen after showing it). Sold-out items offer "Notify me", a
// per-item switch (favorites.setNotify): one email when it's back.
import { useMutation, useQuery } from "convex/react";
import { Check, Heart, Sprout } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountShell, AccountTitle } from "@/components/account/AccountShell";
import { AddListing } from "@/components/account/AddListing";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, type Id } from "@/convex/api";
import type { FavoriteItem } from "@/convex/returns/account";
import { naira, plural, tintFor, todayInLagos } from "@/lib/format";
import { routes } from "@/lib/routes";

export function SavedView() {
  return (
    <AccountShell>
      <Saved />
    </AccountShell>
  );
}

function tagFor(item: FavoriteItem, today: string, yesterday: string, back: boolean): { text: string; tone: "ok" | "err" } | null {
  if (item.unavailableReason === "sold_out") return { text: "Sold out", tone: "err" };
  if (item.unavailableReason === "unavailable") return { text: "Not available now", tone: "err" };
  if (back) return { text: "Back in stock", tone: "ok" };
  if (item.harvestedOn === today) return { text: "Harvested today", tone: "ok" };
  if (item.harvestedOn === yesterday) return { text: "Harvested yesterday", tone: "ok" };
  return null;
}

function Saved() {
  const items = useQuery(api.favorites.list, {}) as FavoriteItem[] | undefined;
  const [now] = useState(() => Date.now());
  const today = todayInLagos(new Date(now));
  const yesterday = todayInLagos(new Date(now - 86_400_000));
  // The tags shown on this visit stay while the page is open, then reset
  // (markSeen) so the next visit only shows what came back since.
  const markSeen = useMutation(api.favorites.markSeen);
  const [back, setBack] = useState<Set<string> | null>(null);
  const seen = useRef(false);
  if (items !== undefined && back === null) setBack(new Set(items.filter((i) => i.backInStock).map((i) => i.id)));
  useEffect(() => {
    if (items === undefined || seen.current) return;
    seen.current = true;
    markSeen({}).catch(() => {});
  }, [items, markSeen]);

  if (items === undefined)
    return (
      <>
        <AccountTitle title="Saved items" />
        <div className="grid grid-cols-3 gap-[18px] m:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[280px]" rounded={16} />
          ))}
        </div>
      </>
    );

  if (items.length === 0)
    return (
      <>
        <AccountTitle title="Saved items" />
        <section className="card flex flex-col items-center gap-3.5 px-8 py-16 text-center m:px-5 m:py-12">
          <span aria-hidden className="flex size-20 items-center justify-center rounded-3xl bg-tint text-forest">
            <Heart className="size-9" strokeWidth={1.5} />
          </span>
          <h2 className="m-0 mt-1 font-display text-2xl leading-8 font-extrabold">Keep a list of produce you love</h2>
          <p className="p max-w-[420px]">
            Tap the heart on any product to save it here. We&apos;ll tell you when a saved item is back in stock.
          </p>
          <ButtonLink href={routes.shop} variant="lime" className="mt-1.5 text-sm">
            Browse fresh picks
          </ButtonLink>
        </section>
      </>
    );

  return (
    <>
      <AccountTitle title="Saved items" sub={`${plural(items.length, "item")} · We'll let you know when sold-out items are back.`} />
      <ul className="m-0 grid list-none grid-cols-3 gap-[18px] p-0 m:grid-cols-2 m:gap-3">
        {items.map((it) => (
          <SavedCard key={it.id} item={it} tag={tagFor(it, today, yesterday, !!it.backInStock || !!back?.has(it.id))} />
        ))}
      </ul>
    </>
  );
}

function SavedCard({ item, tag }: { item: FavoriteItem; tag: { text: string; tone: "ok" | "err" } | null }) {
  const toggle = useMutation(api.favorites.toggle);
  const setNotify = useMutation(api.favorites.setNotify);
  const [removing, setRemoving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const on = item.notify === true;
  const soldOut = !item.available;

  const remove = async () => {
    setRemoving(true);
    try {
      await toggle({ listingId: item.id as Id<"listings"> });
    } catch {
      setRemoving(false);
    }
  };

  const notifyMe = async () => {
    setNotifying(true);
    try {
      await setNotify({ listingId: item.id as Id<"listings">, on: !on });
    } catch {
      // The switch shows the saved state, so a failed tap simply doesn't change it.
    } finally {
      setNotifying(false);
    }
  };

  return (
    <li
      className="flex flex-col gap-2.5 rounded-2xl bg-surface p-2.5 shadow-[inset_0_0_0_1px_var(--color-line)]"
      style={{ opacity: soldOut ? 0.6 : 1 }}
    >
      <Link
        href={routes.product(item.id)}
        aria-label={item.name}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[11px] text-[rgba(30,59,22,0.32)]"
        style={{ background: tintFor(item.id) }}
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill sizes="(max-width: 760px) 50vw, 300px" className="object-cover" />
        ) : (
          <Sprout aria-hidden className="size-11" strokeWidth={1.3} />
        )}
        {tag ? (
          <span className={`badge absolute top-2 left-2 bg-white ${tag.tone === "err" ? "text-err" : "text-forest"}`}>{tag.text}</span>
        ) : null}
      </Link>
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={routes.product(item.id)} className="text-[15px] font-semibold text-ink">
            {item.name}
          </Link>
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="-mt-3 -mr-1 inline-flex min-h-11 flex-none cursor-pointer items-center gap-1 border-0 bg-transparent px-1 text-xs font-semibold text-forest disabled:opacity-50"
          >
            <Heart aria-hidden className="size-5" fill="#1E3B16" strokeWidth={1.75} />
            Remove<span className="sr-only"> {item.name} from saved</span>
          </button>
        </div>
        <div className="text-xs text-muted-2">{item.farmName}</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-[17px] font-extrabold text-forest">
            {naira(item.priceKobo)} <span className="font-sans text-xs font-medium text-subtle">/ {item.unit}</span>
          </div>
          {soldOut ? (
            <Button
              variant="ghost"
              className={`text-sm ${on ? "shadow-[inset_0_0_0_2px_var(--color-forest)]" : ""}`}
              loading={notifying}
              aria-pressed={on}
              onClick={notifyMe}
            >
              {on ? <Check aria-hidden className="size-4" strokeWidth={2.25} /> : null}
              Notify me<span className="sr-only">{on ? " (on)" : " (off)"}</span>
            </Button>
          ) : (
            <AddListing listingId={item.id} name={item.name} label="Add to cart" variant="lime" size="md" />
          )}
        </div>
      </div>
    </li>
  );
}
