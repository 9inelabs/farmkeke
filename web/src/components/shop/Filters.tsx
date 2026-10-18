"use client";

// Sort and filters for W-03 Category and W-04 Search, plus the W-05 filter
// panel. Every choice lives in the URL (?sort, type, min, max, fresh, dist,
// get, rated, cat, show) so results are server-rendered; changing one
// navigates. Distance filters and the Nearest sort need the shopper's area,
// so choosing one without an area opens the area picker.
import { useQuery } from "convex/react";
import { ChevronDown, MapPin, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Drawer } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import { api } from "@/convex/api";
import type { CategoryListings, SearchResults, Subtype } from "@/convex/returns/storefront";
import { areaPicker } from "@/lib/area";
import { naira, todayInLagos } from "@/lib/format";
import { m, pressable } from "@/lib/motion";
import { categoryArgs, needsLocation, parseFilters, searchArgs } from "./filters-shared";
import { useShopper } from "./live";

export type FilterValues = {
  sort?: string;
  get?: string;
  min?: string;
  max?: string;
  area?: string;
  type?: string;
  fresh?: string;
  dist?: string;
  rated?: string;
  cat?: string;
};

type Current = FilterValues & { q?: string; tab?: string };
type Scope = { kind: "category"; slug: string } | { kind: "search"; text: string };

const KEYS = ["q", "sort", "type", "get", "min", "max", "fresh", "dist", "rated", "area", "cat", "show", "tab"] as const;
type Key = (typeof KEYS)[number];

const HARVESTED_OPTS = [
  { value: "today", label: "Today", chip: "Harvested today", seg: "Today" },
  { value: "3", label: "In the last 3 days", chip: "Last 3 days", seg: "Last 3 days" },
  { value: "7", label: "This week", chip: "This week", seg: "This week" },
];
const DISTANCE_OPTS = [
  { value: "5", label: "Within 5 km", seg: "5 km" },
  { value: "15", label: "Within 15 km", seg: "15 km" },
  { value: "", label: "Any distance", seg: "Any" },
];

function useNavigate(current: Current) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (changes: Partial<Record<Key, string | undefined>>) => {
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

/** Opens the area picker when a choice needs the shopper's position and none is known yet. */
function useNeedsArea() {
  const { point } = useShopper();
  return (v: { sort?: string; dist?: string }) => {
    if (!point && (v.sort === "nearest" || v.dist)) areaPicker.open();
  };
}

const digits = (v: string) => v.replace(/[^\d]/g, "");
const grouped = (v?: string) => (v ? Number(digits(v)).toLocaleString("en-NG") : "");

export function SortSelect({
  value,
  options,
  current,
  label = "Sort by",
  className,
  compact = false,
}: {
  value?: string;
  options: Array<{ value: string; label: string }>;
  current: Current;
  label?: string;
  className?: string;
  /** W-04's 36px select */
  compact?: boolean;
}) {
  const { go } = useNavigate(current);
  const askArea = useNeedsArea();
  return (
    <label className={`flex items-center gap-2 text-sm text-muted ${className ?? ""}`}>
      {label}
      <select
        className={`${compact ? "h-11 d:h-9" : "h-11 d:h-10"} rounded-[10px] border-0 bg-surface px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]`}
        value={value ?? ""}
        onChange={(e) => {
          const sort = e.target.value || undefined;
          askArea({ sort });
          go({ sort });
        }}
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

const TYPES_SHOWN = 5;

/** W-03 desktop sidebar (hidden on phones; the Filters button opens W-05). */
export function FilterSidebar({ current, subtypes = [] }: { current: Current; subtypes?: Subtype[] }) {
  const { go, pending } = useNavigate(current);
  const askArea = useNeedsArea();
  const { point, hydrated } = useShopper();
  const [min, setMin] = useState(grouped(current.min));
  const [max, setMax] = useState(grouped(current.max));
  const [allTypes, setAllTypes] = useState(false);
  const delivery = current.get !== "pickup";
  const pickup = current.get !== "delivery";
  const applyPrice = () => go({ min: digits(min) || undefined, max: digits(max) || undefined });
  const setGet = (d: boolean, p: boolean) => go({ get: d && !p ? "delivery" : p && !d ? "pickup" : undefined });
  const types = allTypes ? subtypes : subtypes.slice(0, TYPES_SHOWN);

  return (
    <aside className="card w-[280px] flex-none overflow-hidden m:hidden" aria-label="Filters" aria-busy={pending || undefined}>
      <div className="flex items-center justify-between px-[22px] py-5">
        <span className="h3 text-base">Filters</span>
        <button
          type="button"
          onClick={() => {
            setMin("");
            setMax("");
            go({
              type: undefined,
              get: undefined,
              min: undefined,
              max: undefined,
              fresh: undefined,
              dist: undefined,
              rated: undefined,
              area: undefined,
            });
          }}
          className="-mr-2 min-h-11 cursor-pointer rounded-lg border-0 bg-transparent px-2 text-[13px] font-semibold text-forest"
        >
          Clear all
        </button>
      </div>
      {subtypes.length ? (
        <Group title="Type">
          {types.map((t) => (
            <Opt
              key={t.slug}
              type="checkbox"
              checked={current.type === t.slug}
              onChange={() => go({ type: current.type === t.slug ? undefined : t.slug })}
              count={t.count}
            >
              {t.name}
            </Opt>
          ))}
          {subtypes.length > TYPES_SHOWN ? (
            <button
              type="button"
              onClick={() => setAllTypes(!allTypes)}
              aria-expanded={allTypes}
              className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent p-0 text-[13px] font-semibold text-forest"
            >
              {allTypes ? "Show fewer" : `Show all ${subtypes.length}`}
            </button>
          ) : null}
        </Group>
      ) : null}
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
      <Group title="Harvested">
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Harvested</legend>
          {HARVESTED_OPTS.map((o) => (
            <Opt key={o.value} type="radio" name="fresh" checked={current.fresh === o.value} onChange={() => go({ fresh: o.value })}>
              {o.label}
            </Opt>
          ))}
        </fieldset>
      </Group>
      <Group title="Distance to farm">
        <fieldset className="m-0 border-0 p-0">
          <legend className="sr-only">Distance to farm</legend>
          {DISTANCE_OPTS.map((o) => (
            <Opt
              key={o.label}
              type="radio"
              name="dist"
              checked={(current.dist ?? "") === o.value}
              onChange={() => {
                askArea({ dist: o.value || undefined });
                go({ dist: o.value || undefined });
              }}
            >
              {o.label}
            </Opt>
          ))}
        </fieldset>
        {hydrated && !point ? <ChooseAreaHint /> : null}
      </Group>
      <Group title="Get it by">
        <Opt type="checkbox" checked={delivery} onChange={() => setGet(!delivery, pickup)}>
          Delivery
        </Opt>
        <Opt type="checkbox" checked={pickup} onChange={() => setGet(delivery, !pickup)}>
          Pickup point
        </Opt>
      </Group>
      <div className="px-[22px] py-5 shadow-[inset_0_1px_0_var(--color-line-soft)]">
        <Opt type="checkbox" checked={current.rated === "1"} onChange={() => go({ rated: current.rated === "1" ? undefined : "1" })}>
          Top-rated farms only (4.5+)
        </Opt>
      </div>
    </aside>
  );
}

/** Shown under the distance choices until the shopper has chosen an area. */
function ChooseAreaHint() {
  return (
    <div className="mt-2 rounded-xl bg-soft px-3.5 py-3">
      <p className="cap m-0">Distances are measured from your delivery area.</p>
      <button
        type="button"
        onClick={areaPicker.open}
        aria-haspopup="dialog"
        className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-semibold text-forest"
      >
        <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
        Choose your area
      </button>
    </div>
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
  count,
  children,
}: {
  type: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 py-[5px] text-sm text-ink-2">
      <input type={type} name={name} checked={checked} onChange={onChange} className="m-0 size-[18px] flex-none accent-forest" />
      {children}
      {count !== undefined ? <span className="ml-auto text-xs text-[#9A9E95]">{count}</span> : null}
    </label>
  );
}

/** Active filter chips with remove buttons, then the result count (W-03). */
export function ActiveChips({ current, total, subtypes = [] }: { current: Current; total?: number; subtypes?: Subtype[] }) {
  const { go } = useNavigate(current);
  const chips: Array<{ label: string; clear: () => void }> = [];
  if (current.type) {
    const t = subtypes.find((s) => s.slug === current.type);
    chips.push({ label: t?.name ?? current.type, clear: () => go({ type: undefined }) });
  }
  if (current.min || current.max) {
    const lo = current.min ? naira(Number(digits(current.min)) * 100) : "₦0";
    const hi = current.max ? naira(Number(digits(current.max)) * 100) : "any price";
    chips.push({ label: `${lo} – ${hi}`, clear: () => go({ min: undefined, max: undefined }) });
  }
  const fresh = HARVESTED_OPTS.find((o) => o.value === current.fresh);
  if (fresh) chips.push({ label: fresh.chip, clear: () => go({ fresh: undefined }) });
  const dist = DISTANCE_OPTS.find((o) => o.value && o.value === current.dist);
  if (dist) chips.push({ label: dist.label, clear: () => go({ dist: undefined }) });
  if (current.area) chips.push({ label: current.area.split("|")[0] ?? current.area, clear: () => go({ area: undefined }) });
  if (current.get === "delivery") chips.push({ label: "Delivery", clear: () => go({ get: undefined }) });
  if (current.get === "pickup") chips.push({ label: "Pickup point", clear: () => go({ get: undefined }) });
  if (current.rated === "1") chips.push({ label: "Top-rated farms", clear: () => go({ rated: undefined }) });
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <m.button key={c.label} type="button" className="chip on" onClick={c.clear} aria-label={`Remove filter: ${c.label}`} {...pressable}>
          {c.label}
          <X aria-hidden className="size-3.5" strokeWidth={2} />
        </m.button>
      ))}
      {total !== undefined ? (
        <span className="sm ml-1" role="status">
          {total} {total === 1 ? "result" : "results"}
        </span>
      ) : null}
    </div>
  );
}

/**
 * W-05 filter panel (a bottom sheet on phones, a side panel on computers).
 * `trigger` picks the opener style: the W-03 "Filters" button (phones only)
 * or the W-04 chip row ("All filters", category, "Harvested today",
 * "Within 15 km", "Price", "Delivery or pickup").
 */
export function FilterPanel({
  current,
  scope,
  trigger,
  subtypes = [],
  categories = [],
}: {
  current: Current;
  scope: Scope;
  trigger: "button" | "chips";
  /** W-03 "Type" choices */
  subtypes?: Subtype[];
  /** W-04 category chips (categories among the results) */
  categories?: Array<{ slug: string; name: string }>;
}) {
  const { go } = useNavigate(current);
  const askArea = useNeedsArea();
  const { point, hydrated } = useShopper();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(current.type);
  const [min, setMin] = useState(grouped(current.min));
  const [max, setMax] = useState(grouped(current.max));
  const [fresh, setFresh] = useState(current.fresh);
  const [dist, setDist] = useState(current.dist);
  const [rated, setRated] = useState(current.rated === "1");
  const [delivery, setDelivery] = useState(current.get !== "pickup");
  const [pickup, setPickup] = useState(current.get !== "delivery");

  const openPanel = () => {
    setType(current.type);
    setMin(grouped(current.min));
    setMax(grouped(current.max));
    setFresh(current.fresh);
    setDist(current.dist);
    setRated(current.rated === "1");
    setDelivery(current.get !== "pickup");
    setPickup(current.get !== "delivery");
    setOpen(true);
  };

  const get = delivery && !pickup ? "delivery" : pickup && !delivery ? "pickup" : undefined;
  const draft: FilterValues = {
    ...current,
    type,
    get,
    min: digits(min) || undefined,
    max: digits(max) || undefined,
    fresh,
    dist,
    rated: rated ? "1" : undefined,
  };
  const f = { ...parseFilters(draft, 1), limit: 1 };
  const canCount = open && (!needsLocation(f) || point !== undefined);
  const today = todayInLagos();
  const catCount = useQuery(
    api.storefront.categoryListings,
    canCount && scope.kind === "category" ? { ...categoryArgs(scope.slug, f, today), ...point } : "skip",
  ) as CategoryListings | null | undefined;
  const searchCount = useQuery(
    api.storefront.search,
    canCount && scope.kind === "search" ? { ...searchArgs(scope.text, f, today), ...point } : "skip",
  ) as SearchResults | undefined;
  const count = scope.kind === "category" ? catCount?.total : searchCount?.total;

  const apply = () => {
    setOpen(false);
    askArea({ dist });
    go({ type, get, min: draft.min, max: draft.max, fresh, dist, rated: draft.rated });
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
          {categories.map((c) => {
            const on = current.cat === c.slug;
            return (
              <m.button
                key={c.slug}
                type="button"
                className={`chip ${on ? "on" : ""}`}
                aria-pressed={on}
                onClick={() => go({ cat: on ? undefined : c.slug })}
                {...pressable}
              >
                {c.name}
              </m.button>
            );
          })}
          <m.button
            type="button"
            className={`chip ${current.fresh === "today" ? "on" : ""}`}
            aria-pressed={current.fresh === "today"}
            onClick={() => go({ fresh: current.fresh === "today" ? undefined : "today" })}
            {...pressable}
          >
            Harvested today
          </m.button>
          <m.button
            type="button"
            className={`chip ${current.dist === "15" ? "on" : ""}`}
            aria-pressed={current.dist === "15"}
            onClick={() => {
              const next = current.dist === "15" ? undefined : "15";
              askArea({ dist: next });
              go({ dist: next });
            }}
            {...pressable}
          >
            Within 15 km
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
                setType(undefined);
                setMin("");
                setMax("");
                setFresh(undefined);
                setDist(undefined);
                setRated(false);
                setDelivery(true);
                setPickup(true);
              }}
            >
              Reset
            </button>
          </div>
          {scope.kind === "category" && subtypes.length ? (
            <PanelGroup title="Type">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
                {subtypes.map((t) => (
                  <PanelChip key={t.slug} on={type === t.slug} onClick={() => setType(type === t.slug ? undefined : t.slug)}>
                    {t.name}
                  </PanelChip>
                ))}
              </div>
            </PanelGroup>
          ) : null}
          <PanelGroup title="Price (₦)">
            <div className="flex items-center gap-2.5">
              <input className={fin} inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={min} onChange={(e) => setMin(grouped(e.target.value))} />
              <span className="text-[13px] text-subtle">to</span>
              <input className={fin} inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={max} onChange={(e) => setMax(grouped(e.target.value))} />
            </div>
          </PanelGroup>
          <PanelGroup title="Harvested">
            <Segmented
              label="Harvested"
              value={fresh ?? ""}
              onChange={(v) => setFresh(fresh === v ? undefined : v || undefined)}
              options={HARVESTED_OPTS.map((o) => ({ value: o.value, label: o.seg }))}
            />
          </PanelGroup>
          <PanelGroup title="Distance to farm">
            <Segmented
              label="Distance to farm"
              value={dist ?? ""}
              onChange={(v) => setDist(v || undefined)}
              options={DISTANCE_OPTS.map((o) => ({ value: o.value, label: o.seg }))}
            />
            {hydrated && !point ? <ChooseAreaHint /> : null}
          </PanelGroup>
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
          <div className="flex items-center justify-between gap-3 px-4 py-5 shadow-[inset_0_1px_0_var(--color-line-soft)]">
            <div>
              <div className="text-[15px] font-semibold">Top-rated farms only</div>
              <div className="cap mt-0.5">Rated 4.5 and above</div>
            </div>
            <Switch checked={rated} onChange={setRated} label="Top-rated farms only" />
          </div>
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
    <button type="button" aria-pressed={on} onClick={onClick} className={`chip h-11 text-sm ${on ? "on" : ""}`}>
      {children}
    </button>
  );
}

/** W-05 segmented control (".seg"): three equal buttons on a sunk track. */
function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1 rounded-xl bg-[#EDEFE9] p-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`h-11 cursor-pointer rounded-[9px] border-0 text-[13px] font-semibold ${
              on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-transparent text-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
