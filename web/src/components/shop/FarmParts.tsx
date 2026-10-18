"use client";

// W-07 Farm profile: interactive parts (share button, listings grid with sort
// and "Show all"). The listings are server-rendered in the first HTML.
import { Share2 } from "lucide-react";
import { useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ListingSummary } from "@/convex/returns/common";
import { m, pressable } from "@/lib/motion";

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

export function FarmListings({ items, freshness }: { items: ListingSummary[]; freshness: Record<string, string> }) {
  const [sort, setSort] = useState<"fresh" | "price">("fresh");
  const [all, setAll] = useState(false);
  const sorted = sort === "price" ? [...items].sort((a, b) => a.priceKobo - b.priceKobo) : items;
  const shown = all ? sorted : sorted.slice(0, FIRST);
  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="chip on" aria-current="true">
            All ({items.length})
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "fresh" | "price")}
            className="h-10 rounded-[10px] border-0 bg-surface px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]"
          >
            <option value="fresh">Freshest first</option>
            <option value="price">Price: low to high</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-5 m:grid-cols-2 m:gap-3">
        {shown.map((p, i) => (
          <ProductCard key={p.id} item={p} freshness={freshness[p.id]} priority={i < 3} />
        ))}
      </div>
      {!all && items.length > FIRST ? (
        <div className="mt-7 flex justify-center">
          <m.button type="button" className="btn ghost" onClick={() => setAll(true)} {...pressable}>
            Show all {items.length} products
          </m.button>
        </div>
      ) : null}
    </>
  );
}
