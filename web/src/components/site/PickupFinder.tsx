"use client";

// W-82 list + map. The list is complete on its own (server-rendered names,
// addresses, hours, directions and call links); the map is an extra view.
import { Clock, Info, MapPin, Navigation, Phone, Search, Store } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PickupPoint } from "@/convex/returns/site";
import { displayPhone } from "@/lib/format";
import { routes } from "@/lib/routes";
import { directionsUrl, hoursLabel, openState } from "./pickup";
import { Tile, btnSm, cap, chip } from "./ui";

const PickupMap = dynamic(() => import("./PickupMap"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" rounded={22} />,
});

// Current minute, read only in the browser (the server render shows no open/closed badge).
const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

export function PickupFinder({ points }: { points: PickupPoint[] }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(points[0]?._id);
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of points) counts.set(p.lga, (counts.get(p.lga) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [points]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return points.filter(
      (p) =>
        (!area || p.lga === area) &&
        (!q || [p.name, p.address, p.lga, p.state].some((s) => s.toLowerCase().includes(q))),
    );
  }, [points, query, area]);

  const statusFor = (p: PickupPoint) => {
    if (minute == null) return null;
    const s = openState(p.hours, minute);
    return s.open ? `Open until ${s.closes} today` : "Closed now";
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <PickupIntro />
        <label className="flex h-[50px] w-[380px] items-center gap-2.5 rounded-[14px] bg-surface px-4 text-faint shadow-[inset_0_0_0_1px_var(--color-line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--color-forest)] m:w-full">
          <Search aria-hidden size={18} strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by area or street"
            aria-label="Search pickup points"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          />
        </label>
      </div>

      <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Filter by area">
        <button type="button" aria-pressed={area === null} onClick={() => setArea(null)} className={areaChip(area === null)}>
          All areas · {points.length}
        </button>
        {areas.map(([name, count]) => (
          <button
            key={name}
            type="button"
            aria-pressed={area === name}
            onClick={() => setArea(area === name ? null : name)}
            className={areaChip(area === name)}
          >
            {name} · {count}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[420px_minmax(0,1fr)] items-start gap-6 max-[1000px]:grid-cols-1">
        <div>
          <p className="sr-only" aria-live="polite">
            {shown.length === 1 ? "1 pickup point" : `${shown.length} pickup points`} shown
          </p>
          {shown.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {shown.map((p) => (
                <PointCard
                  key={p._id}
                  point={p}
                  selected={p._id === selectedId}
                  onSelect={() => setSelectedId(p._id)}
                  open={minute == null ? null : openState(p.hours, minute).open}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-[20px] bg-surface p-6 shadow-[inset_0_0_0_1px_var(--color-line)]">
              <div className="text-[15px] font-semibold">No pickup points match your search</div>
              <p className="m-0 text-sm leading-6 text-muted">Try another area or street name, or show all areas.</p>
              <button
                type="button"
                className={`${btnSm} ghost`}
                onClick={() => {
                  setQuery("");
                  setArea(null);
                }}
              >
                Show all pickup points
              </button>
            </div>
          )}
        </div>

        <div className="sticky top-5 flex flex-col gap-4 max-[1000px]:static">
          <div
            role="region"
            aria-label="Map of Farmkeke pickup points"
            className="relative h-[620px] overflow-hidden rounded-[22px] bg-[#E8EDE1] shadow-[inset_0_0_0_1px_#DCE2D3] m:h-[360px]"
          >
            <p className="sr-only">
              The map shows the same pickup points as the list on this page. Select a marker to highlight that point in the
              list.
            </p>
            <PickupMap points={shown} selectedId={selectedId} onSelect={setSelectedId} statusFor={statusFor} />
          </div>
          <div className="flex items-center gap-3.5 rounded-[20px] bg-surface px-[22px] py-5 shadow-[inset_0_0_0_1px_var(--color-line)] m:flex-wrap">
            <Tile icon={Info} size={40} />
            <p className="m-0 flex-1 text-sm leading-6 text-muted">
              Bring your pickup code and the phone number on the order. Check your items before you leave.
            </p>
            <Link href={routes.shop} className={`${btnSm} lime`}>
              <Store aria-hidden size={16} strokeWidth={2} />
              Shop now
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const areaChip = (on: boolean) =>
  `${chip} cursor-pointer ${on ? "!bg-forest !text-white !shadow-none" : "hover:bg-soft"}`;

export function PickupIntro() {
  return (
    <div className="max-w-[620px]">
      <span className="inline-flex h-8 items-center gap-2 rounded-full bg-surface pr-3.5 pl-1.5 text-[13px] font-medium text-ink shadow-[inset_0_0_0_1px_var(--color-field)]">
        <span className="flex size-5 items-center justify-center rounded-full bg-tint text-forest">
          <MapPin aria-hidden size={12} strokeWidth={2.25} />
        </span>
        Pickup locations
      </span>
      <h1 className="mt-3.5 font-display text-[44px] leading-[52px] font-extrabold tracking-[-0.03em]">
        Collect your order near you
      </h1>
      <p className="m-0 mt-2.5 text-lg leading-[29px] text-muted m:text-base m:leading-[26px]">
        Pickup is free. Your order waits for 3 days, and you collect it with your 4-digit pickup code.
      </p>
    </div>
  );
}

function PointCard({
  point: p,
  selected,
  onSelect,
  open,
}: {
  point: PickupPoint;
  selected: boolean;
  onSelect: () => void;
  open: boolean | null;
}) {
  return (
    <li
      className={`rounded-[20px] bg-surface p-5 ${
        selected ? "shadow-[inset_0_0_0_2px_var(--color-forest)]" : "shadow-[inset_0_0_0_1px_var(--color-line)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <h2 className="m-0">
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              className="cursor-pointer bg-transparent p-0 text-left text-[15px] font-bold text-ink hover:text-forest"
            >
              {p.name}
            </button>
          </h2>
          <div className={`${cap} mt-[3px]`}>{p.lga}</div>
        </div>
        {open === true ? <span className="badge b-ok">Open now</span> : null}
        {open === false ? <span className="badge b-grey">Closed now</span> : null}
      </div>
      <div className="mt-3 flex flex-col gap-2 text-[13px] text-ink-3">
        <div className="flex items-center gap-2">
          <MapPin aria-hidden size={15} strokeWidth={2} className="flex-none text-forest" />
          {p.address}
        </div>
        <div className="flex items-center gap-2">
          <Clock aria-hidden size={15} strokeWidth={2} className="flex-none text-forest" />
          {hoursLabel(p.hours)}
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <a href={directionsUrl(p)} target="_blank" rel="noopener noreferrer" className="btn sm ghost px-4 text-[13px]">
          <Navigation aria-hidden size={15} strokeWidth={2} />
          Directions<span className="sr-only"> to {p.name} (opens in a new tab)</span>
        </a>
        {p.phone ? (
          <a href={`tel:${p.phone}`} className="btn sm ghost px-4 text-[13px]">
            <Phone aria-hidden size={15} strokeWidth={2} />
            Call<span className="sr-only"> {p.name} on {displayPhone(p.phone)}</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}
