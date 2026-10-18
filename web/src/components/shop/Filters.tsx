"use client";

// Sort and filters for W-03 Category and W-04 Search, plus the W-05 phone
// filter panel. Every choice lives in the URL (?sort, get, min, max, area,
// show) so results are server-rendered; changing one navigates.
import { useQuery } from "convex/react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Drawer } from "@/components/ui/Dialog";
import { api } from "@/convex/api";
import type { CategoryListings, FarmArea, SearchResults } from "@/convex/returns/storefront";
import { naira } from "@/lib/format";
import { m, pressable } from "@/lib/motion";

export type FilterValues = {
  sort?: string;
  get?: string;
  min?: string;
  max?: string;
  area?: string;
};

type Scope = { kind: "category"; slug: string } | { kind: "search"; text: string };

const KEYS = ["q", "sort", "get", "min", "max", "area", "show", "tab"] as const;

function useNavigate(current: FilterValues & { q?: string; tab?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (changes: Partial<Record<(typeof KEYS)[number], string | undefined>>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...current, show: undefined, ...changes };
    for (const k of KEYS) {
      const v = merged[k];
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { go, pending };
}

const digits = (v: string) => v.replace(/[^\d]/g, "");
const grouped = (v?: string) => (v ? Number(digits(v)).toLocaleString("en-NG") : "");

export function SortSelect({
  value,
  options,
  current,
  label = "Sort by",
  className,
}: {
  value?: string;
  options: Array<{ value: string; label: string }>;
  current: FilterValues & { q?: string; tab?: string };
  label?: string;
  className?: string;
}) {
  const { go } = useNavigate(current);
  return (
    <label className={`flex items-center gap-2 text-sm text-muted ${className ?? ""}`}>
      {label}
      <select
        className="h-10 rounded-[10px] border-0 bg-surface px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]"
        value={value ?? ""}
        onChange={(e) => go({ sort: e.target.value || undefined })}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function areaLabel(v: string) {
  return v.split("|")[0] ?? v;
}

/** W-03 desktop sidebar (hidden on phones; the Filters button opens W-05). */
export function FilterSidebar({ current, areas }: { current: FilterValues & { q?: string }; areas: FarmArea[] }) {
  const { go, pending } = useNavigate(current);
  const [min, setMin] = useState(grouped(current.min));
  const [max, setMax] = useState(grouped(current.max));
  const delivery = current.get !== "pickup";
  const pickup = current.get !== "delivery";
  const applyPrice = () => go({ min: digits(min) || undefined, max: digits(max) || undefined });
  const setGet = (d: boolean, p: boolean) => go({ get: d && !p ? "delivery" : p && !d ? "pickup" : undefined });

  return (
    <aside className="card w-[280px] flex-none overflow-hidden m:hidden" aria-label="Filters" aria-busy={pending || undefined}>
      <div className="flex items-center justify-between px-[22px] py-5">
        <span className="h3 text-base">Filters</span>
        <button
          type="button"
          onClick={() => {
            setMin("");
            setMax("");
            go({ get: undefined, min: undefined, max: undefined, area: undefined });
          }}
          className="-mr-2 min-h-11 cursor-pointer rounded-lg border-0 bg-transparent px-2 text-[13px] font-semibold text-forest"
        >
          Clear all
        </button>
      </div>
      <Group title="Price (₦)">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyPrice();
          }}
        >
          <input
            className="h-[42px] w-full rounded-[10px] border-0 bg-surface px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]"
            inputMode="numeric"
            aria-label="Minimum price"
            placeholder="Min"
            value={min}
            onChange={(e) => setMin(grouped(e.target.value))}
            onBlur={applyPrice}
          />
          <span className="cap">to</span>
          <input
            className="h-[42px] w-full rounded-[10px] border-0 bg-surface px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]"
            inputMode="numeric"
            aria-label="Maximum price"
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(grouped(e.target.value))}
            onBlur={applyPrice}
          />
          <button type="submit" className="sr-only">
            Apply price
          </button>
        </form>
      </Group>
      {areas.length ? (
        <Group title="Farm area">
          <fieldset className="m-0 border-0 p-0">
            <legend className="sr-only">Farm area</legend>
            <Opt type="radio" name="area" checked={!current.area} onChange={() => go({ area: undefined })}>
              Any area
            </Opt>
            {areas.map((a) => {
              const v = `${a.lga}|${a.state}`;
              return (
                <Opt key={v} type="radio" name="area" checked={current.area === v} onChange={() => go({ area: v })}>
                  {a.lga}, {a.state}
                </Opt>
              );
            })}
          </fieldset>
        </Group>
      ) : null}
      <Group title="Get it by">
        <Opt type="checkbox" checked={delivery} onChange={() => setGet(!delivery, pickup)}>
          Delivery
        </Opt>
        <Opt type="checkbox" checked={pickup} onChange={() => setGet(delivery, !pickup)}>
          Pickup point
        </Opt>
      </Group>
    </aside>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-[22px] py-5 shadow-[inset_0_1px_0_var(--color-line-soft)]">
      <p className="m-0 mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Opt({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 py-[5px] text-sm text-ink-2">
      <input type={type} name={name} checked={checked} onChange={onChange} className="m-0 size-[18px] accent-forest" />
      {children}
    </label>
  );
}

/** Active filter chips with remove buttons, then the result count (W-03). */
export function ActiveChips({ current, total }: { current: FilterValues & { q?: string }; total: number }) {
  const { go } = useNavigate(current);
  const chips: Array<{ label: string; clear: () => void }> = [];
  if (current.min || current.max) {
    const lo = current.min ? naira(Number(digits(current.min)) * 100) : "₦0";
    const hi = current.max ? naira(Number(digits(current.max)) * 100) : "any price";
    chips.push({ label: `${lo} – ${hi}`, clear: () => go({ min: undefined, max: undefined }) });
  }
  if (current.area) chips.push({ label: areaLabel(current.area), clear: () => go({ area: undefined }) });
  if (current.get === "delivery") chips.push({ label: "Delivery", clear: () => go({ get: undefined }) });
  if (current.get === "pickup") chips.push({ label: "Pickup point", clear: () => go({ get: undefined }) });
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <m.button key={c.label} type="button" className="chip on" onClick={c.clear} aria-label={`Remove filter: ${c.label}`} {...pressable}>
          {c.label}
          <X aria-hidden className="size-3.5" strokeWidth={2} />
        </m.button>
      ))}
      <span className="sm ml-1" role="status">
        {total} {total === 1 ? "result" : "results"}
      </span>
    </div>
  );
}

/**
 * W-05 filter panel (a bottom sheet on phones, a side panel on computers).
 * `trigger` picks the opener style: the W-03 "Filters" button (phones only)
 * or the W-04 chip row ("All filters", "Price", "Delivery or pickup").
 */
export function FilterPanel({
  current,
  areas,
  scope,
  trigger,
}: {
  current: FilterValues & { q?: string; tab?: string };
  areas: FarmArea[];
  scope: Scope;
  trigger: "button" | "chips";
}) {
  const { go } = useNavigate(current);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(grouped(current.min));
  const [max, setMax] = useState(grouped(current.max));
  const [area, setArea] = useState(current.area);
  const [delivery, setDelivery] = useState(current.get !== "pickup");
  const [pickup, setPickup] = useState(current.get !== "delivery");

  const openPanel = () => {
    setMin(grouped(current.min));
    setMax(grouped(current.max));
    setArea(current.area);
    setDelivery(current.get !== "pickup");
    setPickup(current.get !== "delivery");
    setOpen(true);
  };

  const get = delivery && !pickup ? "delivery" : pickup && !delivery ? "pickup" : undefined;
  const [lga, state] = (area ?? "").split("|");
  const args = {
    limit: 1,
    ...(get === "delivery" ? { delivery: true } : get === "pickup" ? { pickup: true } : {}),
    ...(digits(min) ? { minPriceKobo: Number(digits(min)) * 100 } : {}),
    ...(digits(max) ? { maxPriceKobo: Number(digits(max)) * 100 } : {}),
    ...(lga ? { farmLga: lga, farmState: state } : {}),
  };
  const catCount = useQuery(
    api.storefront.categoryListings,
    open && scope.kind === "category" ? { slug: scope.slug, ...args } : "skip",
  ) as CategoryListings | null | undefined;
  const searchCount = useQuery(
    api.storefront.search,
    open && scope.kind === "search" ? { text: scope.text, ...args } : "skip",
  ) as SearchResults | undefined;
  const count = scope.kind === "category" ? catCount?.total : searchCount?.total;

  const apply = () => {
    setOpen(false);
    go({ get, min: digits(min) || undefined, max: digits(max) || undefined, area: area || undefined });
  };

  const fin =
    "h-[46px] w-full rounded-xl border-0 bg-surface px-3 text-[15px] text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]";

  return (
    <>
      {trigger === "button" ? (
        <m.button type="button" className="btn sm ghost d:hidden" onClick={openPanel} aria-haspopup="dialog" {...pressable}>
          <SlidersHorizontal aria-hidden className="size-4" />
          Filters
        </m.button>
      ) : (
        <>
          <m.button type="button" className="chip" onClick={openPanel} aria-haspopup="dialog" {...pressable}>
            <SlidersHorizontal aria-hidden className="size-4" />
            All filters
          </m.button>
          <m.button
            type="button"
            className={`chip ${current.min || current.max ? "on" : ""}`}
            onClick={openPanel}
            aria-haspopup="dialog"
            {...pressable}
          >
            Price
            <ChevronDown aria-hidden className="size-4" />
          </m.button>
          <m.button type="button" className={`chip ${current.get ? "on" : ""}`} onClick={openPanel} aria-haspopup="dialog" {...pressable}>
            {current.get === "delivery" ? "Delivery" : current.get === "pickup" ? "Pickup point" : "Delivery or pickup"}
            <ChevronDown aria-hidden className="size-4" />
          </m.button>
        </>
      )}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <m.button type="button" className="btn lime lg w-full" onClick={apply} {...pressable}>
            {count === undefined ? "Show results" : `Show ${count} ${count === 1 ? "result" : "results"}`}
          </m.button>
        }
      >
        <div className="-mx-6 m:-mx-4">
          <div className="flex justify-end px-4">
            <button
              type="button"
              className="min-h-11 cursor-pointer rounded-lg border-0 bg-transparent px-2 text-sm font-semibold text-forest"
              onClick={() => {
                setMin("");
                setMax("");
                setArea(undefined);
                setDelivery(true);
                setPickup(true);
              }}
            >
              Reset
            </button>
          </div>
          <PanelGroup title="Price (₦)">
            <div className="flex items-center gap-2.5">
              <input className={fin} inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={min} onChange={(e) => setMin(grouped(e.target.value))} />
              <span className="text-[13px] text-subtle">to</span>
              <input className={fin} inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={max} onChange={(e) => setMax(grouped(e.target.value))} />
            </div>
          </PanelGroup>
          {areas.length ? (
            <PanelGroup title="Farm area">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Farm area">
                <PanelChip on={!area} onClick={() => setArea(undefined)}>
                  Any
                </PanelChip>
                {areas.map((a) => {
                  const v = `${a.lga}|${a.state}`;
                  return (
                    <PanelChip key={v} on={area === v} onClick={() => setArea(v)}>
                      {a.lga}
                    </PanelChip>
                  );
                })}
              </div>
            </PanelGroup>
          ) : null}
          <PanelGroup title="Get it by">
            <div className="flex gap-2">
              <PanelChip on={delivery} onClick={() => (delivery && !pickup ? null : setDelivery(!delivery))}>
                Delivery
              </PanelChip>
              <PanelChip on={pickup} onClick={() => (pickup && !delivery ? null : setPickup(!pickup))}>
                Pickup point
              </PanelChip>
            </div>
          </PanelGroup>
        </div>
      </Drawer>
    </>
  );
}

function PanelGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-4 py-5 [&+&]:shadow-[inset_0_1px_0_var(--color-line-soft)]">
      <p className="m-0 mb-3 font-display text-[15px] font-bold">{title}</p>
      {children}
    </div>
  );
}

function PanelChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`chip h-10 text-sm ${on ? "on" : ""}`}>
      {children}
    </button>
  );
}
