"use client";

// W-07 Farm profile: interactive parts (share button, listings grid with
// category chips, sort and "Show all", and the distance to the farm). The
// listings are server-rendered in the first HTML.
import { Share2 } from "lucide-react";
import { useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { api } from "@/convex/api";
import type { ListingSummary } from "@/convex/returns/common";
import type { FarmProfile } from "@/convex/returns/storefront";
import { m, pressable } from "@/lib/motion";
import { distanceText, useLive } from "./live";

export function ShareFarmButton({ name, url }: { name: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: `${name} on Farmkeke`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  };
  return (
    <m.button type="button" className="btn ghost" onClick={share} {...pressable}>
      <Share2 aria-hidden className="size-[18px]" strokeWidth={1.75} />
      <span aria-live="polite">{copied ? "Link copied" : "Share farm"}</span>
    </m.button>
  );
}

const FIRST = 6;

const freshest = (a: ListingSummary, b: ListingSummary) =>
  (b.harvestedOn ?? "").localeCompare(a.harvestedOn ?? "") || Number(b.inStock !== false) - Number(a.inStock !== false);

/** W-07 listings: category chips ("All (18)", "Vegetables (12)"), sort, and "Show all". */
export function FarmListings({
  items,
  categories = [],
}: {
  items: ListingSummary[];
  categories?: Array<{ slug: string; name: string; count: number }>;
}) {
  const [sort, setSort] = useState<"fresh" | "price">("fresh");
  const [cat, setCat] = useState<string>();
  const [all, setAll] = useState(false);
  const inCat = cat ? items.filter((i) => i.category?.slug === cat) : items;
  const sorted = [...inCat].sort(sort === "price" ? (a, b) => a.priceKobo - b.priceKobo : freshest);
  const shown = all ? sorted : sorted.slice(0, FIRST);
  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          <m.button type="button" className={`chip ${cat ? "" : "on"}`} aria-pressed={!cat} onClick={() => setCat(undefined)} {...pressable}>
            All ({items.length})
          </m.button>
          {categories.map((c) => (
            <m.button
              key={c.slug}
              type="button"
              className={`chip ${cat === c.slug ? "on" : ""}`}
              aria-pressed={cat === c.slug}
              onClick={() => setCat(cat === c.slug ? undefined : c.slug)}
              {...pressable}
            >
              {c.name} ({c.count})
            </m.button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "fresh" | "price")}
            className="h-11 rounded-[10px] border-0 bg-surface px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)] d:h-9"
          >
            <option value="fresh">Freshest first</option>
            <option value="price">Price: low to high</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-5 m:grid-cols-2 m:gap-3">
        {shown.map((p, i) => (
          <ProductCard key={p.id} item={p} showFarm={false} priority={i < 3} />
        ))}
      </div>
      {!all && inCat.length > FIRST ? (
        <div className="mt-7 flex justify-center">
          <m.button type="button" className="btn ghost" onClick={() => setAll(true)} {...pressable}>
            Show all {inCat.length} products
          </m.button>
        </div>
      ) : null}
    </>
  );
}

/** " · 4 km from you" after the farm's place, once the shopper's position is known. */
export function FarmDistance({ initial, today }: { initial: FarmProfile; today: string }) {
  const { data } = useLive(api.storefront.farm, { id: initial.id, today }, initial);
  const dist = distanceText(data?.distanceKm);
  return dist ? <>{` · ${dist} from you`}</> : null;
}
